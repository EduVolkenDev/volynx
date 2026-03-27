/**
 * VOLYNX — Stripe Catalog Setup Script
 *
 * Creates all products and prices in Stripe (test mode first).
 * Secrets are read ONLY from environment variables — never logged, committed, or printed.
 *
 * Usage:
 *   1. cp scripts/.env.example scripts/.env
 *   2. Paste your sk_test_ key in scripts/.env
 *   3. npx tsx scripts/stripe-catalog-setup.ts
 *
 * Output: scripts/stripe-catalog-output.json (gitignored)
 */

import Stripe from "stripe";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env (never log the key) ────────────────────────
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: resolve(__dirname, ".env") });
} catch {}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
if (!STRIPE_KEY || (!STRIPE_KEY.startsWith("sk_test_") && !STRIPE_KEY.startsWith("sk_live_"))) {
  console.error("ERROR: STRIPE_SECRET_KEY not set or invalid.");
  console.error("  1. cp scripts/.env.example scripts/.env");
  console.error("  2. Add your sk_test_ key to scripts/.env");
  console.error("  3. npx tsx scripts/stripe-catalog-setup.ts");
  process.exit(1);
}

const mode = STRIPE_KEY.startsWith("sk_test_") ? "test" : "live";
console.log(`\n  Mode: ${mode.toUpperCase()} (key loaded from env)\n`);

const stripe = new Stripe(STRIPE_KEY);

// ── Types ─────────────────────────────────────────────────
type Cur = "gbp" | "eur" | "brl";
type Amounts = Record<Cur, number>; // in cents/pence

interface ProductDef {
  name: string;
  description: string;
  marketingFeatures?: string[];
  lookupPrefix: string;
  metadata: Record<string, string>;
  prices: {
    recurring?: { interval: "month" | "year" };
    amounts: Amounts;
  };
}

// ── Catalog ───────────────────────────────────────────────

