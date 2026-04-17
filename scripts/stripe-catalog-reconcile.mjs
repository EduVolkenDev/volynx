#!/usr/bin/env node
/**
 * VOLYNX Stripe catalog reconciler.
 *
 * Source of truth lives here: products, lookup keys, currencies, amounts,
 * and recurring/payment mode. The script is idempotent:
 * - creates missing products
 * - creates missing prices with lookup_key
 * - when an existing lookup_key has the wrong amount/type, creates a new
 *   price and transfers the lookup_key to it
 * - deactivates stale mismatched prices after the lookup_key transfer
 *
 * Usage:
 *   node scripts/stripe-catalog-reconcile.mjs --dry-run
 *   node scripts/stripe-catalog-reconcile.mjs --apply
 *   node scripts/stripe-catalog-reconcile.mjs --apply --live
 */

import Stripe from "stripe";
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env"), quiet: true });

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const REQUIRE_LIVE = args.has("--live");
const DRY_RUN = !APPLY;

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
if (!STRIPE_KEY.startsWith("sk_test_") && !STRIPE_KEY.startsWith("sk_live_")) {
  console.error("STRIPE_SECRET_KEY is missing or invalid. Put it in scripts/.env.");
  process.exit(1);
}

const mode = STRIPE_KEY.startsWith("sk_live_") ? "live" : "test";
if (REQUIRE_LIVE && mode !== "live") {
  console.error("--live was requested, but scripts/.env does not contain an sk_live_ key.");
  process.exit(1);
}

if (mode === "live" && !APPLY) {
  console.log("LIVE key detected. Running dry-run only. Add --apply --live to change live catalog.");
}

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2026-02-25.clover",
});

const currencies = ["gbp", "eur", "brl"];

const catalog = [
  {
    name: "Builder Launch",
    description: "Entry plan to launch lean pages quickly. 1 published site on volynx.world subdomain.",
    lookupPrefix: "builder_launch",
    family: "builder",
    tier: "launch",
    recurring: "month",
    amounts: { gbp: 900, eur: 1090, brl: 5900 },
  },
  {
    name: "Builder Pro",
    description: "Best balance of publish, custom domain, and premium presentation. Anchor plan.",
    lookupPrefix: "builder_pro",
    family: "builder",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 1900, eur: 2290, brl: 12900 },
  },
  {
    name: "Builder Studio",
    description: "For creators, freelancers, and small studios publishing frequently.",
    lookupPrefix: "builder_studio",
    family: "builder",
    tier: "studio",
    recurring: "month",
    amounts: { gbp: 3900, eur: 4590, brl: 24900 },
  },
  {
    name: "Builder Teams",
    description: "Workspace for team operations with central billing and shared assets.",
    lookupPrefix: "builder_teams",
    family: "builder",
    tier: "teams",
    recurring: "month",
    amounts: { gbp: 7900, eur: 8990, brl: 49900 },
  },
  {
    name: "Studio Pro",
    description: "Full production pipeline in the browser. Unlimited tools, batch processing, commercial rights.",
    lookupPrefix: "studio_pro",
    family: "studio",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 1900, eur: 2290, brl: 12900 },
  },
  {
    name: "Daily Pro",
    description: "Full access to VOLYNX Daily tools: Scanner, Summary, Vault, Writing, Decision with cloud sync and exports.",
    lookupPrefix: "daily_pro",
    family: "daily",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 1200, eur: 1490, brl: 8900 },
  },
  {
    name: "Daily Diamond",
    description: "Premium Daily tier with API access, shared vaults, team notes, analytics and priority everything.",
    lookupPrefix: "daily_diamond",
    family: "daily",
    tier: "diamond",
    recurring: "month",
    amounts: { gbp: 2900, eur: 3490, brl: 19900 },
  },
  {
    name: "VOLYNX + Daily Pro Bundle",
    description: "Builder Pro + Daily Pro in one subscription. Save vs buying separately.",
    lookupPrefix: "bundle_volynx_daily_pro",
    family: "bundle",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 2900, eur: 3490, brl: 19900 },
  },
  {
    name: "VOLYNX Studio + Daily Diamond Bundle",
    description: "Builder Studio + Daily Diamond in one subscription. Maximum access to both products.",
    lookupPrefix: "bundle_volynx_daily_studio",
    family: "bundle",
    tier: "studio",
    recurring: "month",
    amounts: { gbp: 5900, eur: 6990, brl: 39900 },
  },
  {
    name: "VX Pack - Starter (12)",
    description: "12 VX for light usage and one-off premium actions. Entry pack.",
    lookupPrefix: "tokens_starter",
    family: "tokens",
    tier: "starter",
    includesTokens: "12",
    amounts: { gbp: 990, eur: 1190, brl: 6900 },
  },
  {
    name: "VX Pack - Core (32)",
    description: "32 VX - the best balance between value and premium capacity. Most popular.",
    lookupPrefix: "tokens_core",
    family: "tokens",
    tier: "core",
    includesTokens: "32",
    amounts: { gbp: 1990, eur: 2490, brl: 14900 },
  },
  {
    name: "VX Pack - Pro (80)",
    description: "80 VX for frequent users and more demanding workflows. Best value.",
    lookupPrefix: "tokens_pro",
    family: "tokens",
    tier: "pro",
    includesTokens: "80",
    amounts: { gbp: 3990, eur: 4990, brl: 28900 },
  },
  {
    name: "VX Pack - Elite (200)",
    description: "200 VX - maximum capacity for heavy usage and larger operations.",
    lookupPrefix: "tokens_scale",
    family: "tokens",
    tier: "scale",
    includesTokens: "200",
    amounts: { gbp: 7900, eur: 9900, brl: 57900 },
  },
  {
    name: "Assisted Domain Setup",
    description: "Faster domain activation with guided setup and DNS configuration.",
    lookupPrefix: "addon_domain_setup",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 900, eur: 1090, brl: 5900 },
  },
  {
    name: "Premium Template / Kit",
    description: "Ready-made premium kits for high-conversion landing pages.",
    lookupPrefix: "addon_template_pack",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 1200, eur: 1490, brl: 7900 },
  },
  {
    name: "HTML Export",
    description: "Exportable HTML/CSS package for self-hosting outside the platform.",
    lookupPrefix: "addon_html_export",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 2900, eur: 3490, brl: 19900 },
  },
  {
    name: "Extra Site Slot",
    description: "Add one more published site slot without upgrading your plan.",
    lookupPrefix: "addon_extra_slot",
    family: "addons",
    tier: "addon",
    recurring: "month",
    amounts: { gbp: 500, eur: 590, brl: 3900 },
  },
  {
    name: "Bilingual Pack",
    description: "Two-language support (PT/EN) in published projects.",
    lookupPrefix: "addon_bilingual",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 700, eur: 890, brl: 4900 },
  },
  {
    name: "Icon Collection Pack (5 Premium)",
    description: "5 permanent premium icon collections: 3D Icons, Futuristic, Neon, Metal Blue, Nature. 200+ icons, no expiry.",
    lookupPrefix: "addon_icons",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 900, eur: 1090, brl: 5900 },
  },
  {
    name: "PropertyFlow Starter (3 templates)",
    description: "Property management platform with 3 grid layout templates. Full React source, catalogue, filters, bilingual.",
    lookupPrefix: "pf_starter",
    family: "propertyflow",
    tier: "starter",
    amounts: { gbp: 14900, eur: 17900, brl: 104900 },
  },
  {
    name: "PropertyFlow Professional (6 templates)",
    description: "Full PropertyFlow kit with 6 grid templates, Supabase backend, admin dashboard, enquiry capture.",
    lookupPrefix: "pf_professional",
    family: "propertyflow",
    tier: "professional",
    amounts: { gbp: 34900, eur: 41900, brl: 244900 },
  },
  {
    name: "PropertyFlow Enterprise (15 templates)",
    description: "Complete PropertyFlow with 15 grid templates, custom branding kit, priority onboarding, data migration.",
    lookupPrefix: "pf_enterprise",
    family: "propertyflow",
    tier: "enterprise",
    amounts: { gbp: 59900, eur: 69900, brl: 419900 },
  },
];

