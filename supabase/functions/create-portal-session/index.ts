/**
 * VOLYNX — Stripe Customer Portal Session
 *
 * Opens the Stripe-hosted portal where users can:
 * - Cancel subscription
 * - Change plan (upgrade/downgrade)
 * - Update payment method
 * - View invoices
 *
 * Requires: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

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

function isProductionOrigin(origin: string): boolean {
  return /^https:\/\/(www\.)?volynx\.world\b/i.test(origin);
}

function shouldBlockTestStripeKey(stripeKey: string): boolean {
  return isProductionOrigin(FRONTEND_ORIGIN) && stripeKey.startsWith("sk_test_");
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Invalid or expired token. Please log in again." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { return_url } = body;

    // Get Stripe customer ID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return json({ error: "No active subscription found." }, 404);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "Payment system not configured." }, 500);
    }
    if (shouldBlockTestStripeKey(stripeKey)) {
      console.error("[portal] blocked test Stripe key on production origin");
      return json({ error: "Live billing portal is not configured." }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: return_url || `${FRONTEND_ORIGIN}/profile/`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("[portal] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
