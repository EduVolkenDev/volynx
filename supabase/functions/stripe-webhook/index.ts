/**
 * VOLYNX — Stripe Webhook Handler (Supabase Edge Function)
 *
 * Multi-product aware: handles volynx, daily, bundle, and legacy builder_ prefixes.
 * Must be deployed with verify_jwt: false (Stripe doesn't send JWTs).
 *
 * Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
 *   STRIPE_SECRET_KEY        — sk_live_ in production
 *   STRIPE_WEBHOOK_SECRET    — live whsec_ from Stripe Dashboard in production
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

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

function isProductionOrigin(origin: string): boolean {
  return /^https:\/\/(www\.)?volynx\.world\b/i.test(origin);
}

function shouldBlockTestStripeKey(stripeKey: string): boolean {
  return isProductionOrigin(FRONTEND_ORIGIN) && stripeKey.startsWith("sk_test_");
}

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2026-02-25.clover" as any,
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

function requireDbSuccess<T>(
  label: string,
  result: { data: T | null; error: { message?: string } | null },
): T | null {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message || "database operation failed"}`);
  }
  return result.data;
}

function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function builderSlugExists(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .limit(1);
  if (error) {
    console.warn(`Builder slug availability check failed for '${slug}': ${error.message}`);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

async function nextBuilderSlug(base: string): Promise<string> {
  const root = (slugify(base) || "site").slice(0, 48).replace(/-$/g, "") || "site";
  if (!(await builderSlugExists(root))) return root;

  for (let i = 2; i <= 50; i++) {
    const suffix = `-${i}`;
    const candidate = root.slice(0, 63 - suffix.length).replace(/-$/g, "") + suffix;
    if (!(await builderSlugExists(candidate))) return candidate;
  }

  return `${root.slice(0, 58).replace(/-$/g, "")}-${crypto.randomUUID().slice(0, 4)}`;
}

function isBuilderSlugConflict(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "23505" || (message.includes("duplicate") && message.includes("slug"));
}

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

  // CVitae
  cvitae_business: { cvitae_plan: "business", plan: "pro" },

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
  cvitae_business: { cvitae_plan: "free" },
  bundle_volynx_daily_pro:    { builder_plan: "free", daily_plan: "free" },
  bundle_volynx_daily_studio: { builder_plan: "free", daily_plan: "free" },
  builder_launch: { builder_plan: "free" },
  builder_pro:    { builder_plan: "free" },
  builder_studio: { builder_plan: "free" },
  builder_teams:  { builder_plan: "free" },
  studio_pro:     { builder_plan: "free" },
};

const PLAN_RANK: Record<string, number> = {
  free: 0,
  launch: 1,
  business: 2,
  pro: 2,
  diamond: 2,
  studio: 3,
  teams: 4,
};

function mergeHighestPlan(
  updates: Record<string, string>,
  candidate: Record<string, string>,
): void {
  for (const [field, value] of Object.entries(candidate)) {
    if (field === "plan") {
      if (value === "pro") updates.plan = "pro";
      continue;
    }
    const current = updates[field] || "free";
    if ((PLAN_RANK[value] ?? 0) > (PLAN_RANK[current] ?? 0)) {
      updates[field] = value;
    }
  }
}

async function syncUserSubscriptionEntitlements(userId: string): Promise<void> {
  const activeSubscriptions = requireDbSuccess(
    "load active subscriptions",
    await supabase
      .from("subscriptions")
      .select("plan_key,status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]),
  ) || [];

  const updates: Record<string, string> = {
    plan: "free",
    builder_plan: "free",
    daily_plan: "free",
    cvitae_plan: "free",
  };

  for (const subscription of activeSubscriptions as Array<{ plan_key?: string | null }>) {
    const planUpdates = PLAN_PROFILE_MAP[subscription.plan_key || ""];
    if (planUpdates) mergeHighestPlan(updates, planUpdates);
  }

  requireDbSuccess(
    "sync subscription entitlements to profile",
    await supabase.from("profiles").update(updates).eq("id", userId),
  );
  requireDbSuccess(
    "sync subscription entitlements to app metadata",
    await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: userId }),
  );
}

// Product key detection from prefix
function detectProductKey(prefix: string): string {
  if (prefix.startsWith("bundle_")) return "bundle";
  if (prefix.startsWith("daily_")) return "daily";
  if (prefix.startsWith("cvitae_")) return "cvitae";
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

// ── Email dispatch helper ──────────────────────────────────
// Fire-and-forget queueing into email_log. The send-purchase-email function
// is invoked after the row exists, so even if the HTTP call cold-starts past
// the webhook's response window, the pending row remains for a future retry
// (cron worker, manual replay, etc.).

const SUPABASE_URL_SELF = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_SELF = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type EmailEventType =
  | "tokens_credited"
  | "plan_activated"
  | "bundle_activated"
  | "voucher_redeemed"
  | "propertyflow_ready"
  | "addon_activated"
  | "kit_delivered"
  | "icons_delivered"
  | "cvitae_template_unlocked";

async function queueEmail(args: {
  event_type: EmailEventType;
  user_id: string;
  recipient_email: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  // Insert pending row first; capture the id so the dispatcher can process
  // the *same* row instead of trying to insert a duplicate (which would hit
  // the unique idempotency_key index, return "skipped", and leave the row
  // forever pending).
  let logId: string | null = null;
  try {
    const { data: inserted, error } = await supabase
      .from("email_log")
      .insert({
        user_id: args.user_id,
        event_type: args.event_type,
        idempotency_key: args.idempotency_key,
        recipient_email: args.recipient_email || "pending",
        payload: args.payload,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        // Duplicate idempotency_key — already queued/sent on a previous
        // webhook delivery, nothing else to do.
        return;
      }
      console.error(`email_log insert error (${args.event_type}):`, error.message);
      return;
    }
    logId = inserted?.id || null;
  } catch (e) {
    console.error(`email_log insert threw (${args.event_type}):`, (e as Error).message);
    return;
  }

  if (!logId) return;

  // Fire-and-forget dispatch by id — dispatcher fetches the pending row,
  // calls Resend, and updates status. No race on the unique index.
  fetch(`${SUPABASE_URL_SELF}/functions/v1/send-purchase-email`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE_SELF}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_log_id: logId }),
  }).catch((e) => {
    console.error(`send-purchase-email dispatch failed (${args.event_type}):`, (e as Error).message);
  });
}

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

function getKitStorageSlug(prefix: string): string | null {
  if (prefix.startsWith("kit_portfolio")) return "portfolio";
  if (prefix.startsWith("kit_agency")) return "agency";
  if (prefix.startsWith("kit_saas") || prefix.startsWith("kit_landing_express")) return "saas";
  return null;
}

function getKitStorageTier(tier: string | null): string | null {
  if (!tier) return null;
  const map: Record<string, string> = {
    personal: "starter",
    commercial: "pro",
    studio: "studio",
  };
  return map[tier] || null;
}

function normalizeInternalKitPrefix(prefix: string): string {
  return prefix.endsWith("_e2e") ? prefix.replace(/_e2e$/, "") : prefix;
}

function isLikelyMissingStorageAsset(message: string | null): boolean {
  return /not found|does not exist|404|no such object|object not found|failed to find/i.test(String(message || ""));
}

const ICONS_BUCKET = "icons";
const ICONS_VERSION = "v1.0.1";
const ICONS_SIGNED_URL_TTL = 60 * 60 * 24; // 24h

function safeFilename(value: string | null | undefined, fallback = "volynx-icon.webp"): string {
  const file = String(value || fallback).split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || fallback;
  return file.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 120) || fallback;
}

function resolveIconDeliveryPath(prefix: string, meta: Record<string, string>): { path: string | null; filename: string | null } {
  const isPack = prefix.startsWith("icons_pack_");
  if (isPack) {
    const collection = String(meta.icon_collection || "").trim();
    if (!collection) return { path: null, filename: null };
    if (collection === "__all_premium__") {
      return {
        path: `${ICONS_VERSION}/packs/full-premium-combo.zip`,
        filename: "volynx-full-premium-icon-combo.zip",
      };
    }
    const slug = slugify(collection);
    return {
      path: `${ICONS_VERSION}/packs/${slug}.zip`,
      filename: `${slug || "volynx-icons-pack"}.zip`,
    };
  }

  const iconId = String(meta.icon_id || "").trim();
  const iconPath = String(meta.icon_path || "").trim();
  if (!iconId || !iconPath || iconPath.includes("..")) return { path: null, filename: null };
  const filename = safeFilename(iconPath);
  return {
    path: `${ICONS_VERSION}/singles/${slugify(iconId)}/${filename}`,
    filename,
  };
}

async function signIconDelivery(prefix: string, meta: Record<string, string>) {
  const resolved = resolveIconDeliveryPath(prefix, meta);
  if (!resolved.path) {
    return {
      ...resolved,
      url: null,
      expiresAt: null,
      status: "manual_review",
      error: "missing_icon_delivery_metadata",
    };
  }

  try {
    const { data: signed, error } = await supabase.storage
      .from(ICONS_BUCKET)
      .createSignedUrl(resolved.path, ICONS_SIGNED_URL_TTL);
    if (error || !signed?.signedUrl) {
      return {
        ...resolved,
        url: null,
        expiresAt: null,
        status: isLikelyMissingStorageAsset(error?.message || null) ? "missing_storage_asset" : "pending_signed_url",
        error: error?.message || "missing_signed_url",
      };
    }
    return {
      ...resolved,
      url: signed.signedUrl,
      expiresAt: new Date(Date.now() + ICONS_SIGNED_URL_TTL * 1000).toISOString(),
      status: "ready",
      error: null,
    };
  } catch (e) {
    const message = (e as Error).message;
    return {
      ...resolved,
      url: null,
      expiresAt: null,
      status: isLikelyMissingStorageAsset(message) ? "missing_storage_asset" : "pending_signed_url",
      error: message,
    };
  }
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

  const existingPurchase = requireDbSuccess(
    "check purchase idempotency",
    await supabase
      .from("purchase_events")
      .select("id,status")
      .eq("stripe_session_id", session.id)
      .maybeSingle(),
  );

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
  const userProfile = requireDbSuccess(
    "load purchaser profile",
    await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single(),
  );
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
    requireDbSuccess("upsert subscription", await supabase.from("subscriptions").upsert(
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
    ));

    // Update user profile with plan
    const profileUpdates = PLAN_PROFILE_MAP[prefix];
    if (profileUpdates) {
      const updates: Record<string, any> = {
        ...profileUpdates,
        stripe_customer_id: session.customer as string,
      };

      requireDbSuccess(
        "activate subscription plan",
        await supabase.from("profiles").update(updates).eq("id", userId),
      );
      // Sync plan to JWT app_metadata for zero-query auth
      requireDbSuccess(
        "sync activated plan to app metadata",
        await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: userId }),
      );
      console.log(`Updated plan for ${userId}: ${JSON.stringify(updates)}`);
    }

    // Track bundle if applicable
    if (prefix.startsWith("bundle_")) {
      requireDbSuccess("activate bundle", await supabase.from("active_bundles").upsert(
        {
          user_id: userId,
          user_email: userEmail,
          bundle_key: prefix,
          subscription_id: subId,
          status: "active",
        },
        { onConflict: "user_id,bundle_key" }
      ));
    }

    // Subscription add-ons (currently only addon_extra_slot). Each renewal
    // ticks through this path; we keep one active row per (user, addon, sub)
    // so the slot counter stays accurate even across reactivations.
    if (prefix.startsWith("addon_")) {
      const addonId = prefix.replace(/^addon_/, "");
      const existing = requireDbSuccess(
        "check subscription addon idempotency",
        await supabase
          .from("addons_purchased")
          .select("id")
          .eq("user_id", userId)
          .eq("addon_id", addonId)
          .eq("metadata->>stripe_subscription_id", subId || "")
          .maybeSingle(),
      );
      if (!existing) {
        requireDbSuccess("activate subscription addon", await supabase.from("addons_purchased").insert({
          user_id: userId,
          addon_id: addonId,
          price_paid: (session.amount_total || 0) / 100,
          currency: currency,
          status: "active",
          metadata: {
            stripe_session_id: session.id,
            stripe_subscription_id: subId,
            lookup_key: lookupKey,
            stripe_lookup_key: stripeLookupKey,
            stripe_prefix: stripePrefix,
            billing: "subscription",
          },
        }));
        console.log(`Subscription addon ${addonId} activated for ${userId} (sub ${subId})`);
      }
    }

    // Log purchase event
    const subscriptionPurchaseEvent = await supabase.from("purchase_events").insert({
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
    if (subscriptionPurchaseEvent.error?.code === "23505") {
      console.log(`Subscription purchase event already recorded for session ${session.id} — skip`);
    } else {
      requireDbSuccess("record subscription purchase event", subscriptionPurchaseEvent);
    }

    // Notify the buyer — bundle gets its own template, single-product subs
    // get plan_activated.
    if (prefix.startsWith("bundle_")) {
      const bundleProducts = (PLAN_PROFILE_MAP[prefix] && Object.keys(PLAN_PROFILE_MAP[prefix]).filter(k => k.endsWith("_plan"))) || [];
      await queueEmail({
        event_type: "bundle_activated",
        user_id: userId,
        recipient_email: userEmail,
        idempotency_key: session.id,
        payload: {
          bundle_label: prefix,
          products: bundleProducts.map(k => {
            const p = k.replace(/_plan$/, "");
            const url = p === "daily" ? "https://daily.volynx.world/"
              : p === "cvitae" ? "https://cvitae.volynx.world/"
              : "https://volynx.world/builder/";
            return { name: p, url };
          }),
        },
      });
    } else if (PLAN_PROFILE_MAP[prefix]) {
      const productKeyForEmail = prefix.startsWith("daily_") ? "daily"
        : prefix.startsWith("cvitae_") ? "cvitae"
        : "volynx";
      await queueEmail({
        event_type: "plan_activated",
        user_id: userId,
        recipient_email: userEmail,
        idempotency_key: session.id,
        payload: {
          plan_name: prefix,
          product: productKeyForEmail,
          features: [],
        },
      });
    }
  }

  // ── One-time payment (Token packs, Add-ons) ──
  if (session.mode === "payment") {
    const tokenAmount = TOKEN_CREDITS[prefix] || 0;

    if (tokenAmount > 0) {
      // Atomic credit via Postgres RPC — SELECT ... FOR UPDATE inside
      const { data: creditResult, error: creditErr } = await supabase.rpc(
        "credit_token_purchase_atomic",
        {
          p_user_id: userId,
          p_amount: tokenAmount,
          p_stripe_session_id: session.id,
          p_lookup_key: lookupKey,
          p_description: `Token pack: ${prefix} (${lookupKey})`,
        }
      );

      if (creditErr) {
        throw new Error(`credit_token_purchase_atomic error for ${userId}: ${creditErr.message}`);
      } else if (!creditResult?.ok) {
        throw new Error(`credit_token_purchase_atomic rejected purchase for ${userId}: ${creditResult?.error || "unknown error"}`);
      } else {
        console.log(`${creditResult?.duplicate ? "Skipped duplicate credit" : `Credited ${tokenAmount} tokens`} for ${userId}. New balance: ${creditResult?.balance}`);
        if (!creditResult?.duplicate) {
          await queueEmail({
            event_type: "tokens_credited",
            user_id: userId,
            recipient_email: userEmail,
            idempotency_key: session.id,
            payload: {
              tokens: tokenAmount,
              new_balance: creditResult?.balance ?? null,
              pack_name: prefix,
            },
          });
        }
      }
    }

    if (prefix.startsWith("addon_")) {
      const addonId = prefix.replace(/^addon_/, "");

      // Idempotency: Stripe can retry the same checkout.session.completed
      // event. Reject the second insert so a retry never double-grants.
      const existing = requireDbSuccess(
        "check one-time addon idempotency",
        await supabase
          .from("addons_purchased")
          .select("id")
          .eq("user_id", userId)
          .eq("metadata->>stripe_session_id", session.id)
          .maybeSingle(),
      );
      if (existing) {
        console.log(`Addon ${addonId} already recorded for session ${session.id} — skip`);
      } else {
        // Pull entitlement so the row carries the feature list inline. UI can
        // read either v_user_entitlements (joined) or this row directly.
        const { data: entitlement } = await supabase
          .from("addon_entitlements")
          .select("features, slot_delta, download_zip, billing")
          .eq("addon_id", addonId)
          .maybeSingle();

        requireDbSuccess("activate one-time addon", await supabase.from("addons_purchased").insert({
          user_id: userId,
          addon_id: addonId,
          price_paid: (session.amount_total || 0) / 100,
          currency: currency,
          status: "active",
          metadata: {
            stripe_session_id: session.id,
            lookup_key: lookupKey,
            stripe_lookup_key: stripeLookupKey,
            stripe_prefix: stripePrefix,
            billing: "one_time",
            features: entitlement?.features || [],
            slot_delta: entitlement?.slot_delta || 0,
            download_zip: entitlement?.download_zip || null,
            delivery_status: entitlement?.download_zip ? "pending_download" : "ready",
          },
        }));
        console.log(`Addon ${addonId} activated for ${userId} (features: ${(entitlement?.features || []).join(",")})`);
        await queueEmail({
          event_type: "addon_activated",
          user_id: userId,
          recipient_email: userEmail,
          idempotency_key: session.id,
          payload: {
            addon_id: addonId,
            addon_name: addonId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            features: entitlement?.features || [],
          },
        });
      }
    }

    // ── Icon purchases (icons_single_* / icons_pack_*) → record ──
    // Without this row, the buyer has no trace of what they purchased on
    // their profile and the platform has no way to surface a deliverable.
    if (prefix.startsWith("icons_")) {
      const meta = (session.metadata || {}) as Record<string, string>;

      // Idempotency: Stripe retries (or async_payment_succeeded firing after
      // checkout.session.completed) would otherwise double-grant the row,
      // double-fire the icons_delivered email, and skew purchase_events.
      const existingIcon = requireDbSuccess(
        "check icon purchase idempotency",
        await supabase
          .from("addons_purchased")
          .select("id")
          .eq("user_id", userId)
          .eq("metadata->>stripe_session_id", session.id)
          .maybeSingle(),
      );
      if (existingIcon) {
        console.log(`Icon purchase ${prefix} already recorded for session ${session.id} — skip`);
      } else {
        const iconDelivery = await signIconDelivery(prefix, meta);
        if (iconDelivery.error) {
          console.error(`Icon delivery ${prefix} signing status=${iconDelivery.status}:`, iconDelivery.error);
        }
        requireDbSuccess("record icon purchase", await supabase.from("addons_purchased").insert({
          user_id: userId,
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
            download_bucket: ICONS_BUCKET,
            download_path: iconDelivery.path,
            download_filename: iconDelivery.filename,
            download_url: iconDelivery.url,
            download_expires_at: iconDelivery.expiresAt,
            download_version: ICONS_VERSION,
            delivery_status: iconDelivery.status,
            delivery_error: iconDelivery.error,
          },
        }));
        console.log(`Icon purchase ${prefix} recorded for ${userId}`);
        await queueEmail({
          event_type: "icons_delivered",
          user_id: userId,
          recipient_email: userEmail,
          idempotency_key: session.id,
          payload: {
            tier: prefix.replace(/^icons_(single|pack)_/, ""),
            kind: prefix.startsWith("icons_single_") ? "single" : "pack",
            session_id: session.id,
            signed_url: iconDelivery.url,
            expires_at: iconDelivery.expiresAt,
            delivery_status: iconDelivery.status,
          },
        });
      }
    }

    // ── Kit + PropertyFlow purchases → record addon + tier-aware delivery ──
    if (prefix.startsWith("kit_") || prefix.startsWith("pf_")) {
      const addonId = prefix === "pf_white_label" ? "pf_white_label" : prefix;
      const isPropertyFlow = prefix.startsWith("pf_");
      const isKit = prefix.startsWith("kit_");

      // Tier extracted from lookup_key suffix — used for delivery differentiation
      // and as the in-product license label (Starter / Pro / Studio for kits;
      // Starter / Professional / White-Label for PropertyFlow).
      const kitFulfillmentPrefix = isKit ? normalizeInternalKitPrefix(prefix) : prefix;
      const tierMatch = kitFulfillmentPrefix.match(/_(personal|commercial|studio|starter|professional|white_label)$/);
      const tier = tierMatch ? tierMatch[1] : null;
      const tierLabel = tier
        ? ({ personal: "Starter", commercial: "Pro", studio: "Studio",
             starter: "Starter", professional: "Professional", white_label: "White-Label" } as Record<string, string>)[tier] || tier
        : null;

      // PropertyFlow signed URL — minted before the addon row is written so the
      // download link is available in metadata from the very first read on
      // /delivery/. Failure is non-fatal: the row still inserts with
      // delivery_status=pending_signed_url and the user can hit "Refresh link"
      // (refresh-pf-url edge function) to retry.
      let pfDownloadUrl: string | null = null;
      let pfDownloadExpiresAt: string | null = null;
      let pfSignError: string | null = null;
      const PF_VERSION = "v1.1.0";
      const PF_SIGNED_URL_TTL = 60 * 60 * 24; // 24h
      if (isPropertyFlow) {
        const objectPath = `${addonId}/${PF_VERSION}.zip`;
        try {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from("propertyflow")
            .createSignedUrl(objectPath, PF_SIGNED_URL_TTL);
          if (signErr) {
            pfSignError = signErr.message;
          } else if (signed?.signedUrl) {
            pfDownloadUrl = signed.signedUrl;
            pfDownloadExpiresAt = new Date(Date.now() + PF_SIGNED_URL_TTL * 1000).toISOString();
          }
        } catch (e) {
          pfSignError = (e as Error).message;
        }
        if (pfSignError) {
          console.error(`PropertyFlow ${prefix} signed-url error for ${userId}: ${pfSignError}`);
        }
      }

      // Kit signed URL — these ZIPs are built in Volynx-OS/out/kits and then
      // uploaded to the "kits" bucket using {kit_slug}_{tier}/v1.0.0.zip.
      // Builder project creation remains as a secondary convenience path, but
      // ZIP delivery is now the primary fulfillment layer.
      let kitDownloadUrl: string | null = null;
      let kitDownloadExpiresAt: string | null = null;
      let kitDownloadError: string | null = null;
      let kitDownloadFilename: string | null = null;
      let kitDownloadPath: string | null = null;
      const KIT_VERSION = "v1.0.0";
      const KIT_SIGNED_URL_TTL = 60 * 60 * 24; // 24h
      const kitSlug = isKit ? getKitStorageSlug(kitFulfillmentPrefix) : null;
      const kitStorageTier = isKit ? getKitStorageTier(tier) : null;

      if (isKit && kitSlug && kitStorageTier) {
        kitDownloadPath = `${kitSlug}_${kitStorageTier}/${KIT_VERSION}.zip`;
        kitDownloadFilename = `${kitSlug}-${kitStorageTier}-${KIT_VERSION}.zip`;
        try {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from("kits")
            .createSignedUrl(kitDownloadPath, KIT_SIGNED_URL_TTL);
          if (signErr) {
            kitDownloadError = signErr.message;
          } else if (signed?.signedUrl) {
            kitDownloadUrl = signed.signedUrl;
            kitDownloadExpiresAt = new Date(Date.now() + KIT_SIGNED_URL_TTL * 1000).toISOString();
          }
        } catch (e) {
          kitDownloadError = (e as Error).message;
        }

        if (kitDownloadError) {
          console.error(`Kit ${prefix} signed-url error for ${userId}: ${kitDownloadError}`);
        }
      }

      const kitDeliveryStatus = isKit
        ? (
          kitDownloadUrl
            ? "ready"
            : isLikelyMissingStorageAsset(kitDownloadError)
              ? "missing_storage_asset"
              : "pending_signed_url"
        )
        : null;

      // Idempotency guard — Stripe retries (or async_payment_succeeded
      // firing after checkout.session.completed) would otherwise re-INSERT
      // the row on every redelivery and double-create the Builder project.
      const existingKitOrPf = requireDbSuccess(
        "check kit or PropertyFlow idempotency",
        await supabase
          .from("addons_purchased")
          .select("id, project_id, metadata")
          .eq("user_id", userId)
          .eq("metadata->>stripe_session_id", session.id)
          .maybeSingle(),
      );

      // Record as addon purchase (single source of truth for /delivery/).
      // For PF and kits, metadata carries delivery context on first insert.
      // Kits still receive a Builder project below as a secondary fallback.
      if (!existingKitOrPf) {
        requireDbSuccess("record kit or PropertyFlow purchase", await supabase.from("addons_purchased").insert({
          user_id: userId,
          addon_id: addonId,
          price_paid: (session.amount_total || 0) / 100,
          currency: currency,
          status: "active",
          metadata: {
            stripe_session_id: session.id,
            lookup_key: lookupKey,
            stripe_lookup_key: stripeLookupKey,
            stripe_prefix: stripePrefix,
            tier,
            tier_label: tierLabel,
            ...(isPropertyFlow ? {
              download_url: pfDownloadUrl,
              download_expires_at: pfDownloadExpiresAt,
              download_version: PF_VERSION,
              delivery_status: pfDownloadUrl ? "ready" : "pending_signed_url",
              delivery_error: pfSignError,
            } : isKit ? {
              kit_slug: kitSlug,
              zip_tier: kitStorageTier,
              download_bucket: "kits",
              download_path: kitDownloadPath,
              download_filename: kitDownloadFilename,
              download_url: kitDownloadUrl,
              download_expires_at: kitDownloadExpiresAt,
              download_version: KIT_VERSION,
              delivery_status: kitDeliveryStatus,
              delivery_error: kitDownloadError,
            } : {}),
          },
        }));
      } else {
        console.log(`Kit/PF purchase ${prefix} already recorded for session ${session.id} — skip insert`);
      }

      // Kit branch — auto-create a Builder project with the kit's preset.
      // PropertyFlow does NOT use presets (it ships as a ZIP) so it skips this.
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

      const presetId = presetMap[kitFulfillmentPrefix];
      const existingDeliveryMetadata = (existingKitOrPf?.metadata || {}) as Record<string, unknown>;
      let projectSlug: string | null = typeof existingDeliveryMetadata.project_slug === "string"
        ? existingDeliveryMetadata.project_slug
        : null;
      let projectIdCreated: string | null = existingKitOrPf?.project_id
        || (typeof existingDeliveryMetadata.project_id === "string" ? existingDeliveryMetadata.project_id : null);
      let presetFetchError: string | null = null;
      const shouldUpdateKitMetadata = !existingKitOrPf || !projectIdCreated;

      // Recover a project created before a previous webhook attempt stopped
      // between the project insert and the addon metadata update.
      if (presetId && !projectIdCreated) {
        const existingProject = requireDbSuccess(
          "recover kit project by Stripe session",
          await supabase
            .from("projects")
            .select("id, slug")
            .eq("user_id", userId)
            .eq("metadata->>stripe_session_id", session.id)
            .maybeSingle(),
        );
        if (existingProject) {
          projectIdCreated = existingProject.id;
          projectSlug = existingProject.slug;
        }
      }

      if (presetId && !projectIdCreated) {
        try {
          const presetsRes = await fetch("https://volynx.world/builder/presets.json");
          if (!presetsRes.ok) {
            presetFetchError = `presets.json HTTP ${presetsRes.status}`;
          } else {
            const presetsData = await presetsRes.json();
            const preset = presetsData.presets?.find((p: any) => p.id === presetId);
            if (!preset?.data) {
              presetFetchError = `preset '${presetId}' not found in presets.json`;
            } else {
              const projectName = tierLabel
                ? `${preset.name} Kit — ${tierLabel}`
                : `${preset.name} Kit — ${new Date().toLocaleDateString("en-GB")}`;
              const baseProjectSlug = presetId;
              let insertedProject: any = null;
              for (let attempt = 1; attempt <= 5; attempt++) {
                projectSlug = await nextBuilderSlug(attempt === 1 ? baseProjectSlug : `${baseProjectSlug}-${attempt}`);
                const { data, error } = await supabase
                  .from("projects")
                  .insert({
                    user_id: userId,
                    name: projectName,
                    slug: projectSlug,
                    builder_data: preset.data,
                    status: "draft",
                    domain_type: "subdomain",
                    metadata: {
                      source_kit: addonId,
                      preset_id: presetId,
                      tier,
                      tier_label: tierLabel,
                      stripe_session_id: session.id,
                    },
                  })
                  .select("id")
                  .single();

                if (!error) {
                  insertedProject = data;
                  break;
                }
                if (!isBuilderSlugConflict(error)) throw error;
              }
              // Capture the project UUID so the email CTA can deep-link directly
              // into /builder/?project={uuid} and skip the empty-editor confusion.
              projectIdCreated = insertedProject?.id || null;
              if (!projectIdCreated) {
                presetFetchError = `could not reserve a clean Builder slug for '${presetId}'`;
                projectSlug = null;
              } else {
                console.log(`Auto-created Builder project '${projectSlug}' (${tierLabel || "unknown tier"}) for ${userId} from kit ${prefix}`);
              }
            }
          }
        } catch (e) {
          presetFetchError = (e as Error).message;
        }
      }

      if (presetId && shouldUpdateKitMetadata) {
        requireDbSuccess("update kit delivery metadata", await supabase
          .from("addons_purchased")
          .update({
            project_id: projectIdCreated,
            metadata: {
              stripe_session_id: session.id,
              lookup_key: lookupKey,
              stripe_lookup_key: stripeLookupKey,
              stripe_prefix: stripePrefix,
              tier,
              tier_label: tierLabel,
              kit_slug: kitSlug,
              zip_tier: kitStorageTier,
              download_bucket: "kits",
              download_path: kitDownloadPath,
              download_filename: kitDownloadFilename,
              download_url: kitDownloadUrl,
              download_expires_at: kitDownloadExpiresAt,
              download_version: KIT_VERSION,
              delivery_status: kitDeliveryStatus,
              delivery_error: kitDownloadError,
              project_id: projectIdCreated,
              project_slug: projectSlug,
              preset_id: presetId,
              project_delivery_status: projectIdCreated ? "ready" : "pending_preset_fetch",
              project_delivery_error: presetFetchError,
            },
          })
          .eq("user_id", userId)
          .eq("addon_id", addonId)
          .eq("metadata->>stripe_session_id", session.id));
      }

      if (presetFetchError) {
        console.error(`Kit ${prefix} for ${userId}: preset fetch failed — ${presetFetchError}`);
      }

      console.log(`${isPropertyFlow ? "PropertyFlow" : "Kit"} purchase ${prefix} activated for ${userId}`);

      if (isPropertyFlow) {
        await queueEmail({
          event_type: "propertyflow_ready",
          user_id: userId,
          recipient_email: userEmail,
          idempotency_key: session.id,
          payload: {
            tier,
            tier_label: tierLabel,
            session_id: session.id,
            signed_url: pfDownloadUrl,
            expires_at: pfDownloadExpiresAt,
          },
        });
      } else if (presetId) {
        const kitDisplayName = ({
          agency: "Agency Launch Kit",
          portfolio: "Portfolio Pro Kit",
          saas: "SaaS Landing System",
        } as Record<string, string>)[presetId] || "Kit";
        await queueEmail({
          event_type: "kit_delivered",
          user_id: userId,
          recipient_email: userEmail,
          idempotency_key: session.id,
          payload: {
            kit_name: kitDisplayName,
            tier,
            tier_label: tierLabel,
            session_id: session.id,
            project_id: projectIdCreated,
            project_slug: projectSlug,
            preset_id: presetId,
            download_url: kitDownloadUrl,
          },
        });
      }
    }

    const oneTimePurchaseEvent = await supabase.from("purchase_events").insert({
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
    if (oneTimePurchaseEvent.error?.code === "23505") {
      console.log(`One-time purchase event already recorded for session ${session.id} — skip`);
    } else {
      requireDbSuccess("record one-time purchase event", oneTimePurchaseEvent);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subRecord = requireDbSuccess(
    "load subscription for update",
    await supabase
      .from("subscriptions")
      .select("user_id, plan_key")
      .eq("stripe_subscription_id", subscription.id)
      .single(),
  );

  if (!subRecord) {
    console.error(`subscription.updated: no record for ${subscription.id}`);
    return;
  }

  const { user_id, plan_key: oldPlanKey } = subRecord as { user_id: string; plan_key?: string | null };
  const price = subscription.items.data[0]?.price;
  const priceLookupKey = price?.lookup_key || subscription.metadata?.lookup_key || "";
  const nextPlanKey = canonicalizeLookupPrefix(
    priceLookupKey ? extractPrefix(priceLookupKey) : (subscription.metadata?.plan_key || oldPlanKey || ""),
  );

  requireDbSuccess(
    "update subscription lifecycle",
    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        price_id: price?.id || null,
        plan_key: nextPlanKey || oldPlanKey,
        lookup_key: priceLookupKey ? canonicalizeLookupKey(priceLookupKey) : undefined,
        product_key: nextPlanKey ? detectProductKey(nextPlanKey) : undefined,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq("stripe_subscription_id", subscription.id),
  );

  if (oldPlanKey?.startsWith("bundle_") && oldPlanKey !== nextPlanKey) {
    requireDbSuccess(
      "deactivate replaced bundle",
      await supabase.from("active_bundles")
        .update({ status: "canceled" })
        .eq("user_id", user_id)
        .eq("bundle_key", oldPlanKey),
    );
  }

  await syncUserSubscriptionEntitlements(user_id);
  console.log(`Subscription ${subscription.id} synced as ${nextPlanKey || oldPlanKey} (${subscription.status}) for user ${user_id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subRecord = requireDbSuccess(
    "load deleted subscription",
    await supabase
      .from("subscriptions")
      .select("user_id, plan_key")
      .eq("stripe_subscription_id", subscription.id)
      .single(),
  );

  if (!subRecord) return;

  const { user_id, plan_key } = subRecord as { user_id: string; plan_key?: string | null };

  requireDbSuccess(
    "mark subscription canceled",
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscription.id),
  );

  // Mark bundle as canceled
  const prefix = plan_key || "";
  if (prefix.startsWith("bundle_")) {
    requireDbSuccess(
      "cancel active bundle",
      await supabase.from("active_bundles")
        .update({ status: "canceled" })
        .eq("user_id", user_id)
        .eq("bundle_key", prefix),
    );
  }

  // Subscription add-ons (e.g. addon_extra_slot) — flip the matching addon
  // row to canceled so v_user_entitlements stops returning it. We don't
  // unpublish overflow sites here; that's a soft-cap concern handled by the
  // Builder UI when the user next opens it.
  if (prefix.startsWith("addon_")) {
    const addonId = prefix.replace(/^addon_/, "");
    requireDbSuccess("cancel subscription addon", await supabase
      .from("addons_purchased")
      .update({ status: "canceled" })
      .eq("user_id", user_id)
      .eq("addon_id", addonId)
      .eq("metadata->>stripe_subscription_id", subscription.id));
    console.log(`Subscription addon ${addonId} canceled for ${user_id} (sub ${subscription.id})`);
  }

  await syncUserSubscriptionEntitlements(user_id);

  console.log(`Subscription deleted: ${subscription.id}, user ${user_id} downgraded`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // For one-time add-ons, the corresponding addons_purchased row carries the
  // originating session_id in metadata. Match against that and flip the row
  // to refunded so v_user_entitlements stops returning the feature. Already-
  // downloaded ZIPs cannot be revoked — the signed URL refresh endpoint will
  // 403 on next call because status != 'active'.
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId) {
    console.log(`Refund event without payment_intent — skipping`);
    return;
  }

  // purchase_events stores the payment_intent_id we wrote at purchase time;
  // join through it to find the session_id that the addon row references.
  const pe = requireDbSuccess(
    "load purchase event for refund",
    await supabase
      .from("purchase_events")
      .select("user_id, stripe_session_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle(),
  );

  if (!pe?.stripe_session_id) {
    console.log(`No purchase_events row for payment_intent ${paymentIntentId}`);
    return;
  }

  const addons = requireDbSuccess(
    "revoke refunded add-ons",
    await supabase
      .from("addons_purchased")
      .update({ status: "refunded" })
      .eq("user_id", pe.user_id)
      .eq("metadata->>stripe_session_id", pe.stripe_session_id)
      .select("id, addon_id"),
  );

  if (addons && addons.length > 0) {
    console.log(`Refund for ${pe.user_id}: ${addons.length} addon(s) revoked — ${addons.map(a => a.addon_id).join(", ")}`);
  }
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subId);

  requireDbSuccess(
    "record successful invoice",
    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", subId),
  );

  console.log(`Invoice paid, subscription ${subId} renewed`);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  requireDbSuccess(
    "mark subscription past due",
    await supabase
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("stripe_subscription_id", subId),
  );

  const subRecord = requireDbSuccess(
    "load past-due subscription",
    await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subId)
      .single(),
  );

  if (subRecord?.user_id) {
    await syncUserSubscriptionEntitlements(subRecord.user_id);
  }

  console.log(`Invoice failed, subscription ${subId} marked past_due`);
}

async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  requireDbSuccess(
    "mark async payment failed",
    await supabase
      .from("purchase_events")
      .update({ status: "failed" })
      .eq("stripe_session_id", session.id),
  );

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

  if (!STRIPE_KEY || shouldBlockTestStripeKey(STRIPE_KEY)) {
    console.error("[stripe-webhook] blocked non-live Stripe key on production origin");
    return new Response("Live Stripe webhook is not configured", { status: 500 });
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

      case "charge.refunded":
      case "charge.dispute.closed":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Return 500 so Stripe retries with backoff. Returning 200 here marked
    // the event "delivered" and the customer's purchase was silently lost
    // on any transient DB outage. The handler branches above are now
    // idempotent so retries are safe.
    console.error(`Error handling ${event.type}:`, (err as Error).message);
    return new Response(JSON.stringify({ received: false, error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
