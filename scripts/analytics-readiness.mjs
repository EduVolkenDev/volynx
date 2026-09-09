import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const requiredFiles = [
  "public/js/vx-analytics.js",
  "supabase/migrations/202609050001_marketing_analytics.sql",
  "supabase/functions/track-analytics-event/index.ts",
  "supabase/functions/analytics-summary/index.ts",
  "supabase/functions/stripe-webhook/index.ts",
  "src/pages/admin/analytics/index.astro",
];

const requiredSignals = [
  ["public/js/vx-analytics.js", "volynx_consent_v1"],
  ["public/js/vx-analytics.js", "PRIVATE_PAGE_PREFIXES"],
  ["public/js/vx-analytics.js", "track-analytics-event"],
  ["supabase/migrations/202609050001_marketing_analytics.sql", "enable row level security"],
  ["supabase/migrations/202609050001_marketing_analytics.sql", "revoke all on table public.analytics_events from anon, authenticated"],
  ["supabase/functions/analytics-summary/index.ts", "is_user_admin"],
  ["supabase/functions/stripe-webhook/index.ts", "recordServerAnalyticsEvent"],
  ["supabase/functions/stripe-webhook/index.ts", "payment_confirmed"],
  ["src/pages/admin/analytics/index.astro", "analyticsConsole"],
];

const contents = new Map();
for (const file of requiredFiles) {
  try {
    contents.set(file, await readFile(resolve(file), "utf8"));
  } catch {
    throw new Error(`Missing required analytics file: ${file}`);
  }
}

for (const [file, signal] of requiredSignals) {
  if (!contents.get(file)?.includes(signal)) {
    throw new Error(`Expected ${signal} in ${file}`);
  }
}

console.log(`Analytics readiness passed: ${requiredFiles.length} implementation files verified.`);
