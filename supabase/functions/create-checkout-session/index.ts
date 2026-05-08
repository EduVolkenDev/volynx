import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const STRIPE_API_VERSION = "2026-02-25.clover";
const STRIPE_PIX_API_VERSION = "2026-02-25.clover";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";
const LOOKUP_KEY_CURRENCY_RE = /_(gbp|eur|brl)$/i;

function isProductionOrigin(origin: string): boolean {
  return /^https:\/\/(www\.)?volynx\.world\b/i.test(origin);
}

function shouldBlockTestStripeKey(stripeKey: string): boolean {
  return isProductionOrigin(FRONTEND_ORIGIN) && stripeKey.startsWith("sk_test_");
}

function getCheckoutMode(prefix: string): "subscription" | "payment" {
  // All plan subscriptions: volynx, daily, bundles, legacy builder_
  if (prefix.startsWith("builder_") || prefix.startsWith("volynx_")) return "subscription";
  if (prefix.startsWith("daily_")) return "subscription";
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
  return prefix === "pf_enterprise" ? "pf_white_label" : prefix;
}

function canonicalizeLookupKey(lookupKey: string): string {
  const prefix = extractPrefix(lookupKey);
  const canonicalPrefix = canonicalizeLookupPrefix(prefix);
  if (!prefix || prefix === canonicalPrefix) return lookupKey;
  return lookupKey.replace(prefix, canonicalPrefix);
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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

    const body = await req.json() as Record<string, unknown>;
    const { lookup_key, success_url, cancel_url } = body;

    if (!lookup_key || typeof lookup_key !== "string") {
      return json({ error: "Missing lookup_key" }, 400);
    }

    // ── Admin bypass — simulate purchase, skip Stripe entirely ──
    // Admin already has all plans + huge balance, so we just return a
    // success URL with ?simulated=admin so the success page can show a banner.
    {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (adminProfile?.is_admin) {
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

    const stripe = new Stripe(stripeKey, {
      apiVersion: STRIPE_API_VERSION as any,
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Resolve Stripe price. White-Label keeps compatibility with the
    // existing `pf_enterprise_*` lookup keys already present in Stripe.
    const lookupCandidates = resolveStripeLookupCandidates(lookup_key);
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

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // Optional per-product metadata (icon purchase: which icon?)
    const extraMeta: Record<string, string> = {};
    for (const key of ["icon_id", "icon_label", "icon_path", "icon_collection"]) {
      const value = (body as Record<string, unknown>)[key];
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

    const session = await sessionStripe.checkout.sessions.create(params as any);
    return json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
