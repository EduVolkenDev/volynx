import Stripe from "stripe";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("./scripts/.env","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const [k,...v]=l.split("=");return[k.trim(),v.join("=").trim().replace(/^"|"$/g,"")];}));
const stripe = new Stripe(env.STRIPE_SECRET_KEY,{apiVersion:"2026-02-25.clover"});

const WHSEC = "whsec_J9T0B9BFufBchDyVEjrWce2zt3GZUkDR";
const URL = "https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/stripe-webhook";

// 1. Try Stripe SDK's official test helper to sign
const samplePayload = JSON.stringify({
  id: "evt_test_001",
  object: "event",
  type: "ping.test",
  data: { object: {} },
  created: Math.floor(Date.now()/1000),
  livemode: false
});

const sig = stripe.webhooks.generateTestHeaderString({ payload: samplePayload, secret: WHSEC });
console.log("Generated signature:", sig);

const r = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
  body: samplePayload
});
console.log(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);

// 2. List endpoints + secrets visibility
console.log("\nEndpoints:");
const eps = await stripe.webhookEndpoints.list({ limit: 5 });
eps.data.forEach(e => {
  console.log(`  ${e.id} → ${e.url}`);
  console.log(`    enabled=${e.enabled_events?.length} status=${e.status} api=${e.api_version}`);
  console.log(`    secret in response: ${e.secret || '(hidden)'}`);
});

// 3. Inspect: maybe there are multiple endpoints and the right whsec is for a different one
