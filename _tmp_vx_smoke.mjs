// VOLYNX smoke test — fabrica 4 webhook events válidos pro stripe-webhook
// Usa STRIPE_SECRET_KEY pra criar Sessions reais, depois assina o event
// payload com STRIPE_WEBHOOK_SECRET (HMAC) e POSTa pro endpoint Supabase.
// Webhook não distingue de event Stripe real.

import Stripe from "stripe";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("/Users/eduardovolken_1/VOLYNX/scripts/.env", "utf8")
    .split("\n").filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
    })
);

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = "https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/stripe-webhook";
const USER_ID = "6951b05e-6105-41ea-a96a-93e0ff9600b0";
const USER_EMAIL = "edupelomundo13@gmail.com";

if (!env.STRIPE_SECRET_KEY?.startsWith("sk_")) throw new Error("Missing STRIPE_SECRET_KEY");
if (!WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
console.log(`stripe key: ${env.STRIPE_SECRET_KEY.slice(0, 12)}…  whsec: ${WEBHOOK_SECRET.slice(0, 12)}…\n`);

const SKUs = [
  { name: "Token pack Starter (12 VX £)",    key: "tokens_starter_gbp",        mode: "payment" },
  { name: "Builder Launch (£/mo)",            key: "volynx_launch_gbp",         mode: "subscription" },
  { name: "Kit Portfolio Starter (£)",        key: "kit_portfolio_personal_gbp", mode: "payment" },
  { name: "Add-on Domain Setup (£)",          key: "addon_domain_setup_gbp",    mode: "payment" }
];

function signEvent(body, secret) {
  const t = Math.floor(Date.now() / 1000);
  const signed = `${t}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${t},v1=${sig}`;
}

async function fireWebhook(eventObj) {
  const body = JSON.stringify(eventObj);
  const sig = signEvent(body, WEBHOOK_SECRET);
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body
  });
  return { status: res.status, body: await res.text() };
}

async function findPriceByLookup(key) {
  const r = await stripe.prices.list({ lookup_keys: [key], expand: ["data.product"], limit: 1 });
  return r.data[0];
}

async function runSku(sku) {
  console.log(`▸ ${sku.name} — ${sku.key} (mode=${sku.mode})`);
  const price = await findPriceByLookup(sku.key);
  if (!price) { console.error(`  ❌ no price for ${sku.key}`); return null; }
  console.log(`  price: ${price.id}  £${(price.unit_amount/100).toFixed(2)} ${price.currency}`);

  // Subscription path: pre-create Subscription via API (Stripe Customer) so the
  // webhook handler's stripe.subscriptions.retrieve(sub.id) returns a real obj.
  let subId = null;
  let customerId = null;
  if (sku.mode === "subscription") {
    const customer = await stripe.customers.create({
      email: USER_EMAIL,
      metadata: { user_id: USER_ID, smoke_test: "true" }
    });
    customerId = customer.id;
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: "allow_incomplete",
      trial_period_days: 1, // bypass instant payment requirement
      metadata: { user_id: USER_ID, plan_key: price.lookup_key, lookup_key: price.lookup_key }
    });
    subId = sub.id;
    console.log(`  customer: ${customerId}  subscription: ${subId} (status=${sub.status})`);
  }

  // Real Checkout Session via API (status=open, but session.id + line_items
  // are real, so the webhook's listLineItems(session.id) will succeed).
  const session = await stripe.checkout.sessions.create({
    mode: sku.mode,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: "https://volynx.world/profile/?payment=success",
    cancel_url: "https://volynx.world/pricing/",
    customer_email: sku.mode === "subscription" ? undefined : USER_EMAIL,
    customer: sku.mode === "subscription" ? customerId : undefined,
    metadata: {
      user_id: USER_ID,
      lookup_key: price.lookup_key,
      smoke_test: "true"
    },
    ...(sku.mode === "subscription" && {
      subscription_data: {
        metadata: { user_id: USER_ID, plan_key: price.lookup_key, lookup_key: price.lookup_key }
      }
    })
  });
  console.log(`  session: ${session.id}`);

  // Forge the completion event. Override fields the webhook reads as if paid:
  //   payment_status: 'paid', status: 'complete', subscription: <real sub.id>
  const fakeSession = {
    ...session,
    payment_status: "paid",
    status: "complete",
    subscription: subId,
    customer: customerId || session.customer,
    customer_details: {
      email: USER_EMAIL,
      name: null, phone: null, address: null, tax_exempt: "none", tax_ids: []
    },
    amount_total: price.unit_amount,
    amount_subtotal: price.unit_amount,
    currency: price.currency
  };

  const event = {
    id: `evt_smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: "event",
    api_version: "2026-02-25.clover",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object: fakeSession }
  };

  const result = await fireWebhook(event);
  console.log(`  webhook: HTTP ${result.status} → ${result.body.slice(0, 200)}`);

  return { sku: sku.key, session_id: session.id, sub_id: subId, http: result.status };
}

const results = [];
for (const sku of SKUs) {
  try {
    results.push(await runSku(sku));
  } catch (e) {
    console.error(`  ❌ ${sku.name}: ${e.message}`);
    results.push({ sku: sku.key, error: e.message });
  }
  console.log("");
}

console.log("\n=== SUMMARY ===");
console.table(results);
