/**
 * VOLYNX — Create Checkout Session (Supabase Edge Function)
 *
 * Accepts a lookup_key from the frontend, resolves the Stripe price,
 * and creates a checkout session (subscription or payment).
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY
 *   SUPABASE_SERVICE_ROLE_KEY (for user lookup)
 *
 * Request body:
 *   { lookup_key: string, success_url?: string, cancel_url?: string }
 *
 * Auth: Bearer token (Supabase JWT) in Authorization header
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Lookup key prefix → checkout mode ───────────────────────

function getCheckoutMode(prefix: string): "subscription" | "payment" {
  const subscriptionPrefixes = [
    "builder_launch",
    "builder_pro",
    "builder_studio",
    "builder_teams",
    "studio_pro",
    "addon_extra_slot",
  ];
  return subscriptionPrefixes.includes(prefix) ? "subscription" : "payment";
}

function extractPrefix(lookupKey: string): string {
  const parts = lookupKey.split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return lookupKey;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Authenticate user ──
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;

    // ── Parse request ──
    const body = await req.json();
    const { lookup_key, success_url, cancel_url } = body;

    if (!lookup_key || typeof lookup_key !== "string") {
      return new Response(JSON.stringify({ error: "Missing lookup_key" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Resolve Stripe price by lookup_key ──
    const prices = await stripe.prices.list({
      lookup_keys: [lookup_key],
      limit: 1,
      expand: ["data.product"],
    });

    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: `No price found for lookup_key: ${lookup_key}` }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const price = prices.data[0];
    const prefix = extractPrefix(lookup_key);
    const mode = getCheckoutMode(prefix);

    // ── Get or create Stripe customer ──
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Save to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // ── Create checkout session ──
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { user_id: user.id, lookup_key, product_family: prefix },
      success_url: success_url || `${FRONTEND_ORIGIN}/profile/?payment=success`,
      cancel_url: cancel_url || `${FRONTEND_ORIGIN}/pricing/?payment=cancelled`,
    };

    // For subscriptions, allow promotion codes and set billing anchor
    if (mode === "subscription") {
      sessionParams.allow_promotion_codes = true;
      sessionParams.subscription_data = {
        metadata: { user_id: user.id, lookup_key, plan_key: prefix },
      };
    }

    // For one-time payments, allow promotion codes
    if (mode === "payment") {
      sessionParams.allow_promotion_codes = true;
      sessionParams.payment_intent_data = {
        metadata: { user_id: user.id, lookup_key },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
