/**
 * VOLYNX — Check Pix Payment Status
 *
 * Frontend polls this after displaying the QR code.
 * Returns current status from our pix_payments table.
 *
 * Auth: Bearer token (Supabase JWT)
 *
 * Request body:
 *   { external_reference: "vx_pix_..." }
 *
 * Response:
 *   200: { status: "pending"|"approved"|"rejected"|..., tokens_credited?: number, balance?: number }
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: userData, error: authErr } =
      await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const userId = userData.user.id;

    const body = await req.json();
    const { external_reference } = body;

    if (!external_reference) {
      return json({ error: "Missing external_reference" }, 400);
    }

    // Fetch payment — RLS-like check via user_id match
    const { data: payment, error: fetchErr } = await supabase
      .from("pix_payments")
      .select(
        "status, tokens_amount, credited_at, pix_expiration, product_key"
      )
      .eq("external_reference", external_reference)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !payment) {
      return json({ error: "Payment not found" }, 404);
    }

    // Check if expired
    const isExpired =
      payment.pix_expiration &&
      new Date(payment.pix_expiration) < new Date() &&
      payment.status === "pending";

    const result: Record<string, unknown> = {
      status: isExpired ? "expired" : payment.status,
      product_key: payment.product_key,
      tokens_amount: payment.tokens_amount,
    };

    // If approved, also return current balance
    if (payment.status === "approved" && payment.credited_at) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("token_balance")
        .eq("id", userId)
        .single();

      result.balance = profile?.token_balance || 0;
      result.tokens_credited = payment.tokens_amount;
    }

    return json(result);
  } catch (err) {
    console.error("[check-pix-status] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
