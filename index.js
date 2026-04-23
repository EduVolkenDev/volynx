/**
 * VOLYNX — Legacy Express checkout endpoint (compat shim).
 *
 * The production checkout runs on the Supabase Edge Function:
 *   supabase/functions/create-checkout-session/index.ts
 *
 * This file exists only as a backup / optional self-hosted fallback.
 * It mirrors the edge function contract so the frontend works identically
 * whether `functionsUrl` points to Supabase or to this Express server.
 *
 * Contract:
 *   POST /create-checkout-session
 *     Headers: Authorization: Bearer <supabase_access_token>
 *     Body:    { lookup_key, success_url, cancel_url }
 *     Returns: { url } on success, { error } on failure
 *
 * Required env (scripts/.env):
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   FRONTEND_ORIGIN
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://volynx.world";

if (!STRIPE_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY not set. Set env vars before running.");
  process.exit(1);
}

const app = express();
const stripe = new Stripe(STRIPE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

const SUBSCRIPTION_PREFIXES = ["builder_", "volynx_", "daily_", "bundle_"];
const LOOKUP_KEY_CURRENCY_RE = /_(gbp|eur|brl)$/i;

function extractPrefix(lookupKey) {
  const parts = String(lookupKey || "").split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return lookupKey;
}

function getCheckoutMode(prefix) {
  if (SUBSCRIPTION_PREFIXES.some((p) => prefix.startsWith(p))) return "subscription";
  if (prefix === "studio_pro" || prefix === "addon_extra_slot") return "subscription";
  return "payment";
}

function resolveStripeLookupCandidates(lookupKey) {
  const prefix = extractPrefix(lookupKey);
  const currencyMatch = String(lookupKey || "").match(LOOKUP_KEY_CURRENCY_RE);
  const currencySuffix = currencyMatch ? "_" + String(currencyMatch[1]).toLowerCase() : "";
  const candidates = new Set([lookupKey]);

  if (prefix === "pf_white_label") {
    candidates.add("pf_enterprise" + currencySuffix);
  }

  return Array.from(candidates);
}

function canonicalizeLookupPrefix(prefix) {
  return prefix === "pf_enterprise" ? "pf_white_label" : prefix;
}

function canonicalizeLookupKey(lookupKey) {
  const prefix = extractPrefix(lookupKey);
  const canonicalPrefix = canonicalizeLookupPrefix(prefix);
  if (!prefix || prefix === canonicalPrefix) return lookupKey;
  return String(lookupKey).replace(prefix, canonicalPrefix);
}

app.post("/create-checkout-session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Missing authorization token" });

    const { data, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
    }
    const user = data.user;

    const { lookup_key, success_url, cancel_url } = req.body || {};
    if (!lookup_key || typeof lookup_key !== "string") {
      return res.status(400).json({ error: "Missing lookup_key" });
    }

    const lookupCandidates = resolveStripeLookupCandidates(lookup_key);
    const prices = await stripe.prices.list({
      lookup_keys: lookupCandidates,
      limit: lookupCandidates.length,
      expand: ["data.product"],
    });
    if (!prices.data.length) {
      return res.status(404).json({ error: `Price not found for: ${lookup_key}` });
    }

    const price = prices.data.find((entry) => entry.lookup_key === lookup_key) || prices.data[0];
    const stripeLookupKey = price.lookup_key || lookup_key;
    const prefix = canonicalizeLookupPrefix(extractPrefix(lookup_key));
    const canonicalLookupKey = canonicalizeLookupKey(lookup_key);
    const mode = getCheckoutMode(prefix);
    const extraMeta = {};
    for (const key of ["icon_id", "icon_label", "icon_path", "icon_collection"]) {
      const value = req.body?.[key];
      if (typeof value === "string" && value.length > 0 && value.length < 500) {
        extraMeta[key] = value;
      }
    }

    const params = {
      mode,
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        lookup_key: canonicalLookupKey,
        requested_lookup_key: lookup_key,
        stripe_lookup_key: stripeLookupKey,
        product_family: prefix,
        product_prefix: prefix,
        ...extraMeta,
      },
      success_url: success_url || `${FRONTEND_ORIGIN}/profile/?payment=success`,
      cancel_url: cancel_url || `${FRONTEND_ORIGIN}/pricing/?payment=cancelled`,
      allow_promotion_codes: true,
    };

    if (mode === "subscription") {
      params.subscription_data = {
        metadata: {
          user_id: user.id,
          lookup_key: canonicalLookupKey,
          requested_lookup_key: lookup_key,
          stripe_lookup_key: stripeLookupKey,
          plan_key: prefix,
        },
      };
    } else {
      params.payment_intent_data = {
        metadata: {
          user_id: user.id,
          lookup_key: canonicalLookupKey,
          requested_lookup_key: lookup_key,
          stripe_lookup_key: stripeLookupKey,
          ...extraMeta,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(params);
    return res.json({ url: session.url });
  } catch (e) {
    console.error("[checkout]", e?.message || e);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`[volynx-api] listening on :${port}`));
