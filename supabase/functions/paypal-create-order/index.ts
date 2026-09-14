import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.2.2";
import {
  corsHeaders,
  isAllowedReturnUrl,
  isUuid,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
  requireAuthenticatedUser,
} from "../_shared/edge-security.ts";
import { approvalUrl, paypalRequest, type PayPalOrder } from "../_shared/paypal.ts";

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";
const STRIPE_API_VERSION = "2026-02-25.clover";
const CURRENCY_RE = /^(gbp|eur|brl)$/i;

const TOKEN_CREDITS: Record<string, number> = {
  tokens_starter: 12,
  tokens_core: 32,
  tokens_pro: 80,
  tokens_scale: 200,
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } },
);

function extractPrefix(lookupKey: string): string {
  return lookupKey.replace(/_(gbp|eur|brl)$/i, "");
}

function isProductionFrontend(): boolean {
  try {
    return new URL(FRONTEND_ORIGIN).origin === "https://volynx.world";
  } catch {
    return false;
  }
}

function formatPayPalAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function defaultReturnUrl(lookupKey: string, attemptId: string): string {
  const params = new URLSearchParams({
    payment_method: "paypal",
    paypal_return: "1",
    lookup_key: lookupKey,
    checkout_attempt_id: attemptId,
  });
  return FRONTEND_ORIGIN + "/checkout/?" + params.toString();
}

function errorResponse(req: Request, error: string, status: number) {
  return jsonResponse(req, { ok: false, error }, status);
}

Deno.serve(async (req: Request) => {
  const blockedOrigin = rejectUnexpectedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  const authenticated = await requireAuthenticatedUser(req);
  if (!authenticated) return errorResponse(req, "Invalid or expired token", 401);

  try {
    const body = await parseJsonObject(req, 12000);
    const lookupKey = typeof body.lookup_key === "string" ? body.lookup_key.trim().toLowerCase() : "";
    const prefix = extractPrefix(lookupKey);
    const attemptId = isUuid(body.checkout_attempt_id) ? body.checkout_attempt_id : crypto.randomUUID();

    if (!TOKEN_CREDITS[prefix]) {
      return errorResponse(req, "PayPal is currently available for VX token packs only.", 400);
    }
    if (!lookupKey || !CURRENCY_RE.test(lookupKey.split("_").pop() || "")) {
      return errorResponse(req, "PayPal requires a supported currency lookup key.", 400);
    }

    const successUrl = typeof body.success_url === "string" && body.success_url
      ? body.success_url
      : FRONTEND_ORIGIN + "/account/?recarga=sucesso";
    const cancelUrl = typeof body.cancel_url === "string" && body.cancel_url
      ? body.cancel_url
      : FRONTEND_ORIGIN + "/recarregar/?payment=cancelled";
    const returnUrl = typeof body.return_url === "string" && body.return_url
      ? body.return_url
      : defaultReturnUrl(lookupKey, attemptId);

    for (const url of [successUrl, cancelUrl, returnUrl]) {
      if (!isAllowedReturnUrl(url, FRONTEND_ORIGIN)) {
        return errorResponse(req, "Invalid return URL", 400);
      }
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) return errorResponse(req, "Payment system is not configured.", 500);
    if (isProductionFrontend() && stripeKey.startsWith("sk_test_")) {
      return errorResponse(req, "Live checkout is not configured.", 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: STRIPE_API_VERSION as any,
      httpClient: Stripe.createFetchHttpClient(),
    });
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const price = prices.data[0];
    if (!price || price.recurring || !price.unit_amount) {
      return errorResponse(req, "One-time price not found for this token pack.", 404);
    }

    const currency = price.currency.toLowerCase();
    if (!CURRENCY_RE.test(currency)) return errorResponse(req, "Unsupported PayPal currency.", 400);

    const existing = await admin
      .from("payment_orders")
      .select("id, provider_order_id, status, metadata, lookup_key, amount_minor, currency")
      .eq("user_id", authenticated.user.id)
      .eq("checkout_attempt_id", attemptId)
      .maybeSingle();
    if (existing.error) throw new Error("payment order lookup: " + existing.error.message);
    if (existing.data && (
      existing.data.lookup_key !== lookupKey
      || Number(existing.data.amount_minor) !== Number(price.unit_amount)
      || existing.data.currency !== currency
    )) {
      return errorResponse(req, "This checkout attempt does not match the selected product.", 409);
    }
    if (existing.data?.status === "completed") {
      return errorResponse(req, "This checkout attempt is already completed.", 409);
    }

    let paymentOrder = existing.data;
    if (!paymentOrder) {
      const inserted = await admin
        .from("payment_orders")
        .insert({
          user_id: authenticated.user.id,
          provider: "paypal",
          checkout_attempt_id: attemptId,
          lookup_key: lookupKey,
          amount_minor: price.unit_amount,
          currency,
          status: "created",
          metadata: { success_url: successUrl, cancel_url: cancelUrl, source: "checkout" },
        })
        .select("id, provider_order_id, status, metadata, lookup_key, amount_minor, currency")
        .single();
      if (inserted.error) {
        if (inserted.error.code !== "23505") throw new Error("payment order insert: " + inserted.error.message);
        const retry = await admin.from("payment_orders")
          .select("id, provider_order_id, status, metadata, lookup_key, amount_minor, currency")
          .eq("user_id", authenticated.user.id)
          .eq("checkout_attempt_id", attemptId)
          .single();
        if (retry.error || !retry.data) throw new Error("payment order retry: " + (retry.error?.message || "not found"));
        paymentOrder = retry.data;
      } else {
        paymentOrder = inserted.data;
      }
    }

    if (paymentOrder?.provider_order_id) {
      const currentOrder = await paypalRequest<PayPalOrder>(
        "/v2/checkout/orders/" + encodeURIComponent(paymentOrder.provider_order_id),
      );
      const existingApprovalUrl = approvalUrl(currentOrder);
      if (existingApprovalUrl && currentOrder.status !== "COMPLETED") {
        return jsonResponse(req, {
          ok: true,
          provider: "paypal",
          order_id: paymentOrder.provider_order_id,
          approval_url: existingApprovalUrl,
          amount: formatPayPalAmount(Number(paymentOrder.amount_minor)),
          currency: paymentOrder.currency,
        });
      }
    }

    const paypalOrder = await paypalRequest<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: paymentOrder.id,
          custom_id: paymentOrder.id,
          description: ("VOLYNX " + prefix).slice(0, 127),
          amount: { currency_code: currency.toUpperCase(), value: formatPayPalAmount(price.unit_amount) },
        }],
        application_context: {
          brand_name: "VOLYNX",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
      idempotencyKey: "volynx-create-" + attemptId,
    });
    const approve = approvalUrl(paypalOrder);
    if (!paypalOrder.id || !approve) throw new Error("PayPal did not return an approval URL");

    const updated = await admin.from("payment_orders")
      .update({
        provider_order_id: paypalOrder.id,
        updated_at: new Date().toISOString(),
        metadata: { success_url: successUrl, cancel_url: cancelUrl, source: "checkout" },
      })
      .eq("id", paymentOrder.id);
    if (updated.error) throw new Error("payment order update: " + updated.error.message);

    return jsonResponse(req, {
      ok: true,
      provider: "paypal",
      order_id: paypalOrder.id,
      approval_url: approve,
      amount: formatPayPalAmount(price.unit_amount),
      currency,
    });
  } catch (error) {
    console.error("[paypal-create-order] error:", (error as Error).message);
    return errorResponse(req, "Unable to create PayPal checkout.", 500);
  }
});
