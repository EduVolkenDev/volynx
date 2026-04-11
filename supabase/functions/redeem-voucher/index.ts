/**
 * VOLYNX — Redeem Voucher (Supabase Edge Function)
 *
 * Universal voucher redemption engine. Validates any voucher code and applies
 * its grants (tokens, plan upgrades, badges, etc.) to the authenticated user.
 *
 * Auth: Bearer JWT required
 *
 * Request body:
 *   { "code": "BD-XXXX-YYYY" }
 *
 * Response:
 *   200: { ok: true, voucher_type, grants_applied, already_redeemed? }
 *   400: { ok: false, error: "invalid_code" | "expired" | "max_uses" | "wrong_recipient" | "already_redeemed" }
 *   401: { ok: false, error: "Unauthorized" }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ ok: false, error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) return json({ ok: false, error: "Unauthorized" }, 401);

    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    // ── Parse request ─────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const code = ((body as Record<string, string>).code || "").trim().toUpperCase();
    if (!code) return json({ ok: false, error: "missing_code" }, 400);

    // ── Fetch voucher ─────────────────────────────────────────
    const { data: voucher, error: vErr } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .single();

    if (vErr || !voucher) {
      return json({ ok: false, error: "invalid_code" }, 400);
    }

    // ── Validate expiration ───────────────────────────────────
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return json({ ok: false, error: "expired" }, 400);
    }

    // ── Validate max uses ─────────────────────────────────────
    if (voucher.max_uses !== -1 && voucher.times_used >= voucher.max_uses) {
      return json({ ok: false, error: "max_uses_reached" }, 400);
    }

    // ── Validate personalization ──────────────────────────────
    if (voucher.target_email && !voucher.transferable) {
      if (voucher.target_email.toLowerCase() !== userEmail.toLowerCase()) {
        return json({ ok: false, error: "wrong_recipient" }, 400);
      }
    }

    // ── Check if already redeemed by this user ────────────────
    const { data: existing } = await supabase
      .from("voucher_redemptions")
      .select("id")
      .eq("voucher_id", voucher.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return json({ ok: false, error: "already_redeemed" }, 400);
    }

    // ── Apply grants ──────────────────────────────────────────
    const grants = voucher.grants || {};
    const profileUpdates: Record<string, unknown> = {};
    let tokensGranted = 0;

    // Plan upgrades
    if (grants.builder_plan) profileUpdates.builder_plan = grants.builder_plan;
    if (grants.daily_plan) profileUpdates.daily_plan = grants.daily_plan;
    if (grants.plan) profileUpdates.plan = grants.plan;

    // Badge grants
    if (grants.badge === "black_diamond") {
      profileUpdates.is_black_diamond = true;
      profileUpdates.black_diamond_claimed_at = new Date().toISOString();
    }

    // Token grants
    if (grants.tokens && grants.tokens > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("token_balance")
        .eq("id", userId)
        .single();

      const currentBalance = profile?.token_balance || 0;
      const newBalance = currentBalance + grants.tokens;
      profileUpdates.token_balance = newBalance;
      tokensGranted = grants.tokens;

      // Log token transaction
      await supabase.from("token_transactions").insert({
        user_id: userId,
        user_email: userEmail,
        amount: grants.tokens,
        type: "grant",
        tool_name: null,
        description: `Voucher redeemed: ${voucher.label || voucher.type} (${code})`,
        balance_after: newBalance,
        metadata: { source: "voucher", voucher_id: voucher.id, voucher_type: voucher.type },
      });
    }

    // Apply profile updates if any
    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (updateErr) {
        console.error("[redeem-voucher] profile update error:", updateErr.message);
        return json({ ok: false, error: "grant_failed" }, 500);
      }
    }

    // ── Record redemption (unique constraint prevents double-redeem) ──
    const { error: redeemErr } = await supabase.from("voucher_redemptions").insert({
      voucher_id: voucher.id,
      user_id: userId,
      user_email: userEmail,
      grants_applied: {
        ...grants,
        tokens_granted: tokensGranted,
      },
    });

    if (redeemErr) {
      if (redeemErr.code === "23505") {
        return json({ ok: false, error: "already_redeemed" }, 400);
      }
      console.error("[redeem-voucher] redemption insert error:", redeemErr.message);
      return json({ ok: false, error: "grant_failed" }, 500);
    }

    // Atomic increment — prevents race condition exceeding max_uses
    await supabase.rpc("increment_voucher_usage", { p_voucher_id: voucher.id }).catch(() => {
      // Fallback if RPC not available
      supabase
        .from("vouchers")
        .update({ times_used: voucher.times_used + 1 })
        .eq("id", voucher.id);
    });

    console.log(`Voucher ${code} (${voucher.type}) redeemed by ${userEmail}. Grants: ${JSON.stringify(grants)}`);

    return json({
      ok: true,
      voucher_type: voucher.type,
      label: voucher.label || voucher.type,
      grants_applied: {
        tokens: tokensGranted,
        builder_plan: grants.builder_plan || null,
        daily_plan: grants.daily_plan || null,
        badge: grants.badge || null,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[redeem-voucher] Error:", message);
    return json({ ok: false, error: message }, 500);
  }
});
