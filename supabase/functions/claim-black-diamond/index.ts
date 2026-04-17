/**
 * VOLYNX — Claim Black Diamond (deprecated)
 *
 * This legacy endpoint used to grant Black Diamond directly to any
 * authenticated user. Black Diamond invitations now require a private voucher
 * code and must be redeemed through the universal voucher engine.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  return json(
    {
      ok: false,
      error: "voucher_required",
      message: "Black Diamond invitations must be redeemed with a valid private voucher code.",
    },
    410
  );
});
