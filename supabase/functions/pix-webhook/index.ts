/**
 * VOLYNX — Pix Webhook (Mercado Pago IPN)
 *
 * Receives Instant Payment Notifications from Mercado Pago.
 * On payment approval: credits tokens atomically via RPC.
 *
 * Must be deployed with verify_jwt: false (MP doesn't send JWTs).
 *
 * Required secrets:
 *   MERCADOPAGO_ACCESS_TOKEN
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * MP sends: POST with query param ?id=<payment_id>&topic=payment
 *   or JSON body: { action: "payment.updated", data: { id: "123" } }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  // MP sends GET for webhook validation
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("[pix-webhook] MERCADOPAGO_ACCESS_TOKEN not set");
      return jsonResp({ received: true }, 200);
    }

    // ── Extract payment ID ──
    // MP can send via query params or JSON body
    const url = new URL(req.url);
    let paymentId: string | null = url.searchParams.get("id") ||
      url.searchParams.get("data.id");
    let topic = url.searchParams.get("topic") || url.searchParams.get("type");

    // Also try JSON body (newer IPN format)
    let bodyData: Record<string, unknown> = {};
    try {
      bodyData = await req.json();
    } catch {
      // Body might be empty for query-param-style notifications
    }

    if (!paymentId && bodyData.data) {
      paymentId = String((bodyData.data as Record<string, unknown>).id || "");
    }
    if (!topic && bodyData.action) {
      topic = String(bodyData.action);
    }

    // Only handle payment notifications
    if (!paymentId || (topic && !topic.includes("payment"))) {
      console.log(`[pix-webhook] Ignoring: topic=${topic}, id=${paymentId}`);
      return jsonResp({ received: true }, 200);
    }

    console.log(`[pix-webhook] Processing payment ${paymentId}`);

    // ── Fetch payment details from MP API ──
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${mpToken}` },
      }
    );

    if (!mpRes.ok) {
      console.error(
        `[pix-webhook] MP API error fetching payment ${paymentId}:`,
        mpRes.status
      );
      return jsonResp({ received: true }, 200);
    }

    const payment = await mpRes.json();
    const externalRef = payment.external_reference || "";
    const mpStatus = payment.status; // approved | pending | rejected | cancelled | refunded

    console.log(
      `[pix-webhook] Payment ${paymentId}: status=${mpStatus}, ref=${externalRef}`
    );

    // ── Find our record ──
    const { data: pixRecord, error: findErr } = await supabase
      .from("pix_payments")
      .select("*")
      .eq("external_reference", externalRef)
      .single();

    if (findErr || !pixRecord) {
      // Try by mp_payment_id
      const { data: byMpId } = await supabase
        .from("pix_payments")
        .select("*")
        .eq("mp_payment_id", String(paymentId))
        .single();

      if (!byMpId) {
        console.error(
          `[pix-webhook] No record found for ref=${externalRef} or mp_id=${paymentId}`
        );
        return jsonResp({ received: true }, 200);
      }

      // Use this record instead
      await processPayment(byMpId, mpStatus, payment);
      return jsonResp({ received: true }, 200);
    }

    await processPayment(pixRecord, mpStatus, payment);
    return jsonResp({ received: true }, 200);
  } catch (err) {
    console.error("[pix-webhook] error:", (err as Error).message);
    // Always return 200 to MP to prevent retries on our errors
    return jsonResp({ received: true }, 200);
  }
});

async function processPayment(
  record: Record<string, unknown>,
  mpStatus: string,
  rawPayment: Record<string, unknown>
) {
  const recordId = record.id as string;
  const currentStatus = record.status as string;
  const userId = record.user_id as string;
  const tokensAmount = record.tokens_amount as number;
  const productKey = record.product_key as string;

  // Already processed — skip
  if (currentStatus === "approved" && record.credited_at) {
    console.log(`[pix-webhook] Payment ${recordId} already credited, skipping`);
    return;
  }

  // Map MP status to our status
  const statusMap: Record<string, string> = {
    approved: "approved",
    authorized: "approved",
    pending: "pending",
    in_process: "pending",
    rejected: "rejected",
    cancelled: "cancelled",
    refunded: "refunded",
    charged_back: "refunded",
  };

  const newStatus = statusMap[mpStatus] || mpStatus;

  // Update payment record
  await supabase
    .from("pix_payments")
    .update({
      status: newStatus,
      mp_payment_id: String(rawPayment.id || record.mp_payment_id),
      mp_raw_webhook: rawPayment,
    })
    .eq("id", recordId);

  // ── Credit tokens on approval ──
  if (newStatus === "approved" && tokensAmount > 0 && !record.credited_at) {
    const { data: creditResult, error: creditErr } = await supabase.rpc(
      "credit_tokens_atomic",
      {
        p_user_id: userId,
        p_amount: tokensAmount,
        p_type: "purchase",
        p_description: `Pix: ${productKey} (${tokensAmount} tokens)`,
        p_metadata: JSON.stringify({
          source: "mercadopago_pix",
          pix_payment_id: recordId,
          mp_payment_id: String(rawPayment.id),
          product_key: productKey,
        }),
      }
    );

    if (creditErr) {
      console.error(
        `[pix-webhook] credit_tokens_atomic failed for ${userId}:`,
        creditErr.message
      );
      return;
    }

    // Mark as credited
    await supabase
      .from("pix_payments")
      .update({ credited_at: new Date().toISOString() })
      .eq("id", recordId);

    // Log purchase event (same format as Stripe)
    await supabase.from("purchase_events").insert({
      user_id: userId,
      product_key: "tokens",
      lookup_key: productKey,
      amount_paid: record.amount as number,
      currency: "BRL",
      tokens_credited: tokensAmount,
      status: "completed",
      metadata: {
        source: "mercadopago_pix",
        mp_payment_id: String(rawPayment.id),
        pix_payment_id: recordId,
      },
    });

    console.log(
      `[pix-webhook] Credited ${tokensAmount} tokens to ${userId} via Pix. New balance: ${creditResult?.balance}`
    );
  }

  // ── Handle refund ──
  if (newStatus === "refunded" && record.credited_at) {
    // Debit the tokens back
    const { error: debitErr } = await supabase.rpc("deduct_tokens_atomic", {
      p_user_id: userId,
      p_amount: tokensAmount,
      p_tool_name: "system",
      p_description: `Pix refund: ${productKey}`,
      p_action_class: "light",
      p_metadata: JSON.stringify({
        source: "mercadopago_pix_refund",
        pix_payment_id: recordId,
      }),
    });

    if (debitErr) {
      console.error(
        `[pix-webhook] Refund debit failed for ${userId}:`,
        debitErr.message
      );
    } else {
      console.log(
        `[pix-webhook] Refunded ${tokensAmount} tokens from ${userId}`
      );
    }
  }
}
