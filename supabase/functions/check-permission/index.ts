import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan hierarchy — higher rank = more access.
const PLAN_RANK: Record<string, number> = {
  free: 0, launch: 1, business: 2, pro: 2, diamond: 2, studio: 3, teams: 4, enterprise: 5,
};

const FREE_LIMITS: Record<string, number> = {
  converter: 5,
  "image-scaler": 5,
  "image-suite": 0,
  "qr-gen": 5,
};

const DAILY_FREE_LIMITS: Record<string, number> = {
  intent: 20,
  scanner: 5,
  summary: 5,
  task: 8,
  vault: 20,
  writing: 5,
  decision: 3,
};

const DAILY_TOOLS = new Set(["intent", "scanner", "summary", "task", "vault", "writing", "decision", "my-day"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { tool, product } = await req.json().catch(() => ({ tool: "converter", product: undefined }));
    const toolName = (tool || "converter").toLowerCase().trim();

    const productKey = product || (DAILY_TOOLS.has(toolName) ? "daily" : "volynxlab");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      const limits = productKey === "daily" ? DAILY_FREE_LIMITS : FREE_LIMITS;
      return json({
        plan: "free",
        builder_plan: "free",
        daily_plan: "free",
        cvitae_plan: "free",
        product: productKey,
        allowed: true,
        limit: limits[toolName] ?? 5,
        used: 0,
        remaining: limits[toolName] ?? 5,
        useLocalStorage: true,
        pro_features: [],
      });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("plan, builder_plan, daily_plan, cvitae_plan, daily_plan_expires_at, icon_pack_grants, is_black_diamond, avatar_id, token_balance, org_id, is_admin")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return json({
        plan: "free", builder_plan: "free", daily_plan: "free", cvitae_plan: "free",
        product: productKey,
        allowed: true, limit: 5, used: 0, remaining: 5,
        useLocalStorage: true, pro_features: [],
      });
    }

    // ── Admin bypass — full access to everything ──
    if ((profile as { is_admin?: boolean }).is_admin) {
      const adminProFeatures = productKey === "daily"
        ? ["sync", "export", "cloud", "api", "priority", "shared_vaults", "team_notes", "analytics"]
        : productKey === "cvitae"
          ? ["cloud_sync", "templates", "export_included", "premium_templates", "ai_suggestions"]
          : ["batch", "zip", "commercial", "no-watermark", "api", "priority"];
      return json({
        plan: profile.plan || "pro",
        builder_plan: profile.builder_plan || "studio",
        daily_plan: profile.daily_plan || "diamond",
        cvitae_plan: profile.cvitae_plan || "business",
        daily_plan_expires_at: null,
        daily_plan_expired: false,
        icon_pack_grants: Array.isArray(profile.icon_pack_grants) ? profile.icon_pack_grants : [],
        is_black_diamond: true,
        is_admin: true,
        avatar_id: (profile.avatar_id as string | null) || null,
        effective_tier: "studio",
        product: productKey,
        allowed: true,
        limit: -1,
        used: 0,
        remaining: -1,
        useLocalStorage: false,
        token_balance: profile.token_balance || 1000000000,
        pro_features: adminProFeatures,
        admin_bypass: true,
      });
    }

    const globalPlan = (profile.plan || "free").toLowerCase();
    const builderPlan = (profile.builder_plan || "free").toLowerCase();
    let dailyPlan = (profile.daily_plan || "free").toLowerCase();
    const cvitaePlan = (profile.cvitae_plan || "free").toLowerCase();

    // ── LAZY EXPIRATION CHECK ──────────────────────────────────────────
    // If daily_plan is paid and the timestamp is in the past, degrade to 'free'
    // for THIS request. The DB row stays for audit/history; a future cron or
    // background job can flip it physically.
    let dailyPlanExpired = false;
    const expiresAt = profile.daily_plan_expires_at as string | null;
    if (dailyPlan !== "free" && expiresAt) {
      try {
        if (new Date(expiresAt).getTime() < Date.now()) {
          dailyPlanExpired = true;
          dailyPlan = "free";
        }
      } catch (_) { /* malformed timestamp — leave plan as-is */ }
    }

    let activePlan: string;
    if (productKey === "daily") activePlan = dailyPlan;
    else if (productKey === "cvitae") activePlan = cvitaePlan;
    else activePlan = globalPlan;

    const rank = PLAN_RANK[activePlan] ?? 0;
    const isPaid = rank >= 1;

    const allPlans = [globalPlan, builderPlan, dailyPlan, cvitaePlan];
    const effectiveTier = allPlans.reduce((best, p) =>
      (PLAN_RANK[p] ?? 0) > (PLAN_RANK[best] ?? 0) ? p : best, "free"
    );

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
        : productKey === "cvitae"
          ? ["cloud_sync", "templates", "export_included"]
          : ["batch", "zip", "commercial", "no-watermark"];

      return json({
        plan: globalPlan,
        builder_plan: builderPlan,
        daily_plan: dailyPlan,
        cvitae_plan: cvitaePlan,
        daily_plan_expires_at: expiresAt,
        daily_plan_expired: dailyPlanExpired,
        icon_pack_grants: Array.isArray(profile.icon_pack_grants) ? profile.icon_pack_grants : [],
        is_black_diamond: !!profile.is_black_diamond,
        avatar_id: (profile.avatar_id as string | null) || null,
        effective_tier: effectiveTier,
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

    const limits = productKey === "daily" ? DAILY_FREE_LIMITS : FREE_LIMITS;
    const limit = limits[toolName] ?? 5;

    if (limit === 0) {
      return json({
        plan: globalPlan,
        builder_plan: builderPlan,
        daily_plan: dailyPlan,
        cvitae_plan: cvitaePlan,
        daily_plan_expires_at: expiresAt,
        daily_plan_expired: dailyPlanExpired,
        icon_pack_grants: Array.isArray(profile.icon_pack_grants) ? profile.icon_pack_grants : [],
        is_black_diamond: !!profile.is_black_diamond,
        avatar_id: (profile.avatar_id as string | null) || null,
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
      cvitae_plan: cvitaePlan,
      daily_plan_expires_at: expiresAt,
      daily_plan_expired: dailyPlanExpired,
      icon_pack_grants: Array.isArray(profile.icon_pack_grants) ? profile.icon_pack_grants : [],
      is_black_diamond: !!profile.is_black_diamond,
      avatar_id: (profile.avatar_id as string | null) || null,
      effective_tier: effectiveTier,
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
      plan: "free", builder_plan: "free", daily_plan: "free", cvitae_plan: "free",
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
