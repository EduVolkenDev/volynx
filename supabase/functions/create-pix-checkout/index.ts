/**
 * VOLYNX — Create Pix Checkout (Mercado Pago)
 *
 * Generates a Pix QR code for token pack purchases.
 * Returns QR image (base64), copia-e-cola string, and expiration.
 *
 * Required secrets:
 *   MERCADOPAGO_ACCESS_TOKEN  — Production or sandbox access token
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Auth: Bearer token (Supabase JWT) in Authorization header
 *
 * Request body:
 *   { lookup_key: "tokens_starter_brl" | "tokens_core_brl" | ... }
 *
 * Response:
 *   200: { ok, payment_id, external_reference, pix_qr_code_base64, pix_copy_paste, expires_at, amount, tokens }
 *   400/401/500: { ok: false, error }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Token pack definitions — BRL prices in reais (not centavos)
const TOKEN_PACKS: Record<
  string,
  { tokens: number; amount: number; label: string }
> = {
  tokens_starter: { tokens: 10, amount: 69.0, label: "Starter — 10 tokens" },
  tokens_core: { tokens: 25, amount: 159.0, label: "Core — 25 tokens" },
  tokens_pro: { tokens: 60, amount: 349.0, label: "Pro — 60 tokens" },
  tokens_scale: { tokens: 150, amount: 749.0, label: "Scale — 150 tokens" },
};

// Strip currency suffix from lookup_key
function extractPrefix(key: string): string {
  const parts = key.split("_");
  const currencies = ["gbp", "eur", "brl"];
  if (currencies.includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("_");
  }
  return key;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ ok: false, error: "Missing authorization token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ ok: false, error: "Invalid or expired token" }, 401);
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    // ── Parse request ──
    const body = await req.json();
    const { lookup_key } = body;

    if (!lookup_key || typeof lookup_key !== "string") {
      return json({ ok: false, error: "Missing lookup_key" }, 400);
    }

    const prefix = extractPrefix(lookup_key);
    const pack = TOKEN_PACKS[prefix];

    if (!pack) {
      return json(
        {
          ok: false,
          error: `Unknown token pack: ${prefix}. Available: ${Object.keys(TOKEN_PACKS).join(", ")}`,
        },
        400
      );
    }

    // ── Mercado Pago API ──
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("[pix-checkout] MERCADOPAGO_ACCESS_TOKEN not set");
      return json(
        { ok: false, error: "Pix payment system not configured." },
        500
      );
    }

    const externalRef = `vx_pix_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // Create payment via Mercado Pago Payments API (Pix)
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": externalRef,
      },
      body: JSON.stringify({
        transaction_amount: pack.amount,
        description: `VOLYNX ${pack.label}`,
        payment_method_id: "pix",
        payer: {
          email: userEmail,
        },
        external_reference: externalRef,
        date_of_expiration: expiresAt,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/pix-webhook`,
      }),
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      console.error("[pix-checkout] MP API error:", mpRes.status, errBody);
      return json({ ok: false, error: "Failed to generate Pix QR code" }, 502);
    }

    const mpData = await mpRes.json();

    const pixInfo =
      mpData.point_of_interaction?.transaction_data || {};

    // ── Save to database ──
    await supabase.from("pix_payments").insert({
      user_id: userId,
      user_email: userEmail,
      mp_payment_id: String(mpData.id),
      external_reference: externalRef,
      product_type: "token_pack",
      product_key: prefix,
      tokens_amount: pack.tokens,
      amount: pack.amount,
      currency: "BRL",
      status: "pending",
      pix_qr_code: pixInfo.qr_code || null,
      pix_qr_code_base64: pixInfo.qr_code_base64 || null,
      pix_copy_paste: pixInfo.qr_code || null,
      pix_expiration: expiresAt,
    });

    console.log(
      `Pix checkout created: ${externalRef} for ${userEmail}, ${pack.tokens} tokens, R$${pack.amount}`
    );

    return json({
      ok: true,
      payment_id: String(mpData.id),
      external_reference: externalRef,
      pix_qr_code_base64: pixInfo.qr_code_base64 || null,
      pix_copy_paste: pixInfo.qr_code || null,
      expires_at: expiresAt,
      amount: pack.amount,
      tokens: pack.tokens,
      label: pack.label,
    });
  } catch (err) {
    console.error("[pix-checkout] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
