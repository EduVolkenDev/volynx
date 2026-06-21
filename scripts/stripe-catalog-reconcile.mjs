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

const STRIPE_KEY = (REQUIRE_LIVE && process.env.STRIPE_LIVE_SECRET_KEY)
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY || "";
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
    amounts: { gbp: 1100, eur: 1300, brl: 6900 },
  },
  {
    name: "Builder Pro",
    description: "Best balance of publish, custom domain, and premium presentation. Anchor plan.",
    lookupPrefix: "builder_pro",
    family: "builder",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 2400, eur: 2800, brl: 14900 },
  },
  {
    name: "Builder Studio",
    description: "For creators, freelancers, and small studios publishing frequently.",
    lookupPrefix: "builder_studio",
    family: "builder",
    tier: "studio",
    recurring: "month",
    amounts: { gbp: 5400, eur: 6300, brl: 34900 },
  },
  {
    name: "Builder Teams",
    description: "Workspace for team operations with central billing and shared assets.",
    lookupPrefix: "builder_teams",
    family: "builder",
    tier: "teams",
    recurring: "month",
    amounts: { gbp: 11800, eur: 13800, brl: 74900 },
  },
  {
    name: "Studio Pro",
    description: "Full production pipeline in the browser. Unlimited tools, batch processing, commercial rights.",
    lookupPrefix: "studio_pro",
    family: "studio",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 1800, eur: 2100, brl: 11900 },
  },
  {
    name: "Daily Pro",
    description: "Full access to VOLYNX Daily tools: Scanner, Summary, Vault, Writing, Decision with cloud sync and exports.",
    lookupPrefix: "daily_pro",
    family: "daily",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 1400, eur: 1600, brl: 8900 },
  },
  {
    name: "Daily Diamond",
    description: "Premium Daily tier with API access, shared vaults, team notes, analytics and priority everything.",
    lookupPrefix: "daily_diamond",
    family: "daily",
    tier: "diamond",
    recurring: "month",
    amounts: { gbp: 3400, eur: 3900, brl: 21900 },
  },
  {
    name: "CVitae Business",
    description: "Unlimited CV management, premium templates and included professional exports for people who use CVitae every day.",
    lookupPrefix: "cvitae_business",
    family: "cvitae",
    tier: "business",
    recurring: "month",
    amounts: { gbp: 1500, eur: 1800, brl: 9900 },
  },
  {
    name: "VOLYNX + Daily Pro Bundle",
    description: "Builder Pro + Daily Pro in one subscription. Save vs buying separately.",
    lookupPrefix: "bundle_volynx_daily_pro",
    family: "bundle",
    tier: "pro",
    recurring: "month",
    amounts: { gbp: 3500, eur: 4100, brl: 22900 },
  },
  {
    name: "VOLYNX Studio + Daily Diamond Bundle",
    description: "Builder Studio + Daily Diamond in one subscription. Maximum access to both products.",
    lookupPrefix: "bundle_volynx_daily_studio",
    family: "bundle",
    tier: "studio",
    recurring: "month",
    amounts: { gbp: 8200, eur: 9600, brl: 54900 },
  },
  {
    name: "VX Pack - Starter (12)",
    description: "12 VX for light usage and one-off premium actions. Entry pack.",
    lookupPrefix: "tokens_starter",
    family: "tokens",
    tier: "starter",
    includesTokens: "12",
    amounts: { gbp: 840, eur: 980, brl: 5400 },
  },
  {
    name: "VX Pack - Core (32)",
    description: "32 VX - the best balance between value and premium capacity. Most popular.",
    lookupPrefix: "tokens_core",
    family: "tokens",
    tier: "core",
    includesTokens: "32",
    amounts: { gbp: 1800, eur: 2100, brl: 11900 },
  },
  {
    name: "VX Pack - Pro (80)",
    description: "80 VX for frequent users and more demanding workflows. Best value.",
    lookupPrefix: "tokens_pro",
    family: "tokens",
    tier: "pro",
    includesTokens: "80",
    amounts: { gbp: 4200, eur: 4900, brl: 27900 },
  },
  {
    name: "VX Pack - Elite (200)",
    description: "200 VX - maximum capacity for heavy usage and larger operations.",
    lookupPrefix: "tokens_scale",
    family: "tokens",
    tier: "scale",
    includesTokens: "200",
    amounts: { gbp: 8800, eur: 10200, brl: 58900 },
  },
  {
    name: "Assisted Domain Setup",
    description: "Faster domain activation with guided setup and DNS configuration.",
    lookupPrefix: "addon_domain_setup",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 1500, eur: 1700, brl: 9900 },
  },
  {
    name: "Premium Template / Kit",
    description: "Ready-made premium kits for high-conversion landing pages.",
    lookupPrefix: "addon_template_pack",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 2800, eur: 3200, brl: 17900 },
  },
  {
    name: "HTML Export",
    description: "Exportable HTML/CSS package for self-hosting outside the platform.",
    lookupPrefix: "addon_html_export",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 4400, eur: 5100, brl: 29900 },
  },
  {
    name: "Extra Site Slot",
    description: "Add one more published site slot without upgrading your plan.",
    lookupPrefix: "addon_extra_slot",
    family: "addons",
    tier: "addon",
    recurring: "month",
    amounts: { gbp: 700, eur: 800, brl: 4900 },
  },
  {
    name: "Bilingual Pack",
    description: "Two-language support (PT/EN) in published projects.",
    lookupPrefix: "addon_bilingual",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 1900, eur: 2200, brl: 12900 },
  },
  {
    name: "Icon Collection Pack (5 Premium)",
    description: "5 permanent premium icon collections: 3D Icons, Futuristic, Neon, Metal Blue, Nature. 200+ icons, no expiry.",
    lookupPrefix: "addon_icons",
    family: "addons",
    tier: "addon",
    amounts: { gbp: 1800, eur: 2100, brl: 11900 },
  },
  {
    name: "VOLYNX Checkout Smoke Test",
    description: "Low-value one-time product used only to verify live checkout, webhook, and post-payment return flows.",
    lookupPrefix: "checkout_smoke_test",
    family: "checkout_test",
    tier: "smoke_test",
    amounts: { gbp: 30, eur: 50, brl: 50 },
  },
  {
    name: "Icons Store Single - Budget",
    description: "Accessible single-icon license for lighter SVG/PNG assets.",
    lookupPrefix: "icons_single_budget",
    family: "icons_store",
    tier: "single_budget",
    amounts: { gbp: 80, eur: 95, brl: 550 },
  },
  {
    name: "Icons Store Single - Standard",
    description: "Standard single-icon license for premium SVG singles and mid-tier PNG assets.",
    lookupPrefix: "icons_single_standard",
    family: "icons_store",
    tier: "single_standard",
    amounts: { gbp: 140, eur: 160, brl: 990 },
  },
  {
    name: "Icons Store Single - Premium",
    description: "Premium single-icon license for high-detail chromed, metal, iridescent and similar assets.",
    lookupPrefix: "icons_single_premium",
    family: "icons_store",
    tier: "single_premium",
    amounts: { gbp: 220, eur: 260, brl: 1490 },
  },
  {
    name: "Icons Store Single - Hyper 5000px",
    description: "Top-tier single-icon license for Hyper Icons 5000px source-quality assets.",
    lookupPrefix: "icons_single_hyper",
    family: "icons_store",
    tier: "single_hyper",
    amounts: { gbp: 590, eur: 690, brl: 3990 },
  },
  {
    name: "Icons Store Pack - Mixed",
    description: "Mixed free/premium icon pack checkout for accessible collection purchases.",
    lookupPrefix: "icons_pack_mixed",
    family: "icons_store",
    tier: "pack_mixed",
    amounts: { gbp: 520, eur: 600, brl: 3490 },
  },
  {
    name: "Icons Store Pack - Premium",
    description: "Premium icon pack checkout for high-quality collections.",
    lookupPrefix: "icons_pack_premium",
    family: "icons_store",
    tier: "pack_premium",
    amounts: { gbp: 1120, eur: 1300, brl: 7490 },
  },
  {
    name: "Icons Store Pack - Hyper 5000px",
    description: "Hyper Icons 5000px premium pack checkout.",
    lookupPrefix: "icons_pack_hyper",
    family: "icons_store",
    tier: "pack_hyper",
    amounts: { gbp: 3700, eur: 4300, brl: 24900 },
  },
  {
    name: "Portfolio Pro Kit - Personal",
    description: "Personal-license portfolio kit with Builder preset, premium section system, motion direction and launch checklist.",
    lookupPrefix: "kit_portfolio_personal",
    family: "kits",
    tier: "portfolio_personal",
    amounts: { gbp: 4700, eur: 5400, brl: 32900 },
  },
  {
    name: "Portfolio Pro Kit - Commercial",
    description: "Commercial portfolio kit for client-facing work: Builder preset, SEO structure, section variants and handoff checklist.",
    lookupPrefix: "kit_portfolio_commercial",
    family: "kits",
    tier: "portfolio_commercial",
    amounts: { gbp: 11700, eur: 13600, brl: 81900 },
  },
  {
    name: "Portfolio Pro Kit - Studio",
    description: "Studio portfolio kit license with extended commercial usage, Builder preset and reusable delivery system.",
    lookupPrefix: "kit_portfolio_studio",
    family: "kits",
    tier: "portfolio_studio",
    amounts: { gbp: 24700, eur: 28700, brl: 172000 },
  },
  {
    name: "Agency Launch Kit - Starter",
    description: "Agency starter kit with Builder preset, positioning structure, proposal logic and launch-ready agency page system.",
    lookupPrefix: "kit_agency_personal",
    family: "kits",
    tier: "agency_personal",
    amounts: { gbp: 8700, eur: 10100, brl: 60900 },
  },
  {
    name: "Agency Launch Kit - Commercial",
    description: "Agency commercial kit for client delivery: Builder preset, proposal/SOW assets and premium conversion sections.",
    lookupPrefix: "kit_agency_commercial",
    family: "kits",
    tier: "agency_commercial",
    amounts: { gbp: 18700, eur: 21700, brl: 129000 },
  },
  {
    name: "Agency Launch Kit - Studio",
    description: "Agency studio license with reusable delivery system, Builder preset, client-ready structure and operations checklist.",
    lookupPrefix: "kit_agency_studio",
    family: "kits",
    tier: "agency_studio",
    amounts: { gbp: 34700, eur: 39900, brl: 239000 },
  },
  {
    name: "SaaS Landing System - Launch",
    description: "SaaS launch kit with Builder preset, conversion-first landing blocks, pricing/FAQ sections and launch checklist.",
    lookupPrefix: "kit_saas_personal",
    family: "kits",
    tier: "saas_personal",
    amounts: { gbp: 7700, eur: 8900, brl: 53900 },
  },
  {
    name: "SaaS Landing System - Growth",
    description: "Commercial SaaS landing system with Builder preset, variant logic, conversion sections and client-ready delivery scope.",
    lookupPrefix: "kit_saas_commercial",
    family: "kits",
    tier: "saas_commercial",
    amounts: { gbp: 17700, eur: 20500, brl: 124000 },
  },
  {
    name: "SaaS Landing System - Scale",
    description: "Studio SaaS landing system with advanced variant structure, Builder preset and reusable launch framework.",
    lookupPrefix: "kit_saas_studio",
    family: "kits",
    tier: "saas_studio",
    amounts: { gbp: 32700, eur: 37900, brl: 229000 },
  },
  {
    name: "PropertyFlow Starter (3 templates)",
    description: "Property management platform with 3 grid layout templates. Full React source, catalogue, filters, bilingual.",
    lookupPrefix: "pf_starter",
    family: "propertyflow",
    tier: "starter",
    amounts: { gbp: 18700, eur: 21900, brl: 129000 },
  },
  {
    name: "PropertyFlow Professional (6 templates)",
    description: "Full PropertyFlow kit with 6 grid templates, Supabase backend, admin dashboard, enquiry capture.",
    lookupPrefix: "pf_professional",
    family: "propertyflow",
    tier: "professional",
    amounts: { gbp: 44700, eur: 51900, brl: 309000 },
  },
  {
    name: "PropertyFlow White-Label (15 templates)",
    description: "Complete PropertyFlow with 15 grid templates, branding starter kit, priority onboarding, data migration.",
    lookupPrefix: "pf_enterprise",
    family: "propertyflow",
    tier: "white-label",
    amounts: { gbp: 89700, eur: 103900, brl: 619000 },
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
