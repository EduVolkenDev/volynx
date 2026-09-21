/**
 * VOLYNX — Regenerate Delivery URL (Supabase Edge Function)
 *
 * Re-issues a fresh signed URL for a buyer's PropertyFlow ZIP.
 * Used by /delivery/ when the original delivery_url has expired.
 *
 * Auth model: requires Bearer JWT. Looks up the latest active addons_purchased
 * row for (user_id, addon_id), then issues a new signed URL from the private
 * `kits` bucket and updates the row's metadata.
 *
 * Required secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy with verify_jwt: true (we extract the user from the JWT).
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getPropertyFlowArtifact,
  normalizePropertyFlowAddonId,
  PROPERTYFLOW_BUCKET,
  PROPERTYFLOW_SIGNED_URL_TTL_SECONDS,
} from "../_shared/propertyflow-delivery.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return jsonResponse({ error: "Missing authorization token" }, 401);
  }

  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData?.user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }
  const userId = userData.user.id;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const addonId = normalizePropertyFlowAddonId(body?.addon_id);
  if (!addonId) {
    return jsonResponse({ error: "Invalid PropertyFlow addon_id" }, 400);
  }
  const artifact = getPropertyFlowArtifact(addonId)!;

  // Verify ownership: latest active addons_purchased row for this user + addon.
  const { data: row, error: dbErr } = await supabase
    .from("addons_purchased")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("addon_id", addonId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbErr) {
    console.error("DB error fetching addons_purchased:", dbErr.message);
    return jsonResponse({ error: "Database error" }, 500);
  }
  if (!row) {
    return jsonResponse({ error: "No active purchase found for this product" }, 403);
  }

  // Issue a fresh signed URL.
  const { data: signed, error: storageErr } = await supabase.storage
    .from(PROPERTYFLOW_BUCKET)
    .createSignedUrl(artifact.objectPath, PROPERTYFLOW_SIGNED_URL_TTL_SECONDS);

  if (storageErr || !signed?.signedUrl) {
    console.error("createSignedUrl failed:", storageErr?.message);
    return jsonResponse({ error: storageErr?.message || "Storage error" }, 500);
  }

  const expiresAt = new Date(Date.now() + PROPERTYFLOW_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const newMeta = {
    ...(row.metadata as Record<string, unknown> || {}),
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
    download_bucket: PROPERTYFLOW_BUCKET,
    download_path: artifact.objectPath,
    download_filename: artifact.filename,
    download_version: artifact.objectPath.split("/").at(-1)?.replace(/\.zip$/, ""),
    download_bytes: artifact.bytes,
    download_sha256: artifact.sha256,
    templates: artifact.templates,
    delivery_url: signed.signedUrl,
    delivery_expires_at: expiresAt,
    delivery_path: artifact.objectPath,
    delivery_regenerated_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from("addons_purchased")
    .update({ metadata: newMeta })
    .eq("id", row.id);

  if (updateErr) {
    // The signed URL is still valid even if we couldn't persist it; log and return it.
    console.error("Failed to persist new delivery_url:", updateErr.message);
  }

  return jsonResponse({
    url: signed.signedUrl,
    expires_at: expiresAt,
    addon_id: addonId,
    filename: artifact.filename,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
  });
});
