/**
 * VOLYNX — refresh-kit-url (Supabase Edge Function)
 *
 * Re-issues a fresh signed URL for a buyer's kit ZIP from the private
 * `kits` Storage bucket. Mirrors refresh-pf-url so the contract is
 * identical across product families.
 *
 * Request:
 *   POST /functions/v1/refresh-kit-url
 *   Headers:  Authorization: Bearer <user JWT>
 *   Body:     { purchase_id?: uuid, addon_id?: string }
 *
 * Resolution priority:
 *   1. purchase_id  — exact addons_purchased row (preferred path; the
 *                     dashboard always has this)
 *   2. addon_id     — most-recent active row for (user, addon_id)
 *
 * Response:
 *   200: { download_url, download_expires_at, download_version,
 *          delivery_status: "ready", addon_id, kit_slug, zip_tier }
 *   401: missing/invalid JWT
 *   403: no active purchase found
 *   404: addon_id is not a recognised kit
 *   500: storage / DB error (returns delivery_status: "pending_signed_url"
 *        so the dashboard can show the right banner)
 *
 * Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const KIT_VERSION = "v1.0.0";
const TTL_SECONDS = 60 * 60 * 24; // 24h — must mirror webhook KIT_SIGNED_URL_TTL

// Stripe addon_id prefix → bucket folder slug. Must stay in sync with
// stripe-webhook's getKitStorageSlug().
const KIT_SLUG_BY_PREFIX: Record<string, string> = {
  kit_portfolio: "portfolio",
  kit_agency: "agency",
  kit_saas: "saas",
  kit_landing_express: "saas",
};

// Stripe tier suffix → bucket folder tier. Must stay in sync with
// stripe-webhook's getKitStorageTier().
const TIER_REMAP: Record<string, string> = {
  personal: "starter",
  commercial: "pro",
  studio: "studio",
};

function resolveKitPath(addonId: string): { kitSlug: string; tier: string; objectPath: string } | null {
  const id = String(addonId || "").toLowerCase();
  let kitSlug: string | null = null;
  for (const [prefix, slug] of Object.entries(KIT_SLUG_BY_PREFIX)) {
    if (id.startsWith(prefix)) {
      kitSlug = slug;
      break;
    }
  }
  if (!kitSlug) return null;

  const tierMatch = id.match(/_(personal|commercial|studio)$/);
  if (!tierMatch) return null;
  const stripeTier = tierMatch[1];
  const tier = TIER_REMAP[stripeTier];
  if (!tier) return null;

  return { kitSlug, tier, objectPath: `${kitSlug}_${tier}/${KIT_VERSION}.zip` };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // 1. Authenticate the caller via Bearer JWT.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Missing authorization token" }, 401);

  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData?.user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }
  const userId = userData.user.id;

  // 2. Parse body — accept purchase_id (preferred) OR addon_id (fallback).
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const purchaseId = body?.purchase_id ? String(body.purchase_id) : null;
  const fallbackAddonId = body?.addon_id ? String(body.addon_id).toLowerCase() : null;

  if (!purchaseId && !fallbackAddonId) {
    return jsonResponse({ error: "Missing purchase_id or addon_id" }, 400);
  }

  // 3. Resolve the addons_purchased row. purchase_id is precise; addon_id
  //    falls back to the most recent active purchase for the user.
  let row: { id: string; addon_id: string; metadata: Record<string, unknown> | null } | null = null;
  if (purchaseId) {
    const { data, error } = await supabase
      .from("addons_purchased")
      .select("id, addon_id, metadata")
      .eq("id", purchaseId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      console.error("DB error fetching addons_purchased by id:", error.message);
      return jsonResponse({ error: "Database error" }, 500);
    }
    row = data;
  }
  if (!row && fallbackAddonId) {
    const { data, error } = await supabase
      .from("addons_purchased")
      .select("id, addon_id, metadata")
      .eq("user_id", userId)
      .eq("addon_id", fallbackAddonId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("DB error fetching addons_purchased by addon_id:", error.message);
      return jsonResponse({ error: "Database error" }, 500);
    }
    row = data;
  }

  if (!row) {
    return jsonResponse({ error: "No active kit purchase found" }, 403);
  }

  // 4. Resolve the bucket path from the addon_id. Reject anything that's
  //    not a recognised kit (e.g. someone passes a pf_* addon_id by mistake).
  const resolved = resolveKitPath(row.addon_id);
  if (!resolved) {
    return jsonResponse({
      error: `Unknown kit addon_id: ${row.addon_id}`,
      hint: "This endpoint is for kit_* SKUs only. Use refresh-pf-url for PropertyFlow.",
    }, 404);
  }

  // 5. Mint a fresh signed URL.
  const { data: signed, error: storageErr } = await supabase.storage
    .from("kits")
    .createSignedUrl(resolved.objectPath, TTL_SECONDS);

  if (storageErr || !signed?.signedUrl) {
    console.error("createSignedUrl failed:", storageErr?.message, "for path:", resolved.objectPath);
    return jsonResponse({
      error: storageErr?.message || "Storage error",
      delivery_status: "pending_signed_url",
      hint: "ZIP may not be uploaded to the kits bucket yet — check Supabase Storage.",
      object_path: resolved.objectPath,
    }, 500);
  }

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  // 6. Persist the new URL back into addons_purchased.metadata so the next
  //    page load reads the fresh value without another refresh-kit-url hit.
  const newMeta = {
    ...(row.metadata || {}),
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
    download_version: KIT_VERSION,
    download_bucket: "kits",
    download_path: resolved.objectPath,
    download_filename: `${resolved.kitSlug}-${resolved.tier}-${KIT_VERSION}.zip`,
    delivery_status: "ready",
    delivery_error: null,
    delivery_refreshed_at: new Date().toISOString(),
    kit_slug: resolved.kitSlug,
    zip_tier: resolved.tier,
  };

  const { error: updateErr } = await supabase
    .from("addons_purchased")
    .update({ metadata: newMeta })
    .eq("id", row.id);

  if (updateErr) {
    // The signed URL is still valid even if persistence failed — log + return.
    console.error("Failed to persist refreshed download_url:", updateErr.message);
  }

  return jsonResponse({
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
    download_version: KIT_VERSION,
    delivery_status: "ready",
    addon_id: row.addon_id,
    kit_slug: resolved.kitSlug,
    zip_tier: resolved.tier,
  });
});
