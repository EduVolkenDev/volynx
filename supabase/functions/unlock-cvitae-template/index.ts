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

const TEMPLATE_BUNDLE_ADDON = "cvitae_templates_bundle";
const SINGLE_TEMPLATE_COST = 2;
const TEMPLATE_BUNDLE_COST = 5;

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizeTemplateId(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeScope(value: unknown): "single" | "bundle" {
  return String(value || "single").trim().toLowerCase() === "bundle" ? "bundle" : "single";
}

function addonIdForTemplate(templateId: string) {
  return `cvitae_template_${templateId}`;
}

function entitlementsFromAddons(rows: Array<{ addon_id: string }> = []) {
  const entitlements = new Set<string>();

  for (const row of rows) {
    const addonId = String(row?.addon_id || "");
    if (!addonId) continue;

    if (addonId === TEMPLATE_BUNDLE_ADDON) {
      entitlements.add("all");
      entitlements.add(TEMPLATE_BUNDLE_ADDON);
      continue;
    }

    if (addonId.startsWith("cvitae_template_")) {
      entitlements.add(addonId.replace("cvitae_template_", ""));
    }
  }

  return [...entitlements];
}

function mergeEntitlements(
  base: string[],
  scope: "single" | "bundle",
  templateId: string,
) {
  const entitlements = new Set(base);

  if (scope === "bundle") {
    entitlements.add("all");
    entitlements.add(TEMPLATE_BUNDLE_ADDON);
  } else if (templateId) {
    entitlements.add(templateId);
  }

  return [...entitlements];
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
    const scope = normalizeScope((body as Record<string, unknown>).scope);
    const templateId = normalizeTemplateId((body as Record<string, unknown>).template_id);

    if (scope === "single" && !PREMIUM_TEMPLATE_IDS.has(templateId)) {
      return json({ ok: false, error: "Invalid template_id" }, 400);
    }

    const addonId = scope === "bundle"
      ? TEMPLATE_BUNDLE_ADDON
      : addonIdForTemplate(templateId);
    const tokenCost = scope === "bundle" ? TEMPLATE_BUNDLE_COST : SINGLE_TEMPLATE_COST;

    const { data: unlockResult, error: unlockError } = await supabase.rpc(
      "unlock_cvitae_template_atomic",
      {
        p_user_id: userData.user.id,
        p_addon_id: addonId,
        p_template_id: scope === "bundle" ? null : templateId,
        p_tokens: tokenCost,
      },
    );

    if (unlockError) {
      console.error("[unlock-cvitae-template] rpc error:", unlockError.message);
      return json({ ok: false, error: "Server error" }, 500);
    }

    const { data: addonRows, error: addonError } = await supabase
      .from("addons_purchased")
      .select("addon_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active");

    const result = (unlockResult || {}) as Record<string, unknown>;
    let entitlements: string[];

    if (addonError) {
      console.warn("[unlock-cvitae-template] entitlements fetch warning:", addonError.message);
      entitlements = mergeEntitlements([], scope, templateId);
    } else {
      const cvitaeRows = (addonRows || []).filter((row) => {
        const addonId = String(row?.addon_id || "");
        return addonId === TEMPLATE_BUNDLE_ADDON || addonId.startsWith("cvitae_template_");
      });
      entitlements = entitlementsFromAddons(cvitaeRows);
      if (result.ok) {
        entitlements = mergeEntitlements(entitlements, scope, templateId);
      }
    }

    if (result.plan === "business") {
      entitlements = mergeEntitlements(entitlements, "bundle", templateId);
    }

    const status = result.ok
      ? 200
      : result.error === "insufficient_balance"
        ? 402
        : 400;

    return json(
      {
        ...result,
        addon_id: addonId,
        entitlements,
        template_id: scope === "bundle" ? null : templateId,
      },
      status,
    );
  } catch (err) {
    console.error("[unlock-cvitae-template] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
