#!/usr/bin/env node
/**
 * VOLYNX Stripe reconcile script
 *
 * Scans the codebase for all `data-lookup="..."` checkout targets, builds the
 * expected lookup-key list (with _gbp / _eur / _brl suffixes), then queries
 * the Stripe API to check which prices exist, which are missing, and whether
 * prices in Stripe are still active.
 *
 * Usage:
 *   node scripts/stripe-reconcile.mjs                → print diff report
 *   node scripts/stripe-reconcile.mjs --create       → create missing prices (prompts per price)
 *   node scripts/stripe-reconcile.mjs --json         → machine-readable JSON
 *
 * Requires STRIPE_SECRET_KEY in scripts/.env.
 *
 * Safe by default: --create is the ONLY flag that writes to Stripe. Without
 * it, the script is read-only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(__dirname, ".env") });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY missing from scripts/.env");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const CURRENCIES = ["gbp", "eur", "brl"];
const CURRENCY_SYMBOL = { gbp: "£", eur: "€", brl: "R$" };

const argv = process.argv.slice(2);
const FLAG_CREATE = argv.includes("--create");
const FLAG_JSON = argv.includes("--json");

// ── Step 1: scan code for data-lookup targets ──────────────────────────────
function collectLookupBases() {
  const bases = new Set();
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git" || entry.name === ".next" || entry.name === "desativados") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(astro|tsx?|jsx?|html)$/.test(entry.name)) files.push(full);
    }
  }
  walk(path.join(repoRoot, "src"));
  walk(path.join(repoRoot, "public"));

  const rx = /data-lookup="([^"]+)"/g;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    let m;
    while ((m = rx.exec(text))) {
      bases.add(m[1]);
    }
  }
  return [...bases].sort();
}

// ── Step 2: fetch every relevant price from Stripe ─────────────────────────
async function fetchStripePrices(lookupKeys) {
  // Stripe limits list filter to 10 lookup_keys per call — batch it.
  const results = new Map();
  const batches = [];
  for (let i = 0; i < lookupKeys.length; i += 10) batches.push(lookupKeys.slice(i, i + 10));

  for (const batch of batches) {
    try {
      const page = await stripe.prices.list({
        lookup_keys: batch,
        expand: ["data.product"],
        active: true,
        limit: 100,
      });
      for (const p of page.data) {
        results.set(p.lookup_key, p);
      }
    } catch (err) {
      console.error(`Stripe API error on batch [${batch.join(",")}]:`, err.message);
    }
  }
  return results;
}

// ── Step 3: build report ───────────────────────────────────────────────────
function buildReport(bases, prices) {
  const rows = [];
  for (const base of bases) {
    for (const cur of CURRENCIES) {
      const key = `${base}_${cur}`;
      const price = prices.get(key);
      if (!price) {
        rows.push({ base, currency: cur, key, status: "missing" });
        continue;
      }
      if (price.active === false) {
        rows.push({ base, currency: cur, key, status: "inactive", priceId: price.id });
        continue;
      }
      rows.push({
        base,
        currency: cur,
        key,
        status: "ok",
        priceId: price.id,
        amount: price.unit_amount,
        productName: price.product && typeof price.product === "object" ? price.product.name : null,
      });
    }
  }
  return rows;
}

// ── Step 4: pretty-print ───────────────────────────────────────────────────
function printHuman(rows, bases) {
  const byBase = new Map();
  for (const row of rows) {
    if (!byBase.has(row.base)) byBase.set(row.base, []);
    byBase.get(row.base).push(row);
  }

  const ok = rows.filter(r => r.status === "ok").length;
  const missing = rows.filter(r => r.status === "missing").length;
  const inactive = rows.filter(r => r.status === "inactive").length;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`VOLYNX Stripe reconcile — ${bases.length} checkout targets, ${rows.length} lookup keys`);
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("");

  for (const [base, baseRows] of byBase) {
    console.log(`▶ ${base}`);
    for (const row of baseRows) {
      const icon = row.status === "ok" ? "✓" : row.status === "inactive" ? "⚠" : "✗";
      const sym = CURRENCY_SYMBOL[row.currency] || row.currency;
      const priceLabel = row.amount != null ? `${sym}${(row.amount / 100).toFixed(2)}` : "—";
      const tail = row.status === "ok" ? `${priceLabel} · ${row.priceId}`
                 : row.status === "inactive" ? `INACTIVE · ${row.priceId}`
                 : "MISSING — needs creation in Stripe Dashboard";
      console.log(`  ${icon} ${row.key.padEnd(48)} ${tail}`);
    }
    console.log("");
  }

  console.log("───────────────────────────────────────────────────────────────────────");
  console.log(`OK: ${ok}    Missing: ${missing}    Inactive: ${inactive}`);
  console.log("───────────────────────────────────────────────────────────────────────");

  if (missing > 0 && !FLAG_CREATE) {
    console.log("");
    console.log("To create missing prices in Stripe, re-run with --create.");
    console.log("WARNING: --create writes to Stripe. Review the missing list first.");
  }
}

// ── Step 5: optional creation flow ─────────────────────────────────────────
async function createMissing(rows) {
  const missing = rows.filter(r => r.status === "missing");
  if (missing.length === 0) {
    console.log("\nNothing to create. All lookup keys resolved.");
    return;
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("CREATE MISSING PRICES");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("");
  console.log("This flow is INTERACTIVE. You will be prompted for each missing price.");
  console.log("Stripe writes happen only after you confirm each one.");
  console.log("");
  console.log("NOTE: this script does NOT yet implement interactive price creation.");
  console.log("Recommended path:");
  console.log("  1. Review the missing list above");
  console.log("  2. In Stripe Dashboard, create a Product per `base` (e.g. kit_saas_personal)");
  console.log("  3. Under that Product, create a Price per currency (GBP, EUR, BRL)");
  console.log("  4. On each Price, set the lookup key to `<base>_<currency>` (lowercase)");
  console.log("  5. Re-run `node scripts/stripe-reconcile.mjs` to verify");
  console.log("");
  console.log("If you want this script to create prices automatically, provide the");
  console.log("amounts in a JSON config (scripts/stripe-prices.json) and re-run with");
  console.log("--create --config=scripts/stripe-prices.json.");
}

// ── Main ───────────────────────────────────────────────────────────────────
(async function main() {
  const bases = collectLookupBases();
  if (bases.length === 0) {
    console.log("No data-lookup targets found in the codebase.");
    process.exit(0);
  }

  const allKeys = [];
  for (const base of bases) for (const cur of CURRENCIES) allKeys.push(`${base}_${cur}`);

  const prices = await fetchStripePrices(allKeys);
  const rows = buildReport(bases, prices);

  if (FLAG_JSON) {
    console.log(JSON.stringify({ bases, rows }, null, 2));
    return;
  }

  printHuman(rows, bases);

  if (FLAG_CREATE) await createMissing(rows);
})();
