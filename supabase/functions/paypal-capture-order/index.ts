import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
  requireAuthenticatedUser,
} from "../_shared/edge-security.ts";
import { completedCapture, paypalRequest, type PayPalOrder } from "../_shared/paypal.ts";

const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://volynx.world";
const TOKEN_CREDITS: Record<string, number> = {
  tokens_starter: 12,
  tokens_core: 32,
  tokens_pro: 80,
  tokens_scale: 200,
};
const CUSTOM_PAYMENT_METHOD_ID = Deno.env.get("STRIPE_CUSTOM_PAYPAL_METHOD_ID")
  || "cpmt_1UF0SvCTxpHHXyYbPhEP9eac";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } },
);

function extractPrefix(lookupKey: string): string {
  return lookupKey.replace(/_(gbp|eur|brl)$/i, "");
}

function errorResponse(req: Request, error: string, status: number) {
  return jsonResponse(req, { ok: false, error }, status);
}

async function reportToStripe(args: {
  amountMinor: number;
  currency: string;
  captureId: string;
  email: string;
  lookupKey: string;
}): Promise<string | null> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!stripeKey || !/^cpmt_[A-Za-z0-9]+$/.test(CUSTOM_PAYMENT_METHOD_ID)) {
    console.warn("[paypal-capture-order] Stripe Payment Record reporting is not configured");
    return null;
  }

  const authorization = "Basic " + btoa(stripeKey + ":");
  const stripeRequest = async (path: string, form: URLSearchParams) => {
    const response = await fetch("https://api.stripe.com" + path, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2026-02-25.clover",
      },
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload.error?.message || "Stripe request failed (" + response.status + ")"));
    }
    return payload;
  };

  try {
    const methodForm = new URLSearchParams({
      type: "custom",
      "custom[type]": CUSTOM_PAYMENT_METHOD_ID,
    });
    const paymentMethod = await stripeRequest("/v1/payment_methods", methodForm);
    const now = Math.floor(Date.now() / 1000);
    const recordForm = new URLSearchParams({
      "amount_requested[currency]": args.currency,
      "amount_requested[value]": String(args.amountMinor),
      initiated_at: String(now),
      outcome: "guaranteed",
      "guaranteed[guaranteed_at]": String(now),
      "payment_method_details[payment_method]": paymentMethod.id,
      "payment_method_details[type]": "custom",
      "processor_details[type]": "custom",
      "processor_details[custom][payment_reference]": args.captureId,
      "customer_details[email]": args.email,
      description: ("VOLYNX " + args.lookupKey).slice(0, 200),
      "metadata[payment_provider]": "paypal",
      "metadata[lookup_key]": args.lookupKey,
    });
    const paymentRecord = await stripeRequest("/v1/payment_records/report_payment", recordForm);
    return paymentRecord.id || null;
  } catch (error) {
    // PayPal is the source of truth for this external payment. Reporting is
    // useful for Stripe's unified ledger but must not revoke a paid VX pack.
    console.error("[paypal-capture-order] Stripe Payment Record report failed:", (error as Error).message);
    return null;
  }
}

