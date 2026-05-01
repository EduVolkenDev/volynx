import Stripe from "stripe";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("/Users/eduardovolken_1/VOLYNX/scripts/.env","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const [k,...v]=l.split("=");return[k.trim(),v.join("=").trim().replace(/^"|"$/g,"")];}));
const stripe = new Stripe(env.STRIPE_SECRET_KEY,{apiVersion:"2026-02-25.clover"});
let all = [];
let starting_after = undefined;
do {
  const r = await stripe.prices.list({ limit: 100, starting_after, active: true });
  all = all.concat(r.data);
  starting_after = r.has_more ? r.data[r.data.length-1].id : null;
} while (starting_after);
console.log(`Total active prices: ${all.length}`);
const wanted = ["tokens_","volynx_","builder_","daily_","bundle_","cvitae_","addon_"];
console.log("\n=== Filtered by prefix ===");
all.filter(p => p.lookup_key && wanted.some(w => p.lookup_key.startsWith(w))).forEach(p => {
  console.log(`  ${p.lookup_key.padEnd(40)} ${p.id}  £${(p.unit_amount/100).toFixed(2)} ${p.recurring ? '(sub)' : '(one-time)'}`);
});
