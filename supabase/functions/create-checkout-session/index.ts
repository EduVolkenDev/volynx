import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.2.2";
import {
  corsHeaders,
  isAllowedReturnUrl,
  isUuid,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
} from "../_shared/edge-security.ts";

const STRIPE_API_VERSION = "2026-02-25.clover";
const STRIPE_PIX_API_VERSION = "2026-02-25.clover";

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";
const LOOKUP_KEY_CURRENCY_RE = /_(gbp|eur|brl)$/i;

function isCanonicalFrontendOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === new URL(FRONTEND_ORIGIN).origin;
  } catch {
    return false;
  }
}

function isProductionFrontend(): boolean {
  try {
    return new URL(FRONTEND_ORIGIN).origin === "https://volynx.world";
  } catch {
    return false;
  }
}

function shouldBlockTestStripeKey(stripeKey: string): boolean {
  return isProductionFrontend() && stripeKey.startsWith("sk_test_");
}

function shouldBlockLiveStripeKey(req: Request, stripeKey: string, successUrl: unknown, cancelUrl: unknown): boolean {
  if (!stripeKey.startsWith("sk_live_")) return false;
  const requestOrigin = req.headers.get("Origin") || "";
  if (!isCanonicalFrontendOrigin(requestOrigin)) return true;
  if (typeof successUrl === "string" && successUrl && !isAllowedReturnUrl(successUrl, FRONTEND_ORIGIN)) return true;
  if (typeof cancelUrl === "string" && cancelUrl && !isAllowedReturnUrl(cancelUrl, FRONTEND_ORIGIN)) return true;
  return false;
}

function getCheckoutMode(prefix: string): "subscription" | "payment" {
  // All plan subscriptions: volynx, daily, bundles, legacy builder_
  if (prefix.startsWith("builder_") || prefix.startsWith("volynx_")) return "subscription";
  if (prefix.startsWith("daily_")) return "subscription";
  if (prefix.startsWith("world_")) return "subscription";
  if (prefix === "cvitae_business") return "subscription";
  if (prefix.startsWith("bundle_")) return "subscription";
  if (prefix === "studio_pro" || prefix === "addon_extra_slot") return "subscription";
  return "payment";
}

function extractPrefix(key: string): string {
  const parts = key.split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return key;
}

function resolveStripeLookupCandidates(lookupKey: string): string[] {
  const prefix = extractPrefix(lookupKey);
  const currencyMatch = lookupKey.match(LOOKUP_KEY_CURRENCY_RE);
  const currencySuffix = currencyMatch ? `_${currencyMatch[1].toLowerCase()}` : "";
  const candidates = new Set([lookupKey]);

  if (prefix === "pf_white_label") {
    candidates.add(`pf_enterprise${currencySuffix}`);
  }

  return [...candidates];
}

function canonicalizeLookupPrefix(prefix: string): string {
  if (prefix === "pf_starter_e2e") return "pf_starter";
  return prefix === "pf_enterprise" ? "pf_white_label" : prefix;
}

function canonicalizeLookupKey(lookupKey: string): string {
  const prefix = extractPrefix(lookupKey);
  const canonicalPrefix = canonicalizeLookupPrefix(prefix);
  if (!prefix || prefix === canonicalPrefix) return lookupKey;
  return lookupKey.replace(prefix, canonicalPrefix);
}

function isCheckoutSmokeTest(prefix: string): boolean {
  return prefix === "checkout_smoke_test";
}

// ── Icons-store catalog validation ──────────────────────────
// The icon store frontend sends the selected icon (icon_id/icon_path) or
// collection (icon_collection) in the checkout body. These fields are fully
// client-controlled, so the purchased tier (lookup prefix) must be validated
// against the public catalog BEFORE a Stripe session is created — otherwise a
// buyer of the cheapest tier could request a premium asset and receive it.
// The webhook re-validates at fulfillment; this check fails fast with a 400.
const ICON_CATALOG_URL = "https://volynx.world/assets/icons-store/catalog.json";
const ICON_CATALOG_TTL_MS = 10 * 60 * 1000;
let iconCatalogCache: { fetchedAt: number; items: Array<Record<string, unknown>> } | null = null;

