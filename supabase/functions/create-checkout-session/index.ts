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

function getCheckoutMode(prefix: string): "subscription" | "payment" {
  // All plan subscriptions: volynx, daily, bundles, legacy builder_
  if (prefix.startsWith("builder_") || prefix.startsWith("volynx_")) return "subscription";
  if (prefix.startsWith("daily_")) return "subscription";
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

    const body = await req.json();
    const { lookup_key, success_url, cancel_url } = body;

    if (!lookup_key || typeof lookup_key !== "string") {
      return json({ error: "Missing lookup_key" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[checkout] STRIPE_SECRET_KEY not set");
      return json({ error: "Payment system not configured. Contact support." }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Resolve Stripe price
    const prices = await stripe.prices.list({
      lookup_keys: [lookup_key],
      limit: 1,
      expand: ["data.product"],
    });

    if (!prices.data.length) {
      console.error("[checkout] No price for lookup_key:", lookup_key);
      return json({ error: `Price not found for: ${lookup_key}` }, 404);
    }

    const price = prices.data[0];
    const prefix = extractPrefix(lookup_key);
    const mode = getCheckoutMode(prefix);

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

    // Build session
    const params: Record<string, unknown> = {
      customer: customerId,
      mode,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { user_id: user.id, lookup_key, product_family: prefix },
      success_url: success_url || `${FRONTEND_ORIGIN}/profile/?payment=success`,
      cancel_url: cancel_url || `${FRONTEND_ORIGIN}/pricing/?payment=cancelled`,
      allow_promotion_codes: true,
    };

    if (mode === "subscription") {
      params.subscription_data = {
        metadata: { user_id: user.id, lookup_key, plan_key: prefix },
      };
    } else {
      params.payment_intent_data = {
        metadata: { user_id: user.id, lookup_key },
      };
    }

    const session = await stripe.checkout.sessions.create(params as any);
    return json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
