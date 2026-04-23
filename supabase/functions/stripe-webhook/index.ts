/**
 * VOLYNX — Stripe Webhook Handler (Supabase Edge Function)
 *
 * Multi-product aware: handles volynx, daily, bundle, and legacy builder_ prefixes.
 * Must be deployed with verify_jwt: false (Stripe doesn't send JWTs).
 *
 * Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
 *   STRIPE_SECRET_KEY        — sk_test_ or sk_live_
 *   STRIPE_WEBHOOK_SECRET    — whsec_ from Stripe Dashboard
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key from Supabase
 *
 * Handles:
 *   checkout.session.completed       — activate plan or credit tokens
 *   checkout.session.async_payment_succeeded — credit delayed one-time payments
 *   checkout.session.async_payment_failed    — mark delayed one-time payments failed
 *   customer.subscription.updated    — sync plan changes
 *   customer.subscription.deleted    — downgrade to free
 *   invoice.payment_succeeded        — update period end
 *   invoice.payment_failed           — mark subscription past_due
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ── Config ──────────────────────────────────────────────────

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2026-02-25.clover" as any,
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// ── Multi-product plan mapping ──────────────────────────────
// Maps lookup_key prefix → profile column updates
// This mirrors src/data/products.ts getProfileUpdates() for the Deno runtime

const PLAN_PROFILE_MAP: Record<string, Record<string, string>> = {
  // Volynx (new naming)
  volynx_launch:  { builder_plan: "launch", plan: "pro" },
  volynx_pro:     { builder_plan: "pro",    plan: "pro" },
  volynx_studio:  { builder_plan: "studio", plan: "pro" },
  volynx_teams:   { builder_plan: "teams",  plan: "pro" },

  // Daily
  daily_pro:      { daily_plan: "pro",     plan: "pro" },
  daily_diamond:  { daily_plan: "diamond", plan: "pro" },

  // Bundles
  bundle_volynx_daily_pro:    { builder_plan: "pro",    daily_plan: "pro",     plan: "pro" },
  bundle_volynx_daily_studio: { builder_plan: "studio", daily_plan: "diamond", plan: "pro" },

  // Legacy (backward compat — existing Stripe prices)
  builder_launch: { builder_plan: "launch", plan: "pro" },
  builder_pro:    { builder_plan: "pro",    plan: "pro" },
  builder_studio: { builder_plan: "studio", plan: "pro" },
  builder_teams:  { builder_plan: "teams",  plan: "pro" },
  studio_pro:     { plan: "pro" },
};

// Downgrade mapping: which profile fields to reset when a plan is canceled
const PLAN_DOWNGRADE_MAP: Record<string, Record<string, string>> = {
  volynx_launch:  { builder_plan: "free" },
  volynx_pro:     { builder_plan: "free" },
  volynx_studio:  { builder_plan: "free" },
  volynx_teams:   { builder_plan: "free" },
  daily_pro:      { daily_plan: "free" },
  daily_diamond:  { daily_plan: "free" },
  bundle_volynx_daily_pro:    { builder_plan: "free", daily_plan: "free" },
  bundle_volynx_daily_studio: { builder_plan: "free", daily_plan: "free" },
  builder_launch: { builder_plan: "free" },
  builder_pro:    { builder_plan: "free" },
  builder_studio: { builder_plan: "free" },
  builder_teams:  { builder_plan: "free" },
  studio_pro:     { builder_plan: "free" },
};

// Product key detection from prefix
function detectProductKey(prefix: string): string {
  if (prefix.startsWith("bundle_")) return "bundle";
  if (prefix.startsWith("daily_")) return "daily";
  if (prefix.startsWith("volynx_") || prefix.startsWith("builder_")) return "volynx";
  if (prefix.startsWith("studio_")) return "volynxlab";
  if (prefix.startsWith("tokens_")) return "tokens";
  if (prefix.startsWith("addon_")) return "addons";
  if (prefix.startsWith("icons_")) return "icons_store";
  if (prefix.startsWith("kit_")) return "kits";
  if (prefix.startsWith("pf_")) return "propertyflow";
  return "volynx";
}

// Token pack credits (lookup_key prefix → tokens to add)
const TOKEN_CREDITS: Record<string, number> = {
  tokens_starter: 12,
  tokens_core: 32,
  tokens_pro: 80,
  tokens_scale: 200,
};

// ── Helpers ─────────────────────────────────────────────────

function extractPrefix(lookupKey: string): string {
  const parts = lookupKey.split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return lookupKey;
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

function isSubscription(prefix: string): boolean {
  return !!(PLAN_PROFILE_MAP[prefix]) ||
    prefix === "addon_extra_slot";
}

// ── Core handlers ───────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("checkout.session.completed: no user_id in metadata");
    return;
  }

  if (session.mode === "payment" && session.payment_status && session.payment_status !== "paid") {
    console.log(`Payment session ${session.id} is ${session.payment_status}; waiting for async success before fulfillment`);
    return;
  }

  const { data: existingPurchase } = await supabase
    .from("purchase_events")
    .select("id,status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingPurchase?.status === "completed") {
    console.log(`Session ${session.id} already fulfilled; skipping duplicate webhook`);
    return;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ["data.price"],
  });

  const price = lineItems.data[0]?.price as Stripe.Price | undefined;
  if (!price) {
    console.error("checkout.session.completed: no price found");
    return;
  }

  const stripeLookupKey = price.lookup_key || "";
  const stripePrefix = extractPrefix(stripeLookupKey);
  const prefix = canonicalizeLookupPrefix(stripePrefix);
  const lookupKey = canonicalizeLookupKey(stripeLookupKey);
  const currency = lookupKey.split("_").pop()?.toUpperCase() || "GBP";
  const productKey = detectProductKey(prefix);

  // Resolve user email for identification in all records
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  const userEmail = userProfile?.email || session.customer_details?.email || "";

  console.log(
    `Processing checkout for ${userEmail} (${userId}), stripe_lookup: ${stripeLookupKey}, canonical_lookup: ${lookupKey}, prefix: ${prefix}, product: ${productKey}`,
  );

  // ── Subscription (any product plan or bundle) ──
  if (session.mode === "subscription" && session.subscription) {
    const subId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subId);

    // Upsert subscription record
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        user_email: userEmail,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subId,
        status: subscription.status,
        price_id: price.id,
        plan_key: prefix,
        lookup_key: lookupKey,
        product_key: productKey,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" }
    );

    // Update user profile with plan
    const profileUpdates = PLAN_PROFILE_MAP[prefix];
    if (profileUpdates) {
      const updates: Record<string, any> = {
        ...profileUpdates,
        stripe_customer_id: session.customer as string,
      };

      await supabase.from("profiles").update(updates).eq("id", userId);
      // Sync plan to JWT app_metadata for zero-query auth
      await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: userId });
      console.log(`Updated plan for ${userId}: ${JSON.stringify(updates)}`);
    }

    // Track bundle if applicable
    if (prefix.startsWith("bundle_")) {
      await supabase.from("active_bundles").upsert(
        {
          user_id: userId,
          user_email: userEmail,
          bundle_key: prefix,
          subscription_id: subId,
          status: "active",
        },
        { onConflict: "user_id,bundle_key" }
      );
    }

    // Log purchase event
    await supabase.from("purchase_events").insert({
      user_id: userId,
      user_email: userEmail,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string || null,
      product_key: productKey,
      lookup_key: lookupKey,
      amount_paid: session.amount_total || 0,
      currency: currency,
      tokens_credited: 0,
      status: "completed",
      metadata: {
        mode: session.mode,
        subscription_id: subId,
        plan_key: prefix,
        stripe_lookup_key: stripeLookupKey,
        stripe_prefix: stripePrefix,
      },
    });
  }

  // ── One-time payment (Token packs, Add-ons) ──
  if (session.mode === "payment") {
    const tokenAmount = TOKEN_CREDITS[prefix] || 0;

    if (tokenAmount > 0) {
      // Atomic credit via Postgres RPC — SELECT ... FOR UPDATE inside
      const { data: creditResult, error: creditErr } = await supabase.rpc(
        "credit_tokens_atomic",
        {
          p_user_id: userId,
          p_amount: tokenAmount,
          p_type: "purchase",
          p_description: `Token pack: ${prefix} (${lookupKey})`,
          p_metadata: JSON.stringify({
            stripe_session_id: session.id,
            lookup_key: lookupKey,
            stripe_lookup_key: stripeLookupKey,
          }),
        }
      );

      if (creditErr) {
        console.error(`credit_tokens_atomic error for ${userId}:`, creditErr.message);
      } else {
        console.log(`Credited ${tokenAmount} tokens to ${userId}. New balance: ${creditResult?.balance}`);
      }
    }

    if (prefix.startsWith("addon_")) {
      const addonId = prefix.replace("addon_", "");
      await supabase.from("addons_purchased").insert({
        user_id: userId,
        user_email: userEmail,
        addon_id: addonId,
        price_paid: (session.amount_total || 0) / 100,
        currency: currency,
        status: "active",
        metadata: { stripe_session_id: session.id, lookup_key: lookupKey, stripe_lookup_key: stripeLookupKey },
      });
      console.log(`Addon ${addonId} activated for ${userId}`);
    }

    // ── Icon purchases (icons_single_* / icons_pack_*) → record ──
    // Without this row, the buyer has no trace of what they purchased on
    // their profile and the platform has no way to surface a deliverable.
    if (prefix.startsWith("icons_")) {
      const meta = (session.metadata || {}) as Record<string, string>;
      await supabase.from("addons_purchased").insert({
        user_id: userId,
        user_email: userEmail,
        addon_id: prefix,
        price_paid: (session.amount_total || 0) / 100,
        currency: currency,
        status: "active",
        metadata: {
          stripe_session_id: session.id,
          lookup_key: lookupKey,
          stripe_lookup_key: stripeLookupKey,
          icon_id: meta.icon_id || null,
          icon_label: meta.icon_label || null,
          icon_path: meta.icon_path || null,
          icon_collection: meta.icon_collection || null,
          tier: prefix.replace(/^icons_(single|pack)_/, ""),
          kind: prefix.startsWith("icons_single_") ? "single" : "pack",
        },
      });
      console.log(`Icon purchase ${prefix} recorded for ${userId}`);
    }

    // ── Kit purchases → record addon + auto-create Builder project ──
    if (prefix.startsWith("kit_") || prefix.startsWith("pf_")) {
      const addonId = prefix === "pf_white_label" ? "pf_white_label" : prefix;
      // Record as addon purchase
      await supabase.from("addons_purchased").insert({
        user_id: userId,
        user_email: userEmail,
        addon_id: addonId,
        price_paid: (session.amount_total || 0) / 100,
        currency: currency,
        status: "active",
        metadata: {
          stripe_session_id: session.id,
          lookup_key: lookupKey,
          stripe_lookup_key: stripeLookupKey,
          stripe_prefix: stripePrefix,
        },
      });

      // Auto-create a Builder project with the kit's preset
      const presetMap: Record<string, string> = {
        kit_landing_express: "saas",
        kit_landing_express_personal: "saas",
        kit_landing_express_commercial: "saas",
        kit_landing_express_studio: "saas",
        kit_portfolio_personal: "portfolio",
        kit_portfolio_commercial: "portfolio",
        kit_portfolio_studio: "portfolio",
        kit_agency_personal: "agency",
        kit_agency_commercial: "agency",
        kit_agency_studio: "agency",
        kit_saas_personal: "saas",
        kit_saas_commercial: "saas",
        kit_saas_studio: "saas",
      };

      const presetId = presetMap[prefix];
      if (presetId) {
        try {
          // Fetch preset data from the public presets.json
          const presetsRes = await fetch("https://volynx.world/builder/presets.json");
          if (presetsRes.ok) {
            const presetsData = await presetsRes.json();
            const preset = presetsData.presets?.find((p: any) => p.id === presetId);
            if (preset?.data) {
              const slug = `${presetId}-${Date.now().toString(36)}`;
              await supabase.from("projects").insert({
                user_id: userId,
                name: `${preset.name} Kit — ${new Date().toLocaleDateString("en-GB")}`,
                slug: slug,
                builder_data: preset.data,
                status: "draft",
                domain_type: "subdomain",
              });
              console.log(`Auto-created Builder project '${slug}' for ${userId} from kit ${prefix}`);
            }
          }
        } catch (e) {
          console.error(`Failed to auto-create project for kit ${prefix}:`, (e as Error).message);
        }
      }

      console.log(`Kit purchase ${prefix} activated for ${userId}`);
    }

    await supabase.from("purchase_events").insert({
      user_id: userId,
      user_email: userEmail,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string || null,
      product_key: productKey,
      lookup_key: lookupKey,
      amount_paid: session.amount_total || 0,
      currency: currency,
      tokens_credited: tokenAmount,
      status: "completed",
      metadata: {
        mode: session.mode,
        stripe_lookup_key: stripeLookupKey,
        stripe_prefix: stripePrefix,
      },
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
    const downgrades = PLAN_DOWNGRADE_MAP[prefix] || {};

    if (Object.keys(downgrades).length > 0) {
      await supabase.from("profiles").update(downgrades).eq("id", user_id);
    }

    // Mark bundle as canceled
    if (prefix.startsWith("bundle_")) {
      await supabase.from("active_bundles")
        .update({ status: "canceled" })
        .eq("user_id", user_id)
        .eq("bundle_key", prefix);
    }

    // Check if user has any other active subscriptions before downgrading global plan
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .neq("stripe_subscription_id", subscription.id);

    if (!activeSubs || activeSubs.length === 0) {
      await supabase.from("profiles").update({ plan: "free" }).eq("id", user_id);
    }

    // Sync downgraded plan to JWT app_metadata
    await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: user_id });

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

  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  // Downgrade the specific product
  const prefix = plan_key || "";
  const downgrades = PLAN_DOWNGRADE_MAP[prefix] || {};

  if (Object.keys(downgrades).length > 0) {
    await supabase.from("profiles").update(downgrades).eq("id", user_id);
  }

  // Mark bundle as canceled
  if (prefix.startsWith("bundle_")) {
    await supabase.from("active_bundles")
      .update({ status: "canceled" })
      .eq("user_id", user_id)
      .eq("bundle_key", prefix);
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

  // Sync downgraded plan to JWT app_metadata
  await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: user_id });

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

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);

  const { data: subRecord } = await supabase
    .from("subscriptions")
    .select("user_id, plan_key")
    .eq("stripe_subscription_id", subId)
    .single();

  if (subRecord?.user_id) {
    const downgrades = PLAN_DOWNGRADE_MAP[subRecord.plan_key || ""] || {};
    if (Object.keys(downgrades).length > 0) {
      await supabase.from("profiles").update(downgrades).eq("id", subRecord.user_id);
    }
    await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: subRecord.user_id });
  }

  console.log(`Invoice failed, subscription ${subId} marked past_due`);
}

async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  await supabase
    .from("purchase_events")
    .update({ status: "failed" })
    .eq("stripe_session_id", session.id);

  console.log(`Async payment failed for session ${session.id}`);
}

// ── HTTP Handler ────────────────────────────────────────────

serve(async (req: Request) => {
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

      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "checkout.session.async_payment_failed":
        await handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
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

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, (err as Error).message);
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
