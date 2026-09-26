#!/usr/bin/env node

/**
 * VOLYNX commerce E2E readiness matrix.
 *
 * Read-only by design: this command never creates Checkout Sessions, Prices,
 * payments, entitlements, or delivery records. It checks that the live Stripe
 * catalog is reconciled with the fulfillment branches and reports existing
 * paid sessions that can be used as evidence.
 *
 * Run:
 *   npm run commerce:e2e:check
 *
 * Refresh the live catalog report first when it is stale:
 *   npm run monetization:check:live
 */

import Stripe from "stripe";
import dotenv from "dotenv";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

dotenv.config({ path: resolve("scripts/.env"), quiet: true });

const reportPath = resolve("scripts/stripe-catalog-live-reconcile-output.json");
const webhookPath = resolve("supabase/functions/stripe-webhook/index.ts");
const checkoutPath = resolve("supabase/functions/create-checkout-session/index.ts");
const deliveryPath = resolve("src/pages/delivery/index.astro");
const refreshIconsPath = resolve("supabase/functions/refresh-icons-url/index.ts");
const refreshKitPath = resolve("supabase/functions/refresh-kit-url/index.ts");
const refreshPropertyFlowPath = resolve("supabase/functions/refresh-pf-url/index.ts");

const failures = [];
const warnings = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function withoutCurrency(lookupKey) {
  return String(lookupKey || "").replace(/_(gbp|eur|brl)$/i, "");
}

function familyFor(prefix) {
  if (/^(builder_|studio_|daily_|cvitae_|bundle_)/.test(prefix)) return "subscriptions";
  if (prefix.startsWith("devjourney_")) return "devjourney";
  if (prefix.startsWith("tokens_")) return "tokens";
  if (prefix.startsWith("addon_")) return "addons";
  if (prefix.startsWith("icons_")) return "icons";
  if (prefix.startsWith("kit_")) return "kits";
  if (prefix.startsWith("pf_")) return "propertyflow";
  if (prefix === "checkout_smoke_test") return "smoke";
  return "unmapped";
}

function summarizePaidSession(session, lineItems) {
  return {
    id: session.id,
    created: new Date(session.created * 1000).toISOString(),
    mode: session.mode,
    amount: session.amount_total,
    currency: session.currency,
    products: lineItems.map((item) => withoutCurrency(item.price?.lookup_key)),
  };
}

const [report, webhookSource, checkoutSource, deliverySource, refreshIconsSource, refreshKitSource, refreshPropertyFlowSource] = await Promise.all([
  readFile(reportPath, "utf8").then(JSON.parse),
  readFile(webhookPath, "utf8"),
  readFile(checkoutPath, "utf8"),
  readFile(deliveryPath, "utf8"),
  readFile(refreshIconsPath, "utf8"),
  readFile(refreshKitPath, "utf8"),
  readFile(refreshPropertyFlowPath, "utf8"),
]);

const reportInfo = await stat(reportPath);
const reportGeneratedAt = report.generatedAt ? Date.parse(report.generatedAt) : reportInfo.mtimeMs;
const reportAgeMinutes = (Date.now() - reportGeneratedAt) / 60_000;
expect(report.mode === "live", "O relatório do catálogo não é live.");
expect(report.applied === false, "A checagem exige um relatório read-only; nenhum apply é permitido.");
expect(report.actions?.length === 0, `O catálogo live tem ${report.actions?.length || 0} ação(ões) pendente(s).`);
expect(reportAgeMinutes <= 15, "O relatório live está velho; execute npm run monetization:check:live antes desta checagem.");

const offers = [...new Set((report.prices || []).map((price) => withoutCurrency(price.lookup_key)))].sort();
const families = Object.groupBy(offers, familyFor);

const branchChecks = {
  subscriptions: ["PLAN_PROFILE_MAP", "function isSubscription", "session.mode === \"subscription\""],
  devjourney: ["DEVJOURNEY_TIERS", 'event_type: "devjourney_activated"'],
  tokens: ["TOKEN_CREDITS", "credit_token_purchase_atomic"],
  addons: ['prefix.startsWith("addon_")', 'event_type: "addon_activated"'],
  icons: ['prefix.startsWith("icons_")', 'event_type: "icons_delivered"'],
  kits: ['prefix.startsWith("kit_")', 'event_type: "kit_delivered"'],
  propertyflow: ['prefix.startsWith("pf_")', 'event_type: "propertyflow_ready"'],
  smoke: ["isCheckoutSmokeTest", "checkout_smoke_test"],
};

const familyResults = {};
for (const [family, prefixes] of Object.entries(families)) {
  const checks = branchChecks[family] || [];
  const missing = checks.filter((needle) => ![webhookSource, checkoutSource, deliverySource].some((source) => source.includes(needle)));
  if (family === "icons" && !refreshIconsSource.includes("createSignedUrl")) missing.push("refresh-icons-url signing");
  if (family === "kits" && !refreshKitSource.includes("createSignedUrl")) missing.push("refresh-kit-url signing");
  if (family === "propertyflow" && !refreshPropertyFlowSource.includes("createSignedUrl")) missing.push("refresh-pf-url signing");
  familyResults[family] = {
    offers: prefixes.length,
    sample: prefixes.slice(0, 5),
    branch: missing.length === 0 ? "covered" : "missing",
    missing,
  };
  expect(missing.length === 0, `${family}: branch incompleto (${missing.join(", ")}).`);
}

expect(!families.unmapped?.length, `Offers sem família reconhecida: ${(families.unmapped || []).join(", ")}`);
expect(report.prices?.every((price) => price.status === "ok"), "O relatório contém preços live fora do contrato esperado.");

let paidSessions = [];
if (process.env.STRIPE_LIVE_SECRET_KEY?.startsWith("sk_live_")) {
  const stripe = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  for (const session of sessions.data.filter((item) => item.status === "complete" && item.payment_status === "paid")) {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10, expand: ["data.price"] });
    paidSessions.push(summarizePaidSession(session, lineItems.data));
  }
} else {
  warnings.push("STRIPE_LIVE_SECRET_KEY não está disponível; evidência de sessões pagas não foi consultada.");
}

const evidenceFamilies = new Set(
  paidSessions.flatMap((session) => session.products.map(familyFor)),
);

const result = {
  generatedAt: new Date().toISOString(),
  readOnly: true,
  catalog: {
    offers: offers.length,
    prices: report.prices?.length || 0,
    pendingActions: report.actions?.length || 0,
    reportAgeMinutes: Number(reportAgeMinutes.toFixed(2)),
  },
  families: familyResults,
  paidSessionEvidence: {
    sessions: paidSessions,
    familiesSeen: [...evidenceFamilies].sort(),
  },
  warnings,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length) {
  process.exitCode = 1;
} else {
  console.error(`Commerce E2E readiness passed: ${offers.length} offers, ${report.prices.length} prices, ${paidSessions.length} existing paid session(s).`);
}
