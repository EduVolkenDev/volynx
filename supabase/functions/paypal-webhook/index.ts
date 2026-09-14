import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { paypalRequest } from "../_shared/paypal.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function header(req: Request, name: string): string {
  return req.headers.get(name) || req.headers.get(name.toLowerCase()) || "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  if (!PAYPAL_WEBHOOK_ID) {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID is not configured");
    return response({ error: "webhook_not_configured" }, 500);
  }

  const rawBody = await req.text();
  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  try {
    const verification = await paypalRequest<Record<string, any>>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_algo: header(req, "PAYPAL-AUTH-ALGO"),
          cert_url: header(req, "PAYPAL-CERT-URL"),
          transmission_id: header(req, "PAYPAL-TRANSMISSION-ID"),
          transmission_sig: header(req, "PAYPAL-TRANSMISSION-SIG"),
          transmission_time: header(req, "PAYPAL-TRANSMISSION-TIME"),
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: event,
        }),
      },
    );
    if (verification.verification_status !== "SUCCESS") {
      console.warn("[paypal-webhook] signature verification failed");
      return response({ error: "invalid_signature" }, 400);
    }

    const resource = event.resource || {};
    const relatedOrderId = resource.supplementary_data?.related_ids?.order_id
      || resource.custom_id
      || event.resource?.id;
    const captureId = resource.id || null;

    if (typeof relatedOrderId === "string") {
      let current = await admin.from("payment_orders")
        .select("id,status,metadata")
        .eq("provider", "paypal")
        .eq("provider_order_id", relatedOrderId)
        .maybeSingle();
      if (current.error) throw new Error("payment order lookup: " + current.error.message);

      // Capture webhooks normally include the related order ID. Keep a
      // provider-payment fallback for payload variants that only expose the
      // capture ID.
      if (!current.data && captureId) {
        current = await admin.from("payment_orders")
          .select("id,status,metadata")
          .eq("provider", "paypal")
          .eq("provider_payment_id", captureId)
          .maybeSingle();
        if (current.error) throw new Error("payment capture lookup: " + current.error.message);
      }

      if (current.data) {
        const eventMetadata = {
          ...((current.data.metadata || {}) as Record<string, unknown>),
          last_paypal_event_id: event.id || null,
          last_paypal_event_type: event.event_type || null,
          last_paypal_event_at: new Date().toISOString(),
        };
        const update: Record<string, unknown> = { metadata: eventMetadata, updated_at: new Date().toISOString() };
        if (event.event_type === "CHECKOUT.ORDER.APPROVED") update.status = "approved";
        if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && captureId) {
          // Fulfillment remains in paypal-capture-order, which has the
          // authenticated user context and the atomic VX credit path.
          update.status = current.data.status === "completed" ? "completed" : "approved";
          update.provider_payment_id = captureId;
        }
        if (event.event_type === "PAYMENT.CAPTURE.DENIED") update.status = "failed";

        const saved = await admin.from("payment_orders")
          .update(update)
          .eq("id", current.data.id);
        if (saved.error) throw new Error("payment order webhook update: " + saved.error.message);
      }
    }

    return response({ ok: true });
  } catch (error) {
    console.error("[paypal-webhook] error:", (error as Error).message);
    return response({ error: "webhook_processing_failed" }, 500);
  }
});
