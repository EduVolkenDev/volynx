import Stripe from "stripe";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("/Users/eduardovolken_1/VOLYNX/scripts/.env", "utf8")
    .split("\n").filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")]; })
);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });

// 1. List webhook endpoints to find the right whsec
const eps = await stripe.webhookEndpoints.list({ limit: 10 });
console.log("=== Webhook endpoints ===");
eps.data.forEach(e => console.log(`  ${e.id} → ${e.url} (status=${e.status}, ${e.api_version}) secret_prefix=${e.secret?.slice(0,12) || "—"}...`));

// 2. Check if .env whsec matches any
console.log(`\n.env whsec prefix: ${env.STRIPE_WEBHOOK_SECRET?.slice(0,12)}...`);

// 3. List Builder prices
console.log("\n=== Builder prices in test mode ===");
const all = await stripe.prices.list({ limit: 50, expand: ["data.product"] });
all.data.filter(p => p.lookup_key?.match(/^(volynx|builder|tokens|kit|addon|pf|cvitae|daily|bundle|icons)_/)).forEach(p => {
  console.log(`  ${p.lookup_key?.padEnd(38)} → ${p.id}  (£${(p.unit_amount/100).toFixed(2)})`);
});

