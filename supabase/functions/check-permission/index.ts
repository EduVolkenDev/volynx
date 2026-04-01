import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan hierarchy — higher rank = more access
const PLAN_RANK: Record<string, number> = {
  free: 0, launch: 1, pro: 2, studio: 3, teams: 4, enterprise: 5,
};

// Daily free limits per tool (free plan only)
const FREE_LIMITS: Record<string, number> = {
  converter: 5,
  "image-scaler": 5,
  "image-suite": 0, // Pro-only
  "qr-gen": 5,
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { tool } = await req.json().catch(() => ({ tool: "converter" }));
    const toolName = (tool || "converter").toLowerCase().trim();

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      // Anonymous / unauthenticated — return free tier with localStorage fallback
      return json({
        plan: "free",
        builder_plan: "free",
        allowed: true,
        limit: FREE_LIMITS[toolName] ?? 5,
        used: 0,
        remaining: FREE_LIMITS[toolName] ?? 5,
        useLocalStorage: true,
        pro_features: [],
      });
    }

    // Fetch user profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("plan, builder_plan, token_balance, org_id")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return json({ plan: "free", builder_plan: "free", allowed: true, limit: 5, used: 0, remaining: 5, useLocalStorage: true, pro_features: [] });
    }

    const plan = (profile.plan || "free").toLowerCase();
    const builderPlan = (profile.builder_plan || "free").toLowerCase();
    const rank = PLAN_RANK[plan] ?? 0;
    const isPaid = rank >= 1;

    // For paid users: unlimited daily usage
    if (isPaid) {
      // Still fetch today's usage for display purposes
      const today = new Date().toISOString().slice(0, 10);
      const { data: usageRow } = await supabase
        .from("usage_logs")
        .select("usage_count")
        .eq("user_id", user.id)
        .eq("tool_name", toolName)
        .eq("usage_date", today)
        .maybeSingle();

      return json({
        plan,
        builder_plan: builderPlan,
        allowed: true,
        limit: -1, // unlimited
        used: usageRow?.usage_count || 0,
        remaining: -1,
        useLocalStorage: false,
        token_balance: profile.token_balance || 0,
        pro_features: ["batch", "zip", "commercial", "no-watermark"],
      });
    }

    // Free user: check daily limit
    const limit = FREE_LIMITS[toolName] ?? 5;

    // Check if tool is pro-only
    if (limit === 0) {
      return json({
        plan,
        builder_plan: builderPlan,
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
    const { data: usageRow } = await supabase
      .from("usage_logs")
      .select("usage_count")
      .eq("user_id", user.id)
      .eq("tool_name", toolName)
      .eq("usage_date", today)
      .maybeSingle();

    const used = usageRow?.usage_count || 0;
    const remaining = Math.max(0, limit - used);

    return json({
      plan,
      builder_plan: builderPlan,
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
    return json({ plan: "free", allowed: true, limit: 5, used: 0, remaining: 5, useLocalStorage: true, pro_features: [] }, 500);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
