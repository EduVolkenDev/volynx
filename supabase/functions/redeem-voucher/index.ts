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

// In-memory rate limiter (per isolate instance) — caps voucher brute-force.
// 10 attempts/min/user is generous for legit redeems (a user typing a
// single code) and tight enough to make scanning Black-Diamond codes
// infeasible. Per-isolate is acceptable: Edge runtimes don't pin users
// to isolates, so worst-case attackers get N×limit across isolates,
// which is still bounded compared to no limiter.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;
const rlMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rlMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rlMap.set(userId, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
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

    // ── Rate limit ────────────────────────────────────────────
    if (!checkRateLimit(userId)) {
      return json({ ok: false, error: "rate_limited", retry_after_seconds: 60 }, 429);
    }

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

    // ── Prepare grants ─────────────────────────────────────────
    const grants = voucher.grants || {};
    const isBlackDiamondGrant = grants.badge === "black_diamond";

    // ── Check if already redeemed by this user ────────────────
    const { data: existing } = await supabase
      .from("voucher_redemptions")
      .select("id")
      .eq("voucher_id", voucher.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return json({ ok: false, error: isBlackDiamondGrant ? "already_black_diamond" : "already_redeemed" }, 400);
    }

    // ── Apply grants ──────────────────────────────────────────
    const profileUpdates: Record<string, unknown> = {};
    let tokensGranted = 0;

    if (isBlackDiamondGrant) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("is_black_diamond")
        .eq("id", userId)
        .single();

      if (profileErr || !profile) {
        console.error("[redeem-voucher] profile lookup error:", profileErr?.message);
        return json({ ok: false, error: "grant_failed" }, 500);
      }

      if (profile.is_black_diamond) {
        return json({ ok: false, error: "already_black_diamond" }, 400);
      }
    }

    // Plan upgrades
    if (grants.builder_plan) profileUpdates.builder_plan = grants.builder_plan;
    if (grants.daily_plan) profileUpdates.daily_plan = grants.daily_plan;
    if (grants.plan) profileUpdates.plan = grants.plan;
    if (grants.devjourney_tier && ["social", "pro", "bundle"].includes(String(grants.devjourney_tier).toLowerCase())) {
      profileUpdates.devjourney_tier = String(grants.devjourney_tier).toLowerCase();
    }

    // Badge grants
    if (isBlackDiamondGrant) {
      profileUpdates.is_black_diamond = true;
      profileUpdates.black_diamond_claimed_at = new Date().toISOString();
    }

    // Token grants — atomic credit via Postgres RPC
    if (grants.tokens && grants.tokens > 0) {
      const { data: creditResult, error: creditErr } = await supabase.rpc(
        "credit_tokens_atomic",
        {
          p_user_id: userId,
          p_amount: grants.tokens,
          p_type: "grant",
          p_description: `Voucher redeemed: ${voucher.label || voucher.type} (${code})`,
          p_metadata: JSON.stringify({
            source: "voucher",
            voucher_id: voucher.id,
            voucher_type: voucher.type,
          }),
        }
      );

      if (creditErr) {
        console.error("[redeem-voucher] credit_tokens_atomic error:", creditErr.message);
        return json({ ok: false, error: "grant_failed" }, 500);
      }

      tokensGranted = grants.tokens;
      // Don't add token_balance to profileUpdates — RPC already handled it
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

      // Sync plan to JWT app_metadata
      if (grants.builder_plan || grants.daily_plan || grants.plan) {
        await supabase.rpc("sync_plan_to_app_metadata", { p_user_id: userId });
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

    // Atomic increment — prevents race condition exceeding max_uses.
    // The previous fallback (read-then-write using cached times_used) was
    // racy: under concurrent redemptions reading the same value, the
    // counter could be left at the old number indefinitely, allowing
    // more redemptions than max_uses. If the RPC fails, surface the error
    // and rollback the redemption row instead of pretending it worked.
    const { error: incErr } = await supabase.rpc("increment_voucher_usage", { p_voucher_id: voucher.id });
    if (incErr) {
      console.error(`[redeem-voucher] increment_voucher_usage failed for ${code}:`, incErr.message);
      // Rollback the redemption insert so a retry can proceed cleanly.
      await supabase.from("voucher_redemptions").delete().eq("voucher_id", voucher.id).eq("user_id", userId);
      return json({ ok: false, error: "increment_failed", detail: incErr.message }, 500);
    }

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
