import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan hierarchy — higher rank = more access
const PLAN_RANK: Record<string, number> = {
  free: 0, launch: 1, pro: 2, studio: 3, teams: 4, enterprise: 5, diamond: 2,
};

// Daily free limits per tool (volynxlab tools — free plan only)
const FREE_LIMITS: Record<string, number> = {
  converter: 5,
  "image-scaler": 5,
  "image-suite": 0, // Pro-only
  "qr-gen": 5,
};

// Daily OS free limits per tool
const DAILY_FREE_LIMITS: Record<string, number> = {
  scanner: 5,
  summary: 5,
  vault: 20,
  writing: 5,
  decision: 3,
};

// Daily OS tools list (for product detection)
const DAILY_TOOLS = new Set(["scanner", "summary", "vault", "writing", "decision", "my-day"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { tool, product } = await req.json().catch(() => ({ tool: "converter", product: undefined }));
    const toolName = (tool || "converter").toLowerCase().trim();

    // Auto-detect product from tool name if not specified
    const productKey = product || (DAILY_TOOLS.has(toolName) ? "daily" : "volynxlab");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      // Anonymous — return free tier with localStorage fallback
      const limits = productKey === "daily" ? DAILY_FREE_LIMITS : FREE_LIMITS;
      return json({
        plan: "free",
        builder_plan: "free",
        daily_plan: "free",
        product: productKey,
        allowed: true,
        limit: limits[toolName] ?? 5,
        used: 0,
        remaining: limits[toolName] ?? 5,
        useLocalStorage: true,
        pro_features: [],
      });
    }

    // Fetch user profile (includes daily_plan now)
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("plan, builder_plan, daily_plan, token_balance, org_id")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return json({
        plan: "free", builder_plan: "free", daily_plan: "free",
        product: productKey,
        allowed: true, limit: 5, used: 0, remaining: 5,
        useLocalStorage: true, pro_features: [],
      });
    }

    const globalPlan = (profile.plan || "free").toLowerCase();
    const builderPlan = (profile.builder_plan || "free").toLowerCase();
    const dailyPlan = (profile.daily_plan || "free").toLowerCase();

    // Determine the relevant plan based on product
    let activePlan: string;
    if (productKey === "daily") {
      activePlan = dailyPlan;
    } else {
      activePlan = globalPlan; // volynxlab uses profiles.plan
    }

    const rank = PLAN_RANK[activePlan] ?? 0;
    const isPaid = rank >= 1;

    // For paid users: unlimited daily usage
    if (isPaid) {
      const today = new Date().toISOString().slice(0, 10);
      const usageTable = productKey === "daily" ? "daily_usage_logs" : "usage_logs";

      const { data: usageRow } = await supabase
        .from(usageTable)
        .select("usage_count")
        .eq("user_id", user.id)
        .eq("tool_name", toolName)
        .eq("usage_date", today)
        .maybeSingle();

      const proFeatures = productKey === "daily"
        ? ["sync", "export", "cloud", ...(activePlan === "diamond" ? ["api", "priority", "shared_vaults", "team_notes", "analytics"] : [])]
        : ["batch", "zip", "commercial", "no-watermark"];

      return json({
        plan: globalPlan,
        builder_plan: builderPlan,
        daily_plan: dailyPlan,
        product: productKey,
        allowed: true,
        limit: -1,
        used: usageRow?.usage_count || 0,
        remaining: -1,
        useLocalStorage: false,
        token_balance: profile.token_balance || 0,
        pro_features: proFeatures,
      });
    }

    // Free user: check daily limit
    const limits = productKey === "daily" ? DAILY_FREE_LIMITS : FREE_LIMITS;
    const limit = limits[toolName] ?? 5;

    // Check if tool is pro-only
    if (limit === 0) {
      return json({
        plan: globalPlan,
        builder_plan: builderPlan,
        daily_plan: dailyPlan,
        product: productKey,
        allowed: false,
        limit: 0,
        used: 0,
        remaining: 0,
        useLocalStorage: false,
        pro_features: [],
        message: "This tool requires a paid plan.",
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const usageTable = productKey === "daily" ? "daily_usage_logs" : "usage_logs";

    const { data: usageRow } = await supabase
      .from(usageTable)
      .select("usage_count")
      .eq("user_id", user.id)
      .eq("tool_name", toolName)
      .eq("usage_date", today)
      .maybeSingle();

    const used = usageRow?.usage_count || 0;
    const remaining = Math.max(0, limit - used);

    return json({
      plan: globalPlan,
      builder_plan: builderPlan,
      daily_plan: dailyPlan,
      product: productKey,
      allowed: remaining > 0,
      limit,
      used,
      remaining,
      useLocalStorage: false,
      token_balance: profile.token_balance || 0,
      pro_features: [],
    });
  } catch (err) {
    console.error("[check-permission] Error:", err);
    return json({
      plan: "free", builder_plan: "free", daily_plan: "free",
      allowed: true, limit: 5, used: 0, remaining: 5,
      useLocalStorage: true, pro_features: [],
    }, 500);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
