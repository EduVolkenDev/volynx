import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PREMIUM_TEMPLATE_IDS = new Set([
  "executive",
  "nordic",
  "developer",
  "creative",
  "timeline",
]);

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizeTemplateId(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ ok: false, error: "Missing authorization token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ ok: false, error: "Invalid or expired token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const templateId = normalizeTemplateId((body as Record<string, unknown>).template_id);

    if (!PREMIUM_TEMPLATE_IDS.has(templateId)) {
      return json({ ok: false, error: "Invalid template_id" }, 400);
    }

    const { data: claimResult, error: claimError } = await supabase.rpc(
      "claim_world_starter_benefit_atomic",
      {
        p_user_id: userData.user.id,
        p_template_id: templateId,
      },
    );

    if (claimError) {
      console.error("[claim-world-starter-benefit] rpc error:", claimError.message);
      return json({ ok: false, error: "Server error" }, 500);
    }

    const result = (claimResult || {}) as Record<string, unknown>;
    const { data: addonRows, error: addonError } = await supabase
      .from("addons_purchased")
      .select("addon_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active");

    const entitlements = (addonRows || [])
      .map((row) => String(row?.addon_id || ""))
      .filter((addonId) => addonId === "cvitae_templates_bundle" || addonId.startsWith("cvitae_template_"))
      .map((addonId) => addonId === "cvitae_templates_bundle" ? "all" : addonId.replace("cvitae_template_", ""));

    if (addonError) {
      console.warn("[claim-world-starter-benefit] entitlements fetch warning:", addonError.message);
    }

    const status = result.ok
      ? 200
      : result.error === "world_profile_incomplete" || result.error === "world_service_missing"
        ? 409
        : 400;

    return json(
      {
        ...result,
        entitlements,
      },
      status,
    );
  } catch (err) {
    console.error("[claim-world-starter-benefit] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
