/**
 * VOLYNX — Stripe Webhook Handler (Supabase Edge Function)
 *
 * Listens to Stripe events and syncs payment state to Supabase.
 * Must be deployed with verify_jwt: false (Stripe doesn't send JWTs).
 *
 * Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
 *   STRIPE_SECRET_KEY        — sk_test_ or sk_live_
 *   STRIPE_WEBHOOK_SECRET    — whsec_ from Stripe Dashboard
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key from Supabase
 *
 * Handles:
 *   checkout.session.completed       — activate plan or credit tokens
 *   customer.subscription.updated    — sync plan changes
 *   customer.subscription.deleted    — downgrade to free
 *   invoice.payment_succeeded        — update period end
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ── Config ──────────────────────────────────────────────────

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// ── Lookup key → plan mapping ───────────────────────────────
// Maps the lookup_key prefix to the plan value stored in profiles.builder_plan

const LOOKUP_TO_PLAN: Record<string, string> = {
  builder_launch: "launch",
  builder_pro: "pro",
  builder_studio: "studio",
  builder_teams: "teams",
  studio_pro: "pro",       // profiles.plan = 'pro' (tool access)
};

// Token pack credits (lookup_key prefix → tokens to add)
const TOKEN_CREDITS: Record<string, number> = {
  tokens_starter: 10,
  tokens_core: 25,
  tokens_pro: 60,
  tokens_scale: 150,
};

// ── Helpers ─────────────────────────────────────────────────

function extractPrefix(lookupKey: string): string {
  // "builder_pro_gbp" → "builder_pro"
  const parts = lookupKey.split("_");
  // Remove the currency suffix (last part: gbp/eur/brl)
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return lookupKey;
}

function isSubscription(prefix: string): boolean {
  return prefix.startsWith("builder_") || prefix === "studio_pro" || prefix === "addon_extra_slot";
}

// ── Core handlers ───────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("checkout.session.completed: no user_id in metadata");
    return;
  }

  // Expand line items to get the lookup_key
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ["data.price"],
  });

  const price = lineItems.data[0]?.price as Stripe.Price | undefined;
  if (!price) {
    console.error("checkout.session.completed: no price found");
    return;
  }

  const lookupKey = price.lookup_key || "";
  const prefix = extractPrefix(lookupKey);
  const currency = lookupKey.split("_").pop()?.toUpperCase() || "GBP";

  console.log(`Processing checkout for user ${userId}, lookup: ${lookupKey}, prefix: ${prefix}`);

  // ── Subscription (Builder plan or Studio Pro) ──
  if (session.mode === "subscription" && session.subscription) {
    const subId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subId);

    // Upsert subscription record
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subId,
        status: subscription.status,
        price_id: price.id,
        plan_key: prefix,
        lookup_key: lookupKey,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" }
    );

    // Update user plan
    const planValue = LOOKUP_TO_PLAN[prefix];
    if (planValue) {
      const updates: Record<string, any> = {
        stripe_customer_id: session.customer as string,
      };

      if (prefix.startsWith("builder_")) {
        updates.builder_plan = planValue;
      }
      if (prefix === "studio_pro" || prefix.startsWith("builder_")) {
        // Any paid plan grants 'pro' on profiles.plan
        updates.plan = "pro";
      }

      await supabase.from("profiles").update(updates).eq("id", userId);
      console.log(`Updated plan for ${userId}: ${JSON.stringify(updates)}`);
    }

    // Log purchase event
    await supabase.from("purchase_events").insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string || null,
      product_key: prefix,
      lookup_key: lookupKey,
      amount_paid: session.amount_total || 0,
      currency: currency,
      tokens_credited: 0,
      status: "completed",
      metadata: { mode: session.mode, subscription_id: subId },
    });
  }

  // ── One-time payment (Token packs, Add-ons) ──
  if (session.mode === "payment") {
    const tokenAmount = TOKEN_CREDITS[prefix] || 0;

    if (tokenAmount > 0) {
      // Credit tokens
      const { data: profile } = await supabase
        .from("profiles")
        .select("token_balance")
        .eq("id", userId)
        .single();

      const currentBalance = profile?.token_balance || 0;
      const newBalance = currentBalance + tokenAmount;

      await supabase
        .from("profiles")
        .update({ token_balance: newBalance })
        .eq("id", userId);

      // Log token transaction
      await supabase.from("token_transactions").insert({
        user_id: userId,
        amount: tokenAmount,
        type: "purchase",
        description: `Token pack: ${prefix} (${lookupKey})`,
        tool_name: null,
        balance_after: newBalance,
        metadata: { stripe_session_id: session.id, lookup_key: lookupKey },
      });

      console.log(`Credited ${tokenAmount} tokens to ${userId}. New balance: ${newBalance}`);
    }

    // Handle add-on purchases
    if (prefix.startsWith("addon_")) {
      const addonId = prefix.replace("addon_", "");
      await supabase.from("addons_purchased").insert({
        user_id: userId,
        addon_id: addonId,
        price_paid: (session.amount_total || 0) / 100,
        currency: currency,
        status: "active",
        metadata: { stripe_session_id: session.id, lookup_key: lookupKey },
      });
      console.log(`Addon ${addonId} activated for ${userId}`);
    }

    // Log purchase event
    await supabase.from("purchase_events").insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string || null,
      product_key: prefix,
      lookup_key: lookupKey,
      amount_paid: session.amount_total || 0,
      currency: currency,
      tokens_credited: tokenAmount,
      status: "completed",
      metadata: { mode: session.mode },
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subRecord = await supabase
    .from("subscriptions")
    .select("user_id, plan_key")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!subRecord.data) {
    console.error(`subscription.updated: no record for ${subscription.id}`);
    return;
  }

  const { user_id, plan_key } = subRecord.data;

  // Update subscription status
  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("stripe_subscription_id", subscription.id);

  // If subscription is no longer active, downgrade
  if (["canceled", "unpaid", "past_due"].includes(subscription.status)) {
    const prefix = plan_key || "";
    if (prefix.startsWith("builder_")) {
      await supabase.from("profiles").update({ builder_plan: "free" }).eq("id", user_id);
    }
    // Check if user has any other active subscriptions before downgrading plan
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .neq("stripe_subscription_id", subscription.id);

    if (!activeSubs || activeSubs.length === 0) {
      await supabase.from("profiles").update({ plan: "free" }).eq("id", user_id);
    }

    console.log(`Subscription ${subscription.id} status: ${subscription.status} for user ${user_id}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subRecord = await supabase
    .from("subscriptions")
    .select("user_id, plan_key")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!subRecord.data) return;

  const { user_id, plan_key } = subRecord.data;

  // Mark subscription as canceled
  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  // Downgrade builder plan
  const prefix = plan_key || "";
  if (prefix.startsWith("builder_")) {
    await supabase.from("profiles").update({ builder_plan: "free" }).eq("id", user_id);
  }

  // Check for other active subscriptions
  const { data: activeSubs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user_id)
    .eq("status", "active");

  if (!activeSubs || activeSubs.length === 0) {
    await supabase.from("profiles").update({ plan: "free" }).eq("id", user_id);
  }

  console.log(`Subscription deleted: ${subscription.id}, user ${user_id} downgraded`);
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subId);

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  console.log(`Invoice paid, subscription ${subId} renewed`);
}

// ── HTTP Handler ────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "stripe-signature, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log(`Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, (err as Error).message);
    // Return 200 to prevent Stripe from retrying (we log the error)
    return new Response(JSON.stringify({ received: true, error: (err as Error).message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