async function fetchIconCatalog(): Promise<Array<Record<string, unknown>> | null> {
  if (iconCatalogCache && Date.now() - iconCatalogCache.fetchedAt < ICON_CATALOG_TTL_MS) {
    return iconCatalogCache.items;
  }
  try {
    const res = await fetch(ICON_CATALOG_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    iconCatalogCache = { fetchedAt: Date.now(), items: data as Array<Record<string, unknown>> };
    return iconCatalogCache.items;
  } catch {
    return null;
  }
}

type IconSelectionCheck = { ok: boolean; reason?: string; item?: Record<string, unknown> };

function validateIconSelection(
  prefix: string,
  fields: { icon_id: string; icon_path: string; icon_collection: string },
  catalog: Array<Record<string, unknown>>,
): IconSelectionCheck {
  if (prefix.startsWith("icons_pack_")) {
    const collection = fields.icon_collection.trim();
    if (!collection) return { ok: false, reason: "missing_collection" };
    // The full-premium combo is only sold as the hyper pack.
    if (collection === "__all_premium__") {
      return prefix === "icons_pack_hyper"
        ? { ok: true, item: { collection } }
        : { ok: false, reason: "collection_tier_mismatch" };
    }
    const match = catalog.find(
      (item) => item.collection === collection && typeof item.packLookup === "string" && item.packLookup,
    );
    if (!match) return { ok: false, reason: "unknown_collection" };
    return match.packLookup === prefix
      ? { ok: true, item: match }
      : { ok: false, reason: "collection_tier_mismatch" };
  }
  const iconId = fields.icon_id.trim();
  const iconPath = fields.icon_path.trim();
  const byId = iconId !== "" ? catalog.find((entry) => entry.id === iconId) : undefined;
  const byPath = iconPath !== "" ? catalog.find((entry) => entry.path === iconPath) : undefined;
  // Both identifiers provided must agree — never mix the id of one asset with
  // the path of another.
  if (byId && byPath && byId !== byPath) return { ok: false, reason: "icon_identifier_mismatch" };
  const item = byId || byPath;
  if (!item) return { ok: false, reason: "unknown_icon" };
  if (!item.singleLookup) return { ok: false, reason: "icon_not_single_eligible" };
  return item.singleLookup === prefix
    ? { ok: true, item }
    : { ok: false, reason: "icon_tier_mismatch" };
}

function wantsPixCheckout(body: Record<string, unknown>): boolean {
  const paymentMethod = typeof body.payment_method === "string" ? body.payment_method : "";
  const paymentMethodType = typeof body.payment_method_type === "string" ? body.payment_method_type : "";
  const paymentMethodTypes = Array.isArray(body.payment_method_types) ? body.payment_method_types : [];

  return [paymentMethod, paymentMethodType, ...paymentMethodTypes]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase() === "pix");
}

