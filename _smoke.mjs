// VOLYNX smoke test — fabrica webhook events com session.id REAL
// (apontando pra prices reais com lookup_key) e assina com whsec correto.

import Stripe from "stripe";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("./scripts/.env", "utf8")
    .split("\n").filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")]; })
);

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
const WEBHOOK_SECRET = "whsec_J9T0B9BFufBchDyVEjrWce2zt3GZUkDR"; // user-supplied for this session
const WEBHOOK_URL = "https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/stripe-webhook";
const USER_ID = "6951b05e-6105-41ea-a96a-93e0ff9600b0";
const USER_EMAIL = "edupelomundo13@gmail.com";

const SKUs = [
  { lookup: "tokens_starter_gbp",        label: "Token pack Starter (12 VX £8.40)", mode: "payment" },
  { lookup: "builder_launch_gbp",        label: "Builder Launch (£11/mo)",          mode: "subscription" },
  { lookup: "kit_portfolio_personal_gbp",label: "Kit Portfolio Starter (£47)",      mode: "payment" },
  { lookup: "addon_domain_setup_gbp",    label: "Add-on Domain Setup (£15)",        mode: "payment" }
];

function signEvent(body, secret) {
  const t = Math.floor(Date.now() / 1000);
  const signed = `${t}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${t},v1=${sig}`;
}

async function fireEvent(event) {
  const body = JSON.stringify(event);
  const sig = signEvent(body, WEBHOOK_SECRET);
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body
  });
  return { status: res.status, body: (await res.text()).slice(0, 200) };
}

async function findPrice(lookup) {
  const r = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  return r.data[0];
}

async function runSku(sku) {
  console.log(`\n▸ ${sku.label}`);
  const price = await findPrice(sku.lookup);
  if (!price) { console.error(`  ❌ no price`); return { sku: sku.lookup, error: "no_price" }; }

  // Customer + attach test pm
  const customer = await stripe.customers.create({
    email: USER_EMAIL,
    metadata: { user_id: USER_ID, smoke_test: "2026-05-01" }
  });
  const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: pm.id }
  });

  // For subscription, pre-create the Subscription so session.subscription points to a real id
  let subId = null;
  if (sku.mode === "subscription") {
    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      default_payment_method: pm.id,
      metadata: { user_id: USER_ID, plan_key: price.lookup_key, lookup_key: price.lookup_key },
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"]
    });
    subId = sub.id;
    // Try to confirm the invoice's PI so subscription becomes active
    const invPi = sub.latest_invoice?.payment_intent;
    if (invPi?.status === "requires_confirmation" || invPi?.status === "requires_payment_method") {
      try { await stripe.paymentIntents.confirm(invPi.id, { payment_method: pm.id }); } catch (_) {}
    }
    console.log(`  customer=${customer.id}  subscription=${subId}`);
  }

  // Create real Checkout Session (state=open, but session.id real → listLineItems works)
  const session = await stripe.checkout.sessions.create({
    mode: sku.mode,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: "https://volynx.world/profile/?payment=success",
    cancel_url: "https://volynx.world/pricing/",
    customer: customer.id,
    metadata: { user_id: USER_ID, lookup_key: price.lookup_key, smoke_test: "true" },
    ...(sku.mode === "subscription" && {
      subscription_data: { metadata: { user_id: USER_ID, plan_key: price.lookup_key, lookup_key: price.lookup_key } }
    })
  });
  console.log(`  session=${session.id}`);

  // Forge "completed" event with all the fields the webhook reads
  const fakeSession = {
    ...session,
    payment_status: "paid",
    status: "complete",
    subscription: subId,
    customer: customer.id,
    customer_details: {
      email: USER_EMAIL,
      name: null, phone: null, address: null, tax_exempt: "none", tax_ids: []
    },
    amount_total: price.unit_amount,
    amount_subtotal: price.unit_amount,
    currency: price.currency,
    payment_intent: session.payment_intent || null
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

  const result = await fireEvent(event);
  console.log(`  webhook: HTTP ${result.status} → ${result.body}`);
  return { sku: sku.lookup, session_id: session.id, sub_id: subId, http: result.status, body: result.body };
}

const results = [];
for (const sku of SKUs) {
  try { results.push(await runSku(sku)); }
  catch (e) { console.error(`  ❌ ${sku.label}: ${e.message}`); results.push({ sku: sku.lookup, error: e.message }); }
}
console.log("\n=== SUMMARY ===");
console.table(results);
console.log("\nUser:", USER_ID, "/", USER_EMAIL);