function billingType(def) {
  if (def.recurring && def.lookupPrefix.startsWith("addon_")) return "subscription_addon";
  return def.recurring ? "subscription" : "one_time";
}

function productMetadata(def) {
  return {
    product_family: def.family,
    plan_tier: def.tier,
    billing_type: billingType(def),
    currency_scope: "multi",
    includes_tokens: def.includesTokens || "0",
    is_addon: String(def.lookupPrefix.startsWith("addon_")),
    mode,
    managed_by: "volynx-catalog-reconcile",
  };
}

function priceMetadata(def, cur, lookupKey) {
  return {
    product_family: def.family,
    plan_tier: def.tier,
    billing_type: billingType(def),
    currency: cur.toUpperCase(),
    lookup_key: lookupKey,
    includes_tokens: def.includesTokens || "0",
    is_addon: String(def.lookupPrefix.startsWith("addon_")),
    mode,
    managed_by: "volynx-catalog-reconcile",
  };
}

function samePrice(price, def, cur) {
  const amountOk = price.unit_amount === def.amounts[cur];
  const currencyOk = price.currency === cur;
  const typeOk = def.recurring
    ? price.type === "recurring" && price.recurring?.interval === def.recurring
    : price.type === "one_time";
  return amountOk && currencyOk && typeOk && price.active;
}

async function findProduct(def) {
  const byMetadata = await stripe.products.search({
    query: `metadata['volynx_lookup_prefix']:'${def.lookupPrefix}' AND active:'true'`,
    limit: 1,
  });
  if (byMetadata.data[0]) return byMetadata.data[0];

  const byName = await stripe.products.search({
    query: `name:'${def.name.replace(/'/g, "\\'")}' AND active:'true'`,
    limit: 1,
  });
  return byName.data[0] || null;
}

