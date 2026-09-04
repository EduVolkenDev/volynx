import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const supabaseUrl = "https://zdmpzrderifgqmqivjoy.supabase.co";
const functionBaseUrl = `${supabaseUrl}/functions/v1`;
const reportPath = resolve("scripts/stripe-catalog-live-reconcile-output.json");

const webhookPath = resolve("supabase/functions/stripe-webhook/index.ts");
const checkoutPath = resolve("supabase/functions/create-checkout-session/index.ts");
const tiktokPath = resolve("src/pages/tiktok.astro");
const imageSuitePath = resolve("src/pages/volynx-lab/image-suite/index.astro");
const labToolShellPath = resolve("src/components/LabToolShell.astro");
const labUpgradeBannerPath = resolve("src/components/LabUpgradeBanner.astro");
const fulfillmentFunctions = [
  "send-purchase-email",
  "refresh-icons-url",
  "refresh-kit-url",
  "refresh-pf-url",
];

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function withoutCurrency(lookupKey) {
  return lookupKey.replace(/_(gbp|eur|brl)$/i, "");
}

async function request(url, options) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(15_000), ...options });
  } catch (error) {
    failures.push(`${url} did not respond: ${error.message}`);
    return null;
  }
}

// The companion `monetization:check:live` command refreshes this ignored
// report with a read-only Stripe dry-run. Keep the report recent so this
// command cannot accidentally validate a stale production catalog snapshot.
try {
  const info = await stat(reportPath);
  const ageMs = Date.now() - info.mtimeMs;
  expect(ageMs <= 15 * 60 * 1000, "Live catalog report is older than 15 minutes. Run npm run monetization:check:live first.");
} catch (error) {
  failures.push(`Could not inspect live catalog report: ${error.message}`);
}

let report;
try {
  report = JSON.parse(await readFile(reportPath, "utf8"));
} catch (error) {
  failures.push(`Could not read live catalog report: ${error.message}`);
}

const [webhookSource, checkoutSource, tiktokSource, imageSuiteSource, labToolShellSource, labUpgradeBannerSource] = await Promise.all([
  readFile(webhookPath, "utf8"),
  readFile(checkoutPath, "utf8"),
  readFile(tiktokPath, "utf8"),
  readFile(imageSuitePath, "utf8"),
  readFile(labToolShellPath, "utf8"),
  readFile(labUpgradeBannerPath, "utf8"),
]);

if (report) {
  expect(report.mode === "live", "Catalog report is not using the live Stripe account.");
  expect(report.applied === false, "Readiness check must never mutate the live Stripe catalog.");
  expect(Array.isArray(report.actions) && report.actions.length === 0, "Live catalog still has pending reconciliation actions.");
  expect(Array.isArray(report.prices) && report.prices.length > 0, "Live catalog report contains no prices.");

  const incorrectPrices = report.prices?.filter((price) => price.status !== "ok") || [];
  expect(incorrectPrices.length === 0, `Live catalog has ${incorrectPrices.length} price mismatch(es).`);

  const productKeys = [...new Set((report.prices || []).map((price) => withoutCurrency(price.lookup_key)))].sort();
  const planKeys = productKeys.filter((key) => /^(builder_|studio_|daily_|cvitae_|bundle_)/.test(key));
  const tokenKeys = productKeys.filter((key) => key.startsWith("tokens_"));
  const journeyKeys = productKeys.filter((key) => key.startsWith("devjourney_"));

  for (const key of planKeys) {
    expect(
      new RegExp(`\\b${key}:\\s*\\{`).test(webhookSource),
      `Subscription ${key} has no profile-entitlement mapping in stripe-webhook.`,
    );
  }
  for (const key of tokenKeys) {
    expect(
      new RegExp(`\\b${key}:\\s*\\d+`).test(webhookSource),
      `Token pack ${key} has no token-credit mapping in stripe-webhook.`,
    );
  }
  for (const key of journeyKeys) {
    expect(
      new RegExp(`\\b${key}:\\s*"`).test(webhookSource),
      `Dev Journey offer ${key} has no access-tier mapping in stripe-webhook.`,
    );
  }

  const contractChecks = [
    ["one-time add-ons", productKeys.some((key) => key.startsWith("addon_")), webhookSource.includes('prefix.startsWith("addon_")')],
    ["icon delivery", productKeys.some((key) => key.startsWith("icons_")), webhookSource.includes('prefix.startsWith("icons_")')],
    ["kit delivery", productKeys.some((key) => key.startsWith("kit_")), webhookSource.includes('prefix.startsWith("kit_")')],
    ["PropertyFlow delivery", productKeys.some((key) => key.startsWith("pf_")), webhookSource.includes('prefix.startsWith("pf_")')],
    ["checkout smoke route", productKeys.includes("checkout_smoke_test"), checkoutSource.includes("isCheckoutSmokeTest")],
  ];
  for (const [name, offered, implemented] of contractChecks) {
    expect(!offered || implemented, `Catalog offers ${name}, but its fulfillment branch is missing.`);
  }

  expect(
    !productKeys.includes("pf_enterprise") || webhookSource.includes('prefix === "pf_enterprise" ? "pf_white_label"'),
    "PropertyFlow enterprise price lacks its canonical fulfillment alias.",
  );
}

expect(checkoutSource.includes("allow_promotion_codes: true"), "Checkout no longer allows promotion codes.");
expect(checkoutSource.includes("shouldBlockTestStripeKey"), "Checkout no longer blocks test Stripe credentials on production.");
expect(checkoutSource.includes("shouldBlockLiveStripeKey"), "Checkout no longer blocks live checkout outside volynx.world.");
expect(webhookSource.includes("stripe.webhooks.constructEvent"), "Webhook signature verification is missing.");
expect(webhookSource.includes("email_log"), "Transactional email queue is missing from the webhook.");
expect(tiktokSource.includes('productPreviewHref("studio_pro")'), "TikTok landing no longer routes the paid offer to Studio Pro.");
expect(tiktokSource.includes("tiktok_studio_offer"), "TikTok landing is missing a measurable Studio Pro conversion CTA.");
expect(imageSuiteSource.includes("STUDIO_PRO_OFFER_URL"), "iMage Suite upgrade gate no longer points to the Studio Pro offer.");
expect(labToolShellSource.includes('productPreviewHref("studio_pro")'), "iMage Suite tool shell no longer points to Studio Pro.");
expect(labUpgradeBannerSource.includes('productPreviewHref("studio_pro")'), "Lab upgrade banner no longer points to Studio Pro.");

const optionChecks = await Promise.all([
  "create-checkout-session",
  "stripe-webhook",
  ...fulfillmentFunctions,
].map(async (name) => {
  const response = await request(`${functionBaseUrl}/${name}`, { method: "OPTIONS" });
  expect(response?.status === 200, `Live Edge Function ${name} did not return HTTP 200 to CORS preflight.`);
  return name;
}));

const protectedChecks = await Promise.all([
  "create-checkout-session",
  ...fulfillmentFunctions,
].map(async (name) => {
  const response = await request(`${functionBaseUrl}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  expect(response?.status === 401, `Live Edge Function ${name} did not reject an unauthenticated purchase request.`);
  return name;
}));

if (failures.length) {
  console.error(`Monetization readiness failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Monetization readiness passed: ${report.prices.length} live prices, ${new Set(report.prices.map((price) => withoutCurrency(price.lookup_key))).size} offers, ${optionChecks.length} deployed functions, ${protectedChecks.length} auth gates.`,
);
