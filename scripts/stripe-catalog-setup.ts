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
    name: "VX Pack — Starter (12)",
    description: "12 VX for light usage and one-off premium actions. Entry pack.",
    lookupPrefix: "tokens_starter",
    metadata: {
      product_family: "tokens",
      plan_tier: "starter",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "12",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 990, eur: 1190, brl: 6900 } },
  },
  {
    name: "VX Pack — Core (32)",
    description: "32 VX — the best balance between value and premium capacity. Most popular.",
    lookupPrefix: "tokens_core",
    metadata: {
      product_family: "tokens",
      plan_tier: "core",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "32",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 1990, eur: 2490, brl: 14900 } },
  },
  {
    name: "VX Pack — Pro (80)",
    description: "80 VX — for frequent users and more demanding workflows. Best value.",
    lookupPrefix: "tokens_pro",
    metadata: {
      product_family: "tokens",
      plan_tier: "pro",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "80",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 3990, eur: 4990, brl: 28900 } },
  },
  {
    name: "VX Pack — Elite (200)",
    description: "200 VX — maximum capacity for heavy usage and larger operations.",
    lookupPrefix: "tokens_scale",
    metadata: {
      product_family: "tokens",
      plan_tier: "scale",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "200",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 7900, eur: 9900, brl: 57900 } },
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
    name: "Icon Collection Pack (5 Premium)",
    description: "5 permanent premium icon collections: 3D Icons, Futuristic, Neon, Metal Blue, Nature. 200+ icons, no expiry.",
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
  {
    name: "Icons Store Single - Budget",
    description: "Accessible single-icon license for lighter SVG/PNG assets.",
    lookupPrefix: "icons_single_budget",
    metadata: {
      product_family: "icons_store",
      plan_tier: "single_budget",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "single",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 90, eur: 110, brl: 690 } },
  },
  {
    name: "Icons Store Single - Standard",
    description: "Standard single-icon license for premium SVG singles and mid-tier PNG assets.",
    lookupPrefix: "icons_single_standard",
    metadata: {
      product_family: "icons_store",
      plan_tier: "single_standard",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "single",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 190, eur: 230, brl: 1390 } },
  },
  {
    name: "Icons Store Single - Premium",
    description: "Premium single-icon license for high-detail chromed, metal, iridescent and similar assets.",
    lookupPrefix: "icons_single_premium",
    metadata: {
      product_family: "icons_store",
      plan_tier: "single_premium",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "single",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 290, eur: 350, brl: 1990 } },
  },
  {
    name: "Icons Store Single - Hyper 5000px",
    description: "Top-tier single-icon license for Hyper Icons 5000px source-quality assets.",
    lookupPrefix: "icons_single_hyper",
    metadata: {
      product_family: "icons_store",
      plan_tier: "single_hyper",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "single_hyper_5000px",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 590, eur: 690, brl: 3990 } },
  },
  {
    name: "Icons Store Pack - Mixed",
    description: "Mixed free/premium icon pack checkout for accessible collection purchases.",
    lookupPrefix: "icons_pack_mixed",
    metadata: {
      product_family: "icons_store",
      plan_tier: "pack_mixed",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "pack",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 490, eur: 590, brl: 3490 } },
  },
  {
    name: "Icons Store Pack - Premium",
    description: "Premium icon pack checkout for high-quality collections.",
    lookupPrefix: "icons_pack_premium",
    metadata: {
      product_family: "icons_store",
      plan_tier: "pack_premium",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "pack",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 990, eur: 1190, brl: 6900 } },
  },
  {
    name: "Icons Store Pack - Hyper 5000px",
    description: "Hyper Icons 5000px premium pack checkout.",
    lookupPrefix: "icons_pack_hyper",
    metadata: {
      product_family: "icons_store",
      plan_tier: "pack_hyper",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "pack_hyper_5000px",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 1990, eur: 2390, brl: 13900 } },
  },
];

// ── Daily OS Subscriptions ────────────────────────────────

const DAILY_SUBS: ProductDef[] = [
  {
    name: "Daily Pro",
    description: "Full access to VOLYNX Daily tools: Scanner, Summary, Vault, Writing, Decision with cloud sync and exports.",
    marketingFeatures: [
      "Unlimited tool usage",
      "Cloud sync across devices",
      "Export to PDF/Markdown",
      "Priority processing",
      "Premium AI quality",
    ],
    lookupPrefix: "daily_pro",
    metadata: {
      product_family: "daily",
      plan_tier: "pro",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 1200, eur: 1490, brl: 8900 } },
  },
  {
    name: "Daily Diamond",
    description: "Premium Daily tier with API access, shared vaults, team notes, analytics and priority everything.",
    marketingFeatures: [
      "Everything in Pro",
      "API access",
      "Shared vaults & team notes",
      "Admin analytics",
      "Priority queue",
    ],
    lookupPrefix: "daily_diamond",
    metadata: {
      product_family: "daily",
      plan_tier: "diamond",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 2900, eur: 3490, brl: 19900 } },
  },
];