async function queueTokenEmail(
  userId: string,
  email: string,
  captureId: string,
  tokens: number,
  balance: number,
  prefix: string,
) {
  const { data: inserted, error } = await admin.from("email_log").insert({
    user_id: userId,
    event_type: "tokens_credited",
    idempotency_key: captureId,
    recipient_email: email || "pending",
    payload: { tokens, new_balance: balance, pack_name: prefix, payment_provider: "paypal" },
    status: "pending",
  }).select("id").maybeSingle();

  if (error?.code === "23505" || error || !inserted?.id) return;
  fetch((Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/send-purchase-email", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_log_id: inserted.id }),
  }).catch((dispatchError) => {
    console.error("[paypal-capture-order] email dispatch failed:", dispatchError.message);
  });
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
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(orderId)) return errorResponse(req, "Invalid PayPal order", 400);

    const orderResult = await admin.from("payment_orders")
      .select("id,user_id,checkout_attempt_id,provider_order_id,provider_payment_id,lookup_key,amount_minor,currency,status,metadata")
      .eq("provider", "paypal")
      .eq("provider_order_id", orderId)
      .eq("user_id", authenticated.user.id)
      .maybeSingle();
    if (orderResult.error) throw new Error("payment order lookup: " + orderResult.error.message);
    const paymentOrder = orderResult.data;
    if (!paymentOrder) return errorResponse(req, "PayPal checkout not found", 404);

    const metadata = (paymentOrder.metadata || {}) as Record<string, unknown>;
    const successUrl = typeof metadata.success_url === "string"
      ? metadata.success_url
      : FRONTEND_ORIGIN + "/account/?recarga=sucesso";
    if (paymentOrder.status === "completed" && paymentOrder.provider_payment_id) {
      return jsonResponse(req, {
        ok: true,
        completed: true,
        redirect_url: successUrl,
        capture_id: paymentOrder.provider_payment_id,
      });
    }

    const currentOrder = await paypalRequest<PayPalOrder>(
      "/v2/checkout/orders/" + encodeURIComponent(orderId),
    );
    if (currentOrder.status !== "COMPLETED") {
      await paypalRequest<PayPalOrder>(
        "/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: "{}",
          idempotencyKey: "volynx-capture-" + orderId,
        },
      );
    }

    const capturedOrder = currentOrder.status === "COMPLETED"
      ? currentOrder
      : await paypalRequest<PayPalOrder>(
        "/v2/checkout/orders/" + encodeURIComponent(orderId),
      );
    const customId = capturedOrder.purchase_units?.[0]?.custom_id || "";
    if (customId !== paymentOrder.id) {
      console.error("[paypal-capture-order] order ownership mismatch", { orderId, customId });
      return errorResponse(req, "PayPal payment could not be verified.", 409);
    }

    const capture = completedCapture(capturedOrder);
    if (!capture) return errorResponse(req, "PayPal payment is not completed yet.", 409);
    if (
      capture.currency.toLowerCase() !== paymentOrder.currency
      || Math.round(Number(capture.value) * 100) !== Number(paymentOrder.amount_minor)
    ) {
      console.error("[paypal-capture-order] amount mismatch", { orderId, capture, expected: paymentOrder });
      return errorResponse(req, "PayPal payment amount could not be verified.", 409);
    }

    const prefix = extractPrefix(paymentOrder.lookup_key);
    const tokenAmount = TOKEN_CREDITS[prefix] || 0;
    if (!tokenAmount) return errorResponse(req, "Unsupported PayPal product.", 400);

    const profile = await admin.from("profiles")
      .select("email")
      .eq("id", authenticated.user.id)
      .single();
    if (profile.error) throw new Error("profile lookup: " + profile.error.message);
    const email = profile.data?.email || authenticated.user.email || "";

    const credit = await admin.rpc("credit_external_token_purchase_atomic", {
      p_user_id: authenticated.user.id,
      p_amount: tokenAmount,
      p_provider: "paypal",
      p_provider_payment_id: capture.id,
      p_lookup_key: paymentOrder.lookup_key,
      p_description: "PayPal token pack: " + prefix + " (" + paymentOrder.lookup_key + ")",
    });
    if (credit.error || !credit.data?.ok) {
      throw new Error("token fulfillment: " + (credit.error?.message || credit.data?.error || "rejected"));
    }

    const purchase = await admin.from("purchase_events").insert({
      user_id: authenticated.user.id,
      user_email: email,
      payment_provider: "paypal",
      provider_payment_id: capture.id,
      checkout_attempt_id: paymentOrder.checkout_attempt_id,
      product_key: "tokens",
      lookup_key: paymentOrder.lookup_key,
      amount_paid: Number(paymentOrder.amount_minor),
      currency: paymentOrder.currency,
      tokens_credited: tokenAmount,
      status: "completed",
      metadata: {
        mode: "payment",
        payment_provider: "paypal",
        paypal_order_id: orderId,
        paypal_capture_id: capture.id,
        stripe_custom_payment_method_id: CUSTOM_PAYMENT_METHOD_ID,
      },
    });
    if (purchase.error && purchase.error.code !== "23505") {
      throw new Error("purchase event: " + purchase.error.message);
    }
    if (purchase.error?.code === "23505") {
      // A concurrent return or retry already recorded this capture. The
      // database uniqueness constraint is the final idempotency guard.
      await admin.from("payment_orders").update({
        provider_payment_id: capture.id,
        status: "completed",
        updated_at: new Date().toISOString(),
        metadata: { ...metadata, paypal_capture_id: capture.id },
      }).eq("id", paymentOrder.id).eq("user_id", authenticated.user.id);
      return jsonResponse(req, {
        ok: true,
        completed: true,
        redirect_url: successUrl,
        capture_id: capture.id,
        balance: credit.data.balance,
      });
    }

    const stripePaymentRecordId = await reportToStripe({
      amountMinor: Number(paymentOrder.amount_minor),
      currency: paymentOrder.currency,
      captureId: capture.id,
      email,
      lookupKey: paymentOrder.lookup_key,
    });

    const updated = await admin.from("payment_orders").update({
      provider_payment_id: capture.id,
      status: "completed",
      updated_at: new Date().toISOString(),
      metadata: {
        ...metadata,
        paypal_capture_id: capture.id,
        stripe_payment_record_id: stripePaymentRecordId,
      },
    }).eq("id", paymentOrder.id).eq("user_id", authenticated.user.id);
    if (updated.error) throw new Error("payment order completion: " + updated.error.message);

    if (!credit.data.duplicate) {
      await queueTokenEmail(
        authenticated.user.id,
        email,
        capture.id,
        tokenAmount,
        Number(credit.data.balance || 0),
        prefix,
      );
    }

    return jsonResponse(req, {
      ok: true,
      completed: true,
      redirect_url: successUrl,
      capture_id: capture.id,
      balance: credit.data.balance,
      stripe_payment_record_id: stripePaymentRecordId,
    });
  } catch (error) {
    console.error("[paypal-capture-order] error:", (error as Error).message);
    return errorResponse(req, "Unable to confirm PayPal payment.", 500);
  }
});