async function ensureProduct(def, actions) {
  const found = await findProduct(def);
  if (found) {
    const updates = {};
    if (found.description !== def.description) updates.description = def.description;
    const metadata = {
      ...found.metadata,
      ...productMetadata(def),
      volynx_lookup_prefix: def.lookupPrefix,
    };
    const metadataChanged = Object.entries(metadata).some(([k, v]) => found.metadata?.[k] !== v);
    if (metadataChanged) updates.metadata = metadata;

    if (Object.keys(updates).length) {
      actions.push({ type: "update_product", id: found.id, name: def.name });
      if (APPLY) return stripe.products.update(found.id, updates);
    }
    return found;
  }

  actions.push({ type: "create_product", name: def.name });
  if (!APPLY) return { id: `dry_${def.lookupPrefix}`, metadata: {} };

  return stripe.products.create({
    name: def.name,
    description: def.description,
    metadata: {
      ...productMetadata(def),
      volynx_lookup_prefix: def.lookupPrefix,
    },
  });
}

async function findPrice(lookupKey) {
  const result = await stripe.prices.search({
    query: `lookup_key:'${lookupKey}'`,
    limit: 1,
    expand: ["data.product"],
  });
  return result.data[0] || null;
}

async function createExpectedPrice(def, productId, cur, lookupKey, transferLookupKey) {
  const params = {
    product: productId,
    currency: cur,
    unit_amount: def.amounts[cur],
    lookup_key: lookupKey,
    metadata: priceMetadata(def, cur, lookupKey),
  };
  if (def.recurring) params.recurring = { interval: def.recurring };
  if (transferLookupKey) params.transfer_lookup_key = true;
  return stripe.prices.create(params);
}

async function ensurePrice(def, product, cur, actions, rows) {
  const lookupKey = `${def.lookupPrefix}_${cur}`;
  const existing = await findPrice(lookupKey);

  if (existing && samePrice(existing, def, cur)) {
    rows.push({
      lookup_key: lookupKey,
      status: "ok",
      product_id: typeof existing.product === "string" ? existing.product : existing.product.id,
      price_id: existing.id,
      currency: cur.toUpperCase(),
      amount: def.amounts[cur],
      type: def.recurring || "one_time",
    });
    return;
  }

  if (!existing) {
    actions.push({ type: "create_price", lookup_key: lookupKey, amount: def.amounts[cur], currency: cur });
    if (APPLY) {
      const created = await createExpectedPrice(def, product.id, cur, lookupKey, false);
      rows.push({ lookup_key: lookupKey, status: "created", product_id: product.id, price_id: created.id, currency: cur.toUpperCase(), amount: def.amounts[cur], type: def.recurring || "one_time" });
    } else {
      rows.push({ lookup_key: lookupKey, status: "missing", product_id: product.id, price_id: null, currency: cur.toUpperCase(), amount: def.amounts[cur], type: def.recurring || "one_time" });
    }
    return;
  }

  actions.push({
    type: "replace_price",
    lookup_key: lookupKey,
    old_price_id: existing.id,
    old_amount: existing.unit_amount,
    new_amount: def.amounts[cur],
    currency: cur,
  });

  if (APPLY) {
    const created = await createExpectedPrice(def, product.id, cur, lookupKey, true);
    await stripe.prices.update(existing.id, {
      active: false,
      metadata: {
        ...existing.metadata,
        replaced_by: created.id,
        replaced_reason: "volynx_catalog_amount_or_type_mismatch",
      },
    });
    rows.push({ lookup_key: lookupKey, status: "replaced", product_id: product.id, price_id: created.id, old_price_id: existing.id, currency: cur.toUpperCase(), amount: def.amounts[cur], type: def.recurring || "one_time" });
  } else {
    rows.push({ lookup_key: lookupKey, status: "mismatch", product_id: product.id, price_id: existing.id, currency: cur.toUpperCase(), expected_amount: def.amounts[cur], actual_amount: existing.unit_amount, type: def.recurring || "one_time" });
  }
}

async function main() {
  const actions = [];
  const rows = [];

  console.log(`VOLYNX Stripe catalog reconcile | mode=${mode} | ${DRY_RUN ? "dry-run" : "apply"}`);
  console.log(`Expected: ${catalog.length} products, ${catalog.length * currencies.length} prices\n`);

  for (const def of catalog) {
    const product = await ensureProduct(def, actions);
    for (const cur of currencies) {
      await ensurePrice(def, product, cur, actions, rows);
    }
  }

  const outputPath = resolve(__dirname, `stripe-catalog-${mode}-reconcile-output.json`);
  writeFileSync(outputPath, JSON.stringify({ mode, applied: APPLY, actions, prices: rows }, null, 2));

  const summary = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  console.log("Summary:", summary);
  console.log(`Actions: ${actions.length}`);
  for (const action of actions) {
    console.log(`- ${action.type}: ${action.lookup_key || action.name || action.id}`);
  }
  console.log(`\nOutput: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