const BUILDER_SUBS: ProductDef[] = [
  {
    name: "Builder Launch",
    description: "Entry plan to launch lean pages quickly. 1 published site on volynx.world subdomain.",
    marketingFeatures: [
      "1 published site",
      "volynx.world subdomain",
      "Basic kits included",
      "Basic analytics",
      "Basic forms",
    ],
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
    description: "Best balance of publish, custom domain, and premium presentation. Anchor plan.",
    marketingFeatures: [
      "Up to 3 published sites",
      "Custom domain",
      "Remove Volynx branding",
      "Selected premium kits",
      "1 light icons bonus/month",
      "Publish priority",
    ],
    lookupPrefix: "builder_pro",
    metadata: {
      product_family: "builder",
      plan_tier: "pro",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "1",
      builder_sites_limit: "3",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 1900, eur: 2290, brl: 12900 } },
  },
  {
    name: "Builder Studio",
    description: "For creators, freelancers, and small studios publishing frequently.",
    marketingFeatures: [
      "Up to 10 sites",
      "Multiple custom domains",
      "Full premium kits",
      "Discount on export package",
      "Improved analytics",
      "Bigger icons perks",
    ],
    lookupPrefix: "builder_studio",
    metadata: {
      product_family: "builder",
      plan_tier: "studio",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "3",
      builder_sites_limit: "10",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 3900, eur: 4590, brl: 24900 } },
  },
  {
    name: "Builder Teams",
    description: "Workspace for team operations with central billing and shared assets.",
    marketingFeatures: [
      "25 sites",
      "Team workspace",
      "Central billing",
      "Shared assets & icons pool",
      "Priority support",
    ],
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
  description: "Full production pipeline in the browser. Unlimited tools, batch processing, commercial rights.",
  marketingFeatures: [
    "Unlimited tool usage",
    "Batch processing + ZIP download",
    "Commercial usage rights",
    "100% local processing",
    "All Studio tools included",
  ],
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
    description: "10 tokens for flexible premium tool usage. Entry pack.",
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
    description: "25 tokens — most popular pack for regular users.",
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
    description: "60 tokens — best value for power users.",
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
    description: "150 tokens — heavy use for agencies and studios.",
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
    description: "Faster domain activation with guided setup and DNS configuration.",
    lookupPrefix: "addon_domain_setup",
    metadata: {
      product_family: "addons",
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
    description: "Ready-made premium kits for high-conversion landing pages.",
    lookupPrefix: "addon_template_pack",
    metadata: {
      product_family: "addons",
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
    description: "Exportable HTML/CSS package for self-hosting outside the platform.",
    lookupPrefix: "addon_html_export",
    metadata: {
      product_family: "addons",
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
    description: "Add one more published site slot without upgrading your plan.",
    lookupPrefix: "addon_extra_slot",
    metadata: {
      product_family: "addons",
      plan_tier: "addon",
      billing_type: "subscription_addon",
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
    description: "Two-language support (PT/EN) in published projects.",
    lookupPrefix: "addon_bilingual",
    metadata: {
      product_family: "addons",
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
    description: "Curated icon collection to elevate your site's visual finish.",
    lookupPrefix: "addon_icons",
    metadata: {
      product_family: "addons",
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

// ── Helpers ───────────────────────────────────────────────

const currencies: Cur[] = ["gbp", "eur", "brl"];
const output: Record<string, any>[] = [];

function formatAmount(cur: Cur, cents: number): string {
  const sym = cur === "gbp" ? "£" : cur === "eur" ? "€" : "R$";
  return `${sym}${(cents / 100).toFixed(2)}`;
}

async function lookupKeyExists(key: string): Promise<boolean> {
  try {
    const prices = await stripe.prices.list({ lookup_keys: [key], limit: 1 });
    return prices.data.length > 0;
  } catch { return false; }
}

async function createProductWithPrices(def: ProductDef) {
  // Check if any price with this prefix already exists
  const sampleKey = `${def.lookupPrefix}_gbp`;
  if (await lookupKeyExists(sampleKey)) {
    console.log(`  SKIP: ${def.name} (lookup_key ${sampleKey} already exists)`);
    // Still record existing prices in output
    for (const cur of currencies) {
      const lk = `${def.lookupPrefix}_${cur}`;
      try {
        const existing = await stripe.prices.list({ lookup_keys: [lk], limit: 1 });
        if (existing.data[0]) {
          const p = existing.data[0];
          output.push({
            product_name: def.name,
            product_id: p.product as string,
            price_id: p.id,
            lookup_key: lk,
            currency: cur.toUpperCase(),
            amount_display: formatAmount(cur, p.unit_amount || 0),
            recurring: p.recurring?.interval || "one_time",
            mode,
            status: "existing",
          });
        }
      } catch {}
    }
    console.log("");
    return;
  }

  console.log(`  Creating: ${def.name}`);

  const productParams: Stripe.ProductCreateParams = {
    name: def.name,
    description: def.description,
    metadata: { ...def.metadata, mode },
  };

  if (def.marketingFeatures?.length) {
    productParams.marketing_features = def.marketingFeatures.map((f) => ({ name: f }));
  }

  const product = await stripe.products.create(productParams);
  console.log(`    product: ${product.id}`);

  for (const cur of currencies) {
    const amount = def.prices.amounts[cur];
    const lookupKey = `${def.lookupPrefix}_${cur}`;

    const priceParams: Stripe.PriceCreateParams = {
      product: product.id,
      currency: cur,
      unit_amount: amount,
      lookup_key: lookupKey,
      metadata: {
        product_family: def.metadata.product_family,
        plan_tier: def.metadata.plan_tier,
        billing_type: def.metadata.billing_type,
        currency: cur.toUpperCase(),
        lookup_key: lookupKey,
        includes_tokens: def.metadata.includes_tokens,
        is_addon: def.metadata.is_addon,
        mode,
      },
    };

    if (def.prices.recurring) {
      priceParams.recurring = { interval: def.prices.recurring.interval };
    }

    const price = await stripe.prices.create(priceParams);
    console.log(`    price ${cur.toUpperCase()}: ${price.id}`);

    output.push({
      product_name: def.name,
      product_id: product.id,
      price_id: price.id,
      lookup_key: lookupKey,
      currency: cur.toUpperCase(),
      amount_display: formatAmount(cur, amount),
      recurring: def.prices.recurring?.interval || "one_time",
      mode,
      status: "created",
    });
  }

  console.log("");
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  VOLYNX Stripe Catalog Setup");
  console.log(`  Mode: ${mode.toUpperCase()}`);
  console.log("═══════════════════════════════════════\n");

  console.log("── Builder Subscriptions ──\n");
  for (const def of BUILDER_SUBS) await createProductWithPrices(def);

  console.log("── Studio Pro ──\n");
  await createProductWithPrices(STUDIO_PRO);

  console.log("── Token Packs ──\n");
  for (const def of TOKEN_PACKS) await createProductWithPrices(def);

  console.log("── Add-ons ──\n");
  for (const def of ADDONS) await createProductWithPrices(def);

  // ── Output file (no secrets, only IDs) ──
  const outPath = resolve(__dirname, "stripe-catalog-output.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  // ── Summary ──
  const productCount = new Set(output.map((o) => o.product_id)).size;
  console.log("═══════════════════════════════════════");
  console.log(`  ${productCount} products, ${output.length} prices created`);
  console.log(`  Output: scripts/stripe-catalog-output.json`);
  console.log("═══════════════════════════════════════\n");

  const families = [...new Set(output.map((o) => {
    const m = o.lookup_key.split("_");
    return m[0];
  }))];
  for (const fam of families) {
    const items = output.filter((o) => o.lookup_key.startsWith(fam));
    const prods = new Set(items.map((o) => o.product_id)).size;
    console.log(`  ${fam}: ${prods} products, ${items.length} prices`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
