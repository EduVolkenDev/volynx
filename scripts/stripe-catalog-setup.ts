/**
 * VOLYNX — Stripe Catalog Setup Script
 *
 * Creates all products and prices in Stripe for the VOLYNX platform.
 * Run in TEST mode first, then switch to LIVE when ready.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe-catalog-setup.ts
 *
 * Or with .env file:
 *   1. Create scripts/.env with STRIPE_SECRET_KEY=sk_test_xxx
 *   2. npx tsx scripts/stripe-catalog-setup.ts
 *
 * Output: scripts/stripe-catalog-output.json
 */

import Stripe from "stripe";
import { writeFileSync } from "fs";
import { resolve } from "path";

// ── Load env ──────────────────────────────────────────────
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: resolve(import.meta.dirname || ".", ".env") });
} catch {}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error("ERROR: Set STRIPE_SECRET_KEY env variable.");
  console.error("  STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe-catalog-setup.ts");
  process.exit(1);
}

const isTest = STRIPE_KEY.startsWith("sk_test_");
const env = isTest ? "test" : "live";
console.log(`\n🔑 Mode: ${env.toUpperCase()}\n`);

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-04-30.basil" as any });

// ── Types ─────────────────────────────────────────────────
type Currency = "gbp" | "eur" | "brl";
type PriceDef = { gbp: number; eur: number; brl: number };

interface ProductDef {
  name: string;
  description: string;
  lookupPrefix: string;
  metadata: Record<string, string>;
  prices: {
    recurring?: { interval: "month" | "year" };
    amounts: PriceDef;
  };
}

// ── Catalog Definition ────────────────────────────────────

const BUILDER_SUBSCRIPTIONS: ProductDef[] = [
  {
    name: "Builder Launch",
    description: "Entry plan — 1 published site, volynx.world subdomain, basic kits.",
    lookupPrefix: "builder_launch",
    metadata: {
      product_family: "builder",
      plan_tier: "launch",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "1",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 900, eur: 1090, brl: 5900 } },
  },
  {
    name: "Builder Pro",
    description: "Anchor plan — 3 published sites, custom domain, remove branding, premium kits.",
    lookupPrefix: "builder_pro",
    metadata: {
      product_family: "builder",
      plan_tier: "pro",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "1/month",
      builder_sites_limit: "3",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 1900, eur: 2290, brl: 12900 } },
  },
  {
    name: "Builder Studio",
    description: "For creators and studios — 10 sites, multiple custom domains, full premium kits.",
    lookupPrefix: "builder_studio",
    metadata: {
      product_family: "builder",
      plan_tier: "studio",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "3/month",
      builder_sites_limit: "10",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 3900, eur: 4590, brl: 24900 } },
  },
  {
    name: "Builder Teams",
    description: "Team workspace — 25 sites, central billing, shared assets, priority support.",
    lookupPrefix: "builder_teams",
    metadata: {
      product_family: "builder",
      plan_tier: "teams",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "pool",
      builder_sites_limit: "25",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 7900, eur: 8990, brl: 49900 } },
  },
];

const STUDIO_PRO: ProductDef = {
  name: "Studio Pro",
  description: "Full production pipeline — unlimited tools, batch processing, commercial rights.",
  lookupPrefix: "studio_pro",
  metadata: {
    product_family: "studio",
    plan_tier: "pro",
    billing_type: "subscription",
    currency_scope: "multi",
    includes_tokens: "0",
    includes_icons: "false",
    builder_sites_limit: "0",
    is_addon: "false",
  },
  prices: { recurring: { interval: "month" }, amounts: { gbp: 1900, eur: 2290, brl: 12900 } },
};

const TOKEN_PACKS: ProductDef[] = [
  {
    name: "Token Pack — Starter (10)",
    description: "10 tokens for flexible tool usage.",
    lookupPrefix: "tokens_starter",
    metadata: {
      product_family: "tokens",
      plan_tier: "starter",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "10",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 990, eur: 1190, brl: 6900 } },
  },
  {
    name: "Token Pack — Core (25)",
    description: "25 tokens — most popular pack.",
    lookupPrefix: "tokens_core",
    metadata: {
      product_family: "tokens",
      plan_tier: "core",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "25",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 2290, eur: 2790, brl: 15900 } },
  },
  {
    name: "Token Pack — Pro (60)",
    description: "60 tokens — best value.",
    lookupPrefix: "tokens_pro",
    metadata: {
      product_family: "tokens",
      plan_tier: "pro",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "60",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 4990, eur: 5990, brl: 34900 } },
  },
  {
    name: "Token Pack — Scale (150)",
    description: "150 tokens — heavy use.",
    lookupPrefix: "tokens_scale",
    metadata: {
      product_family: "tokens",
      plan_tier: "scale",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "150",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 10900, eur: 12900, brl: 74900 } },
  },
];

