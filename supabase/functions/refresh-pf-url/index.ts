/**
 * VOLYNX — refresh-pf-url
 *
 * Mints a fresh 24h signed URL for a PropertyFlow ZIP the calling user owns.
 * Used when the link stored in addons_purchased.metadata.download_url has
 * expired (or was never minted because the original webhook fetch failed).
 *
 * Auth: requires JWT — the function looks up the calling user, verifies they
 * have an active addons_purchased row for the requested purchase, and only
 * then signs a URL for the matching bucket path.
 *
 * Rate limit: 60s between refreshes per purchase row, to stop a leaked JWT
 * from being used to mass-harvest signed URLs.
 *
 * POST /functions/v1/refresh-pf-url
 *   headers: Authorization: Bearer <user JWT>
 *   body:    { purchase_id: <addons_purchased.id> }
 *   returns: { download_url, expires_at } | { error }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h
const REFRESH_COOLDOWN_MS = 60 * 1000; // 60s

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return jsonResponse({ error: "missing_token" }, 401);
  }

  // Resolve the calling user from their JWT — never trust a user_id from the body.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "invalid_token" }, 401);
  }
  const userId = userData.user.id;

  let body: { purchase_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }
  const purchaseId = body.purchase_id;
  if (!purchaseId) {
    return jsonResponse({ error: "missing_purchase_id" }, 400);
  }

  // Service-role client for the protected lookups + storage signing.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: purchase, error: purchaseErr } = await admin
    .from("addons_purchased")
    .select("id, user_id, addon_id, status, metadata")
    .eq("id", purchaseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (purchaseErr) {
    console.error("refresh-pf-url lookup error:", purchaseErr.message);
    return jsonResponse({ error: "lookup_failed" }, 500);
  }
  if (!purchase) {
    return jsonResponse({ error: "not_found" }, 404);
  }
  if (purchase.status !== "active") {
    return jsonResponse({ error: "not_active" }, 403);
  }
  if (!purchase.addon_id?.startsWith("pf_")) {
    return jsonResponse({ error: "not_propertyflow" }, 403);
  }

  // Cooldown — protects against signed-URL harvesting if the JWT leaks.
  const lastRefreshIso = (purchase.metadata as Record<string, unknown> | null)?.download_refreshed_at;
  if (typeof lastRefreshIso === "string") {
    const last = Date.parse(lastRefreshIso);
    if (Number.isFinite(last) && Date.now() - last < REFRESH_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((REFRESH_COOLDOWN_MS - (Date.now() - last)) / 1000);
      return jsonResponse({ error: "rate_limited", retry_after_seconds: waitSeconds }, 429);
    }
  }

  const version = ((purchase.metadata as Record<string, unknown> | null)?.download_version as string) || "v1.0.0";
  const objectPath = `${purchase.addon_id}/${version}.zip`;

  const { data: signed, error: signErr } = await admin
    .storage
    .from("propertyflow")
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signErr || !signed?.signedUrl) {
    console.error("refresh-pf-url signing error:", signErr?.message || "no url");
    return jsonResponse({ error: "sign_failed", detail: signErr?.message }, 500);
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  // Merge into existing metadata so we don't drop fields written by the webhook.
  const nextMetadata = {
    ...(typeof purchase.metadata === "object" && purchase.metadata ? purchase.metadata : {}),
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
    download_version: version,
    download_refreshed_at: new Date().toISOString(),
  };

  const { error: updateErr } = await admin
    .from("addons_purchased")
    .update({ metadata: nextMetadata })
    .eq("id", purchase.id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("refresh-pf-url metadata update error:", updateErr.message);
    // The signed URL is still valid, just return it — DB persistence is best-effort.
  }

  return jsonResponse({
    download_url: signed.signedUrl,
    expires_at: expiresAt,
    version,
  });
});
