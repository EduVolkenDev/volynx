/**
 * VOLYNX — Legacy Pix Webhook Endpoint
 *
 * Pix now runs through Stripe Checkout. Stripe sends completion events to
 * stripe-webhook, which is the only fulfillment path for Pix token packs.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve((req: Request) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  return json({
    received: true,
    provider: "stripe",
    disabled: true,
    message: "Pix fulfillment is handled by stripe-webhook.",
  });
});