const ADDONS: ProductDef[] = [
  {
    name: "Assisted Domain Setup",
    description: "Faster domain activation with less friction.",
    lookupPrefix: "addon_domain_setup",
    metadata: {
      product_family: "builder",
      plan_tier: "addon",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "true",
    },
    prices: { amounts: { gbp: 900, eur: 1090, brl: 5900 } },
  },
  {
    name: "Premium Template / Kit",
    description: "Ready-made kits for premium conversion pages.",
    lookupPrefix: "addon_template_pack",
    metadata: {
      product_family: "builder",
      plan_tier: "addon",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "true",
    },
    prices: { amounts: { gbp: 1200, eur: 1490, brl: 7900 } },
  },
  {
    name: "HTML Export",
    description: "Exportable package for use outside the platform.",
    lookupPrefix: "addon_html_export",
    metadata: {
      product_family: "builder",
      plan_tier: "addon",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "true",
    },
    prices: { amounts: { gbp: 2900, eur: 3490, brl: 19900 } },
  },
  {
    name: "Extra Site Slot",
    description: "More capacity without an immediate plan upgrade.",
    lookupPrefix: "addon_extra_slot",
    metadata: {
      product_family: "builder",
      plan_tier: "addon",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "+1",
      is_addon: "true",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 500, eur: 590, brl: 3900 } },
  },
  {
    name: "Bilingual Pack",
    description: "Two-language support in published projects.",
    lookupPrefix: "addon_bilingual",
    metadata: {
      product_family: "builder",
      plan_tier: "addon",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "true",
    },
    prices: { amounts: { gbp: 700, eur: 890, brl: 4900 } },
  },
  {
    name: "Premium Icon Collection",
    description: "Extra icon collection to elevate the visual finish.",
    lookupPrefix: "addon_icons",
    metadata: {
      product_family: "builder",
      plan_tier: "addon",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "true",
      builder_sites_limit: "0",
      is_addon: "true",
    },
    prices: { amounts: { gbp: 900, eur: 1090, brl: 5900 } },
  },
];

// ── Create helpers ────────────────────────────────────────

const currencies: Currency[] = ["gbp", "eur", "brl"];
const output: any[] = [];

async function createProductWithPrices(def: ProductDef) {
  console.log(`  Creating product: ${def.name}`);

  const product = await stripe.products.create({
    name: def.name,
    description: def.description,
    metadata: { ...def.metadata, env },
  });

  console.log(`    ✓ Product: ${product.id}`);

  for (const currency of currencies) {
    const amount = def.prices.amounts[currency];
    const lookupKey = `${def.lookupPrefix}_${currency}`;

    const priceParams: Stripe.PriceCreateParams = {
      product: product.id,
      currency,
      unit_amount: amount,
      lookup_key: lookupKey,
      metadata: {
        ...def.metadata,
        currency: currency.toUpperCase(),
        lookup_key: lookupKey,
        env,
      },
    };

    if (def.prices.recurring) {
      priceParams.recurring = { interval: def.prices.recurring.interval };
    }

    const price = await stripe.prices.create(priceParams);
    console.log(`    ✓ Price ${currency.toUpperCase()}: ${price.id} (${lookupKey})`);

    output.push({
      product_name: def.name,
      product_id: product.id,
      price_id: price.id,
      lookup_key: lookupKey,
      currency: currency.toUpperCase(),
      amount: amount / 100,
      recurring: def.prices.recurring?.interval || "one_time",
      env,
      metadata: def.metadata,
    });
  }

  console.log("");
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  VOLYNX Stripe Catalog Setup");
  console.log(`  Environment: ${env.toUpperCase()}`);
  console.log("═══════════════════════════════════════\n");

  console.log("── Builder Subscriptions ──────────────\n");
  for (const def of BUILDER_SUBSCRIPTIONS) {
    await createProductWithPrices(def);
  }

  console.log("── Studio Pro ────────────────────────\n");
  await createProductWithPrices(STUDIO_PRO);

  console.log("── Token Packs ───────────────────────\n");
  for (const def of TOKEN_PACKS) {
    await createProductWithPrices(def);
  }

  console.log("── Add-ons ───────────────────────────\n");
  for (const def of ADDONS) {
    await createProductWithPrices(def);
  }

  // Write output
  const outPath = resolve(import.meta.dirname || ".", "stripe-catalog-output.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Done! ${output.length} prices created.`);
  console.log(`📄 Output saved to: ${outPath}`);

  // Summary table
  console.log("\n── Summary ───────────────────────────\n");
  const families = [...new Set(output.map((o) => o.metadata.product_family))];
  for (const fam of families) {
    const items = output.filter((o) => o.metadata.product_family === fam);
    const products = [...new Set(items.map((o) => o.product_name))];
    console.log(`  ${fam.toUpperCase()}: ${products.length} products, ${items.length} prices`);
  }
  console.log(`\n  TOTAL: ${[...new Set(output.map((o) => o.product_id))].length} products, ${output.length} prices\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
