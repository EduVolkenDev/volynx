/**
 * VOLYNX — Create Pix Checkout (Stripe)
 *
 * Legacy endpoint kept for older clients. It now creates a Stripe Checkout
 * Session with Pix as the payment method. Fulfillment is handled exclusively
 * by stripe-webhook.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const STRIPE_API_VERSION = "2026-02-25.clover";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isProductionOrigin(origin: string): boolean {
  return /^https:\/\/(www\.)?volynx\.world\b/i.test(origin);
}

function shouldBlockTestStripeKey(stripeKey: string): boolean {
  return isProductionOrigin(FRONTEND_ORIGIN) && stripeKey.startsWith("sk_test_");
}

function extractPrefix(key: string): string {
  const parts = key.split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return key;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ ok: false, error: "Missing authorization token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ ok: false, error: "Invalid or expired token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const lookupKey = typeof body.lookup_key === "string" ? body.lookup_key : "";
    if (!lookupKey) {
      return json({ ok: false, error: "Missing lookup_key" }, 400);
    }

    const prefix = extractPrefix(lookupKey);
    if (!prefix.startsWith("tokens_")) {
      return json({ ok: false, error: "Pix checkout is only available for VX token packs." }, 400);
    }
    if (!/_brl$/i.test(lookupKey)) {
      return json({ ok: false, error: "Pix checkout requires a BRL lookup key." }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) {
      console.error("[pix-checkout] STRIPE_SECRET_KEY not set");
      return json({ ok: false, error: "Payment system not configured." }, 500);
    }
    if (shouldBlockTestStripeKey(stripeKey)) {
      console.error("[pix-checkout] blocked test Stripe key on production origin");
      return json({ ok: false, error: "Live Pix checkout is not configured." }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: STRIPE_API_VERSION as any,
      httpClient: Stripe.createFetchHttpClient(),
    });

    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      limit: 1,
      expand: ["data.product"],
    });
    const price = prices.data[0];
    if (!price) {
      return json({ ok: false, error: `Price not found for: ${lookupKey}` }, 404);
    }
    if (price.currency.toLowerCase() !== "brl") {
      return json({ ok: false, error: "Pix checkout requires a BRL price." }, 400);
    }

    const user = userData.user;
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

    const successUrl = typeof body.success_url === "string"
      ? body.success_url
      : `${FRONTEND_ORIGIN}/account/?payment=pix_success`;
    const cancelUrl = typeof body.cancel_url === "string"
      ? body.cancel_url
      : `${FRONTEND_ORIGIN}/recarregar/?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      payment_method_types: ["pix"],
      payment_method_options: {
        pix: { expires_after_seconds: 1800 },
      },
      locale: "pt-BR",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        lookup_key: lookupKey,
        requested_lookup_key: lookupKey,
        stripe_lookup_key: lookupKey,
        product_family: prefix,
        product_prefix: prefix,
        payment_method: "pix",
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          lookup_key: lookupKey,
          requested_lookup_key: lookupKey,
          stripe_lookup_key: lookupKey,
          payment_method: "pix",
        },
      },
    } as any);

    return json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[pix-checkout] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
