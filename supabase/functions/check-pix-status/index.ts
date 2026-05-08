/**
 * VOLYNX — Legacy Pix Status Endpoint
 *
 * Pix payments now run through Stripe Checkout. Completion and token credits
 * are handled by stripe-webhook, so clients should rely on the Stripe return
 * URL and account balance refresh instead of polling this endpoint.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  return json({
    ok: false,
    provider: "stripe",
    status: "moved_to_stripe_checkout",
    error: "Pix status is handled by Stripe Checkout and the Stripe webhook.",
  }, 410);
});
