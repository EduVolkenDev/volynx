import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "icons-originals";
const ROOT = "volynx-icons-private";
const TTL_SECONDS = 60 * 60;
const TIER_RANK: Record<string, number> = {
  budget: 0,
  standard: 1,
  mixed: 1,
  premium: 2,
  hyper: 3,
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function originalPath(raw: unknown): string | null {
  const value = String(raw || "").trim();
  const prefix = "/assets/icons-store/";
  if (!value.startsWith(prefix) || value.includes("..") || value.includes("\\")) return null;
  return `files/${value.slice(prefix.length)}`;
}

function purchasedTier(addonId: string): string {
  return addonId.replace(/^icons_(single|pack)_/, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing authorization token" }, 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return json({ error: "Invalid or expired token" }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const purchaseId = String(body.purchase_id || "").trim();
  const sessionId = String(body.session_id || "").trim();
  if (!purchaseId && !sessionId) return json({ error: "Missing purchase_id or session_id" }, 400);

  let query = supabase
    .from("addons_purchased")
    .select("id,addon_id,price_paid,currency,status,metadata,created_at")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .like("addon_id", "icons_%");
  query = purchaseId ? query.eq("id", purchaseId) : query.eq("metadata->>stripe_session_id", sessionId);
  const { data: purchase, error: purchaseError } = await query.maybeSingle();
  if (purchaseError) return json({ error: "Database error" }, 500);
  if (!purchase) return json({ error: "No active icon purchase found" }, 403);

  const { data: manifestFile, error: manifestError } = await supabase.storage
    .from(BUCKET)
    .download(`${ROOT}/manifest.json`);
  if (manifestError || !manifestFile) return json({ error: "Delivery manifest unavailable" }, 500);
  const manifest = JSON.parse(await manifestFile.text()) as {
    assets: Record<string, { tier: string }>;
    packs: Record<string, { tier: string; path: string }>;
  };

  const metadata = (purchase.metadata || {}) as Record<string, unknown>;
  const tier = purchasedTier(purchase.addon_id);
  const buyerRank = TIER_RANK[tier] ?? -1;
  const kind = String(metadata.kind || (purchase.addon_id.includes("_pack_") ? "pack" : "single"));
  let path: string | null = null;
  let filename = "volynx-icons.zip";

  if (kind === "single") {
    path = originalPath(metadata.icon_path);
    const asset = path ? manifest.assets[path] : null;
    if (!path || !asset || buyerRank < (TIER_RANK[asset.tier] ?? 99)) {
      return json({ error: "Purchased tier does not grant this icon" }, 403);
    }
    filename = path.split("/").pop() || "volynx-icon";
  } else {
    const collection = String(metadata.icon_collection || "").trim();
    const packKey = collection === "__all_premium__" ? collection : slug(collection);
    const pack = manifest.packs[packKey];
    if (!pack || buyerRank < (TIER_RANK[pack.tier] ?? 99)) {
      return json({ error: "Purchased tier does not grant this pack" }, 403);
    }
    path = pack.path;
    filename = `${packKey || "volynx-icons"}.zip`;
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${ROOT}/${path}`, TTL_SECONDS);
  if (signedError || !signed?.signedUrl) return json({ error: "Could not sign delivery" }, 500);

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
  const newMetadata = {
    ...metadata,
    delivery_status: "ready",
    delivery_bucket: BUCKET,
    delivery_path: `${ROOT}/${path}`,
    delivery_url: signed.signedUrl,
    delivery_filename: filename,
    delivery_expires_at: expiresAt,
    delivery_refreshed_at: new Date().toISOString(),
  };
  const { error: updateError } = await supabase
    .from("addons_purchased")
    .update({ metadata: newMetadata })
    .eq("id", purchase.id);
  if (updateError) console.error("Could not persist icon delivery metadata:", updateError.message);

  return json({
    ok: true,
    purchase: { ...purchase, metadata: newMetadata },
    download_url: signed.signedUrl,
    download_expires_at: expiresAt,
  });
});
