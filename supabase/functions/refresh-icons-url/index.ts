/**
 * VOLYNX — refresh-icons-url
 *
 * Mints a fresh signed URL for a paid Icon Vault single/pack the caller owns.
 * The function never trusts object paths from the request body; it reads the
 * active addons_purchased row for the authenticated user and signs only the
 * stored private delivery path.
 *
 * POST /functions/v1/refresh-icons-url
 *   headers: Authorization: Bearer <user JWT>
 *   body:    { purchase_id: <addons_purchased.id> }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h
const REFRESH_COOLDOWN_MS = 60 * 1000;
const ICONS_BUCKET = "icons";
const ICONS_VERSION = "v1.0.1";

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

function slugify(value: unknown, fallback = "icon"): string {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

function safeFileName(value: unknown, fallback = "icon.webp"): string {
  const file = String(value || fallback).split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || fallback;
  return file.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 120) || fallback;
}

function resolveIconDeliveryPath(addonId: string, metadata: Record<string, unknown>): string | null {
  const stored = String(metadata.download_path || "").trim();
  if (stored && !stored.includes("..") && stored.startsWith(`${ICONS_VERSION}/`)) return stored;

  const kind = String(metadata.kind || (addonId.includes("_pack_") ? "pack" : "single"));
  if (kind === "pack") {
    const collection = String(metadata.icon_collection || "").trim();
    if (!collection) return null;
    if (collection === "__all_premium__") return `${ICONS_VERSION}/packs/full-premium-combo.zip`;
    return `${ICONS_VERSION}/packs/${slugify(collection)}.zip`;
  }

  const iconId = String(metadata.icon_id || "").trim();
  const iconPath = String(metadata.icon_path || "").trim();
  if (!iconId || !iconPath || iconPath.includes("..")) return null;
  return `${ICONS_VERSION}/singles/${slugify(iconId)}/${safeFileName(iconPath)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return jsonResponse({ error: "missing_token" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResponse({ error: "invalid_token" }, 401);
  const userId = userData.user.id;

  let body: { purchase_id?: string; addon_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }

  const purchaseId = body.purchase_id ? String(body.purchase_id) : "";
  const fallbackAddonId = body.addon_id ? String(body.addon_id) : "";
  if (!purchaseId && !fallbackAddonId) {
    return jsonResponse({ error: "missing_purchase_id" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let purchase: {
    id: string;
    user_id: string;
    addon_id: string;
    status: string;
    metadata: Record<string, unknown> | null;
  } | null = null;

  if (purchaseId) {
    const { data, error } = await admin
      .from("addons_purchased")
      .select("id,user_id,addon_id,status,metadata")
      .eq("id", purchaseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("refresh-icons-url lookup error:", error.message);
      return jsonResponse({ error: "lookup_failed" }, 500);
    }
    purchase = data;
  }

  if (!purchase && fallbackAddonId) {
    const { data, error } = await admin
      .from("addons_purchased")
      .select("id,user_id,addon_id,status,metadata")
      .eq("addon_id", fallbackAddonId)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("refresh-icons-url fallback lookup error:", error.message);
      return jsonResponse({ error: "lookup_failed" }, 500);
    }
    purchase = data;
  }

  if (!purchase) return jsonResponse({ error: "not_found" }, 404);
  if (purchase.status !== "active") return jsonResponse({ error: "not_active" }, 403);
  if (!purchase.addon_id?.startsWith("icons_")) return jsonResponse({ error: "not_icons_purchase" }, 403);

  const metadata = typeof purchase.metadata === "object" && purchase.metadata ? purchase.metadata : {};

  const lastRefreshIso = metadata.download_refreshed_at;
  if (typeof lastRefreshIso === "string") {
    const last = Date.parse(lastRefreshIso);
    if (Number.isFinite(last) && Date.now() - last < REFRESH_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((REFRESH_COOLDOWN_MS - (Date.now() - last)) / 1000);
      return jsonResponse({ error: "rate_limited", retry_after_seconds: waitSeconds }, 429);
    }
  }

  const objectPath = resolveIconDeliveryPath(purchase.addon_id, metadata);
  if (!objectPath) {
    return jsonResponse({ error: "missing_delivery_path", delivery_status: "manual_review" }, 422);
  }

  const { data: signed, error: signErr } = await admin
    .storage
    .from(String(metadata.download_bucket || ICONS_BUCKET))
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signErr || !signed?.signedUrl) {
    console.error("refresh-icons-url signing error:", signErr?.message || "no url", "path:", objectPath);
    return jsonResponse({
      error: "sign_failed",
      detail: signErr?.message,
      delivery_status: "pending_signed_url",
      object_path: objectPath,
    }, 500);
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const filename = String(metadata.download_filename || safeFileName(objectPath, "volynx-icons.zip"));
  const nextMetadata = {
    ...metadata,
    download_bucket: String(metadata.download_bucket || ICONS_BUCKET),
    download_path: objectPath,
    download_filename: filename,
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
    download_version: String(metadata.download_version || ICONS_VERSION),
    download_refreshed_at: new Date().toISOString(),
    delivery_status: "ready",
    delivery_error: null,
  };

  const { error: updateErr } = await admin
    .from("addons_purchased")
    .update({ metadata: nextMetadata })
    .eq("id", purchase.id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("refresh-icons-url metadata update error:", updateErr.message);
  }

  return jsonResponse({
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
    download_filename: filename,
    delivery_status: "ready",
    version: nextMetadata.download_version,
  });
});