// ── Bundle Subscriptions ─────────────────────────────────

const BUNDLE_SUBS: ProductDef[] = [
  {
    name: "VOLYNX + Daily Pro Bundle",
    description: "Builder Pro + Daily Pro in one subscription. Save vs buying separately.",
    marketingFeatures: [
      "Builder Pro (3 sites, custom domain)",
      "Daily Pro (all tools, sync, export)",
      "Single subscription",
      "Bundle discount",
    ],
    lookupPrefix: "bundle_volynx_daily_pro",
    metadata: {
      product_family: "bundle",
      plan_tier: "pro",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "1",
      builder_sites_limit: "3",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 2900, eur: 3490, brl: 19900 } },
  },
  {
    name: "VOLYNX Studio + Daily Diamond Bundle",
    description: "Builder Studio + Daily Diamond in one subscription. Maximum access to both products.",
    marketingFeatures: [
      "Builder Studio (10 sites, full kits)",
      "Daily Diamond (API, teams, analytics)",
      "Single subscription",
      "Best bundle value",
    ],
    lookupPrefix: "bundle_volynx_daily_studio",
    metadata: {
      product_family: "bundle",
      plan_tier: "studio",
      billing_type: "subscription",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "3",
      builder_sites_limit: "10",
      is_addon: "false",
    },
    prices: { recurring: { interval: "month" }, amounts: { gbp: 5900, eur: 6990, brl: 39900 } },
  },
];

// ── PropertyFlow Products ─────────────────────────────────

const PROPERTYFLOW: ProductDef[] = [
  {
    name: "PropertyFlow Starter (3 templates)",
    description: "Property management platform with 3 grid layout templates. Full React source, catalogue, filters, bilingual.",
    marketingFeatures: [
      "3 grid layout templates",
      "Full React source code",
      "Property catalogue + filters",
      "Bilingual interface (EN/PT)",
      "Responsive design",
    ],
    lookupPrefix: "pf_starter",
    metadata: {
      product_family: "propertyflow",
      plan_tier: "starter",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 14900, eur: 17900, brl: 104900 } },
  },
  {
    name: "PropertyFlow Professional (6 templates)",
    description: "Full PropertyFlow kit with 6 grid templates, Supabase backend, admin dashboard, enquiry capture.",
    marketingFeatures: [
      "6 grid layout templates",
      "Supabase backend integration",
      "Admin dashboard",
      "Image gallery + modals",
      "Enquiry capture system",
      "Deployment guide",
    ],
    lookupPrefix: "pf_professional",
    metadata: {
      product_family: "propertyflow",
      plan_tier: "professional",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 34900, eur: 41900, brl: 244900 } },
  },
  {
    name: "PropertyFlow Enterprise (15 templates)",
    description: "Complete PropertyFlow with 15 grid templates, custom branding kit, priority onboarding, data migration.",
    marketingFeatures: [
      "15 grid layout templates",
      "Custom branding starter kit",
      "Priority onboarding",
      "Data migration support",
      "Dedicated support channel",
    ],
    lookupPrefix: "pf_enterprise",
    metadata: {
      product_family: "propertyflow",
      plan_tier: "enterprise",
      billing_type: "one_time",
      currency_scope: "multi",
      includes_tokens: "0",
      includes_icons: "false",
      builder_sites_limit: "0",
      is_addon: "false",
    },
    prices: { amounts: { gbp: 59900, eur: 69900, brl: 419900 } },
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

  console.log("── Builder Subscriptions (Volynx) ──\n");
  for (const def of BUILDER_SUBS) await createProductWithPrices(def);

  console.log("── Studio Pro ──\n");
  await createProductWithPrices(STUDIO_PRO);

  console.log("── Daily OS Subscriptions ──\n");
  for (const def of DAILY_SUBS) await createProductWithPrices(def);

  console.log("── Bundle Subscriptions ──\n");
  for (const def of BUNDLE_SUBS) await createProductWithPrices(def);

  console.log("── Token Packs ──\n");
  for (const def of TOKEN_PACKS) await createProductWithPrices(def);

  console.log("── Add-ons ──\n");
  for (const def of ADDONS) await createProductWithPrices(def);

  console.log("── PropertyFlow ──\n");
  for (const def of PROPERTYFLOW) await createProductWithPrices(def);

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