Deno.serve(async (req: Request) => {
  const blockedOrigin = rejectUnexpectedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const json = (data: Record<string, unknown>, status = 200) => jsonResponse(req, data, status);

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let checkoutStage = "authenticate";

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Missing authorization token" }, 401);
    }

    // Create Supabase client with user's JWT (anon key — no service role needed)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Invalid or expired token. Please log in again." }, 401);
    }

    const body = await parseJsonObject(req, 12_000);
    const { lookup_key, success_url, cancel_url } = body;

    if (!lookup_key || typeof lookup_key !== "string") {
      return json({ error: "Missing lookup_key" }, 400);
    }
    if (typeof success_url === "string" && success_url && !isAllowedReturnUrl(success_url, FRONTEND_ORIGIN)) {
      return json({ error: "Invalid success URL" }, 400);
    }
    if (typeof cancel_url === "string" && cancel_url && !isAllowedReturnUrl(cancel_url, FRONTEND_ORIGIN)) {
      return json({ error: "Invalid cancel URL" }, 400);
    }
    if (body.checkout_attempt_id !== undefined && !isUuid(body.checkout_attempt_id)) {
      return json({ error: "Invalid checkout attempt" }, 400);
    }
    const checkoutAttemptId = isUuid(body.checkout_attempt_id) ? body.checkout_attempt_id : crypto.randomUUID();

    const checkoutPrefix = extractPrefix(lookup_key);
    const requiresRealCheckout = isCheckoutSmokeTest(checkoutPrefix) || checkoutPrefix === "pf_starter_e2e";

    // ── Admin bypass — simulate purchase, skip Stripe entirely ──
    // Admin already has all plans + huge balance, so we just return a
    // success URL with ?simulated=admin so the success page can show a banner.
    // Smoke tests must still hit Stripe so checkout/webhook/delivery can be
    // verified end-to-end with an admin account.
    {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (adminProfile?.is_admin && !requiresRealCheckout) {
        const baseSuccess = (typeof success_url === "string" && success_url)
          ? success_url
          : `${FRONTEND_ORIGIN}/billing/success/`;
        const sep = baseSuccess.includes("?") ? "&" : "?";
        const simulatedUrl = `${baseSuccess}${sep}simulated=admin&lookup_key=${encodeURIComponent(lookup_key)}`;
        console.log(`[checkout] admin_bypass simulate ${user.email} → ${lookup_key}`);
        return json({
          simulated: true,
          admin_bypass: true,
          url: simulatedUrl,
          lookup_key,
        });
      }
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[checkout] STRIPE_SECRET_KEY not set");
      return json({ error: "Payment system not configured. Contact support." }, 500);
    }
    if (shouldBlockTestStripeKey(stripeKey)) {
      console.error("[checkout] blocked test Stripe key on production origin");
      return json({ error: "Live checkout is not configured. Contact support." }, 500);
    }
    if (shouldBlockLiveStripeKey(req, stripeKey, success_url, cancel_url)) {
      console.error("[checkout] blocked live Stripe key outside production origin");
      return json({ error: "Live checkout is only available on volynx.world." }, 403);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: STRIPE_API_VERSION as any,
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Resolve Stripe price. White-Label keeps compatibility with the
    // existing `pf_enterprise_*` lookup keys already present in Stripe.
    const lookupCandidates = resolveStripeLookupCandidates(lookup_key);
    checkoutStage = "resolve_price";
    const prices = await stripe.prices.list({
      lookup_keys: lookupCandidates,
      limit: lookupCandidates.length,
      expand: ["data.product"],
    });

    if (!prices.data.length) {
      console.error("[checkout] No price for lookup_key:", lookup_key, "candidates:", lookupCandidates);
      return json({ error: `Price not found for: ${lookup_key}` }, 404);
    }

    const price = prices.data.find((entry) => entry.lookup_key === lookup_key) || prices.data[0];
    const stripeLookupKey = price.lookup_key || lookup_key;
    const canonicalPrefix = canonicalizeLookupPrefix(extractPrefix(lookup_key));
    const canonicalLookupKey = canonicalizeLookupKey(lookup_key);
    const mode = getCheckoutMode(canonicalPrefix);
    const pixRequested = wantsPixCheckout(body);

    if (pixRequested) {
      if (mode !== "payment") {
        return json({ error: "Pix is only available for one-time payments." }, 400);
      }
      if (!canonicalPrefix.startsWith("tokens_")) {
        return json({ error: "Pix is only available for token packs." }, 400);
      }
      if (price.currency.toLowerCase() !== "brl") {
        return json({ error: "Pix requires a BRL price." }, 400);
      }
    }

    // Get or create Stripe customer (RLS: user can read/update own profile)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id || "";

    // A customer ID is scoped to Stripe test/live mode. Profiles created while
    // testing can therefore contain an ID that a live key cannot retrieve.
    if (customerId) {
      checkoutStage = "validate_customer";
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if ("deleted" in existingCustomer && existingCustomer.deleted) {
          console.warn(`[checkout] replacing deleted Stripe customer ${customerId}`);
          customerId = "";
        }
      } catch (error) {
        const stripeError = error as { code?: string; statusCode?: number };
        if (stripeError.code === "resource_missing" || stripeError.statusCode === 404) {
          console.warn(`[checkout] replacing unavailable Stripe customer ${customerId}`);
          customerId = "";
        } else {
          throw error;
        }
      }
    }

    if (!customerId) {
      checkoutStage = "create_customer";
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      }, { idempotencyKey: `customer:${user.id}` });
      customerId = customer.id;
      const { error: customerUpdateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (customerUpdateError) {
        throw new Error(`Unable to save Stripe customer: ${customerUpdateError.message}`);
      }
    }

    // Icons-store purchases carry the selected icon/collection in the body.
    // These fields are client-controlled: validate the selection against the
    // catalog so the purchased tier always matches the requested asset.
    // Fails fast here; the webhook re-validates at fulfillment as backstop.
    // The session metadata below is written with the catalog's canonical
    // identifiers, not the raw client values.
    let canonicalIconMeta: Record<string, string> | null = null;
    if (canonicalPrefix.startsWith("icons_")) {
      const iconFields = {
        icon_id: typeof body.icon_id === "string" ? body.icon_id : "",
        icon_path: typeof body.icon_path === "string" ? body.icon_path : "",
        icon_collection: typeof body.icon_collection === "string" ? body.icon_collection : "",
      };
      const catalog = await fetchIconCatalog();
      if (catalog) {
        const check = validateIconSelection(canonicalPrefix, iconFields, catalog);
        if (!check.ok) {
          console.warn(`[checkout] icon selection rejected (${check.reason}) for prefix ${canonicalPrefix}`);
          return json(
            { error: "The selected icon does not match the purchased product. Please pick the matching tier." },
            400,
          );
        }
        const item = check.item;
        if (item) {
          canonicalIconMeta = {};
          if (typeof item.id === "string" && item.id) canonicalIconMeta.icon_id = item.id;
          if (typeof item.path === "string" && item.path) canonicalIconMeta.icon_path = item.path;
          if (typeof item.collection === "string" && item.collection) {
            canonicalIconMeta.icon_collection = item.collection;
          }
        }
      } else {
        console.warn("[checkout] icon catalog unreachable — skipping selection validation (webhook re-validates)");
      }
    }

    // Optional per-product metadata (icon purchase: which icon?)
    const extraMeta: Record<string, string> = {};
    for (const key of ["icon_id", "icon_label", "icon_path", "icon_collection"]) {
      const override = canonicalIconMeta?.[key];
      const value = override !== undefined ? override : (body as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > 0 && value.length < 500) {
        extraMeta[key] = value;
      }
    }

    const sessionMetadata = {
      user_id: user.id,
      lookup_key: canonicalLookupKey,
      requested_lookup_key: lookup_key,
      stripe_lookup_key: stripeLookupKey,
      product_family: canonicalPrefix,
      product_prefix: canonicalPrefix,
      checkout_attempt_id: checkoutAttemptId,
      ...extraMeta,
    };

    // Build session
    const params: Record<string, unknown> = {
      customer: customerId,
      mode,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: sessionMetadata,
      success_url: success_url || `${FRONTEND_ORIGIN}/profile/?payment=success`,
      cancel_url: cancel_url || `${FRONTEND_ORIGIN}/pricing/?payment=cancelled`,
      allow_promotion_codes: true,
    };

    if (requiresRealCheckout) {
      params.adaptive_pricing = { enabled: false };
      if (price.currency.toLowerCase() === "brl") {
        params.locale = "pt-BR";
      }
    }

    if (mode === "subscription") {
      params.subscription_data = {
        metadata: {
          user_id: user.id,
          lookup_key: canonicalLookupKey,
          requested_lookup_key: lookup_key,
          stripe_lookup_key: stripeLookupKey,
          plan_key: canonicalPrefix,
        },
      };
    } else {
      params.payment_intent_data = {
        metadata: {
          user_id: user.id,
          lookup_key: canonicalLookupKey,
          requested_lookup_key: lookup_key,
          stripe_lookup_key: stripeLookupKey,
          payment_method: pixRequested ? "pix" : "checkout",
        },
      };
    }

    if (pixRequested) {
      params.payment_method_types = ["pix"];
      params.payment_method_options = {
        pix: { expires_after_seconds: 1800 },
      };
      params.locale = "pt-BR";
      params.metadata = {
        ...sessionMetadata,
        payment_method: "pix",
      };
    }

    const sessionStripe = pixRequested
      ? new Stripe(stripeKey, {
        apiVersion: STRIPE_PIX_API_VERSION as any,
        httpClient: Stripe.createFetchHttpClient(),
      })
      : stripe;

    checkoutStage = "create_session";
    const session = await sessionStripe.checkout.sessions.create(params as any, {
      idempotencyKey: `checkout:${user.id}:${checkoutAttemptId}`,
    });
    return json({ url: session.url });
  } catch (err) {
    const checkoutError = err as Error & { code?: string; requestId?: string; type?: string };
    console.error("[checkout] error", {
      stage: checkoutStage,
      message: checkoutError.message,
      type: checkoutError.type,
      code: checkoutError.code,
      requestId: checkoutError.requestId,
    });
    return json({ error: "Server error" }, 500);
  }
});
