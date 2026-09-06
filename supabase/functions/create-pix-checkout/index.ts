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
import {
  corsHeaders,
  isAllowedReturnUrl,
  isUuid,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
} from "../_shared/edge-security.ts";

const STRIPE_API_VERSION = "2026-02-25.clover";

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";

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

function extractPrefix(key: string): string {
  const parts = key.split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return key;
}

serve(async (req: Request) => {
  const blockedOrigin = rejectUnexpectedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const json = (data: Record<string, unknown>, status = 200) => jsonResponse(req, data, status);

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

    const body = await parseJsonObject(req, 12_000);
    const lookupKey = typeof body.lookup_key === "string" ? body.lookup_key : "";
    if (!lookupKey) {
      return json({ ok: false, error: "Missing lookup_key" }, 400);
    }
    if (typeof body.success_url === "string" && body.success_url && !isAllowedReturnUrl(body.success_url, FRONTEND_ORIGIN)) {
      return json({ ok: false, error: "Invalid success URL" }, 400);
    }
    if (typeof body.cancel_url === "string" && body.cancel_url && !isAllowedReturnUrl(body.cancel_url, FRONTEND_ORIGIN)) {
      return json({ ok: false, error: "Invalid cancel URL" }, 400);
    }
    if (body.checkout_attempt_id !== undefined && !isUuid(body.checkout_attempt_id)) {
      return json({ ok: false, error: "Invalid checkout attempt" }, 400);
    }
    const checkoutAttemptId = isUuid(body.checkout_attempt_id) ? body.checkout_attempt_id : crypto.randomUUID();

    // ── Admin bypass — simulate Pix purchase ──
    {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (adminProfile?.is_admin) {
        const successUrl = `${FRONTEND_ORIGIN}/billing/success/?simulated=admin&lookup_key=${encodeURIComponent(lookupKey)}`;
        console.log(`[pix-checkout] admin_bypass simulate ${userData.user.email} → ${lookupKey}`);
        return json({
          ok: true,
          simulated: true,
          admin_bypass: true,
          url: successUrl,
          lookup_key: lookupKey,
        });
      }
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
      }, { idempotencyKey: `customer:${user.id}` });
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
        checkout_attempt_id: checkoutAttemptId,
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
    } as any, { idempotencyKey: `pix-checkout:${user.id}:${checkoutAttemptId}` });

    return json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[pix-checkout] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
