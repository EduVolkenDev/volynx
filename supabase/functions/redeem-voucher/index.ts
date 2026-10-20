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
import { resolveDailyPlanGrant } from "../_shared/voucher-entitlements.mjs";

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
    if (grants.tokens !== undefined && (!Number.isSafeInteger(grants.tokens) || grants.tokens < 0 || grants.tokens > 2_147_483_647)) {
      return json({ ok: false, error: "invalid_grant" }, 400);
    }

    // Validate the Daily entitlement before applying any other grant. Voucher
    // lifetime (vouchers.expires_at) and subscription lifetime are separate:
    // only the latter updates profiles.daily_plan_expires_at.
    if (grants.daily_plan_expires_in_days !== undefined && !grants.daily_plan) {
      return json({ ok: false, error: "daily_plan_required_for_duration" }, 400);
    }
    let dailyPlanGrant: { daily_plan: string; daily_plan_expires_at: string | null } | null = null;
    if (grants.daily_plan) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("daily_plan, daily_plan_expires_at")
        .eq("id", userId)
        .single();

      if (profileErr || !profile) {
        console.error("[redeem-voucher] Daily profile lookup error:", profileErr?.message);
        return json({ ok: false, error: "grant_failed" }, 500);
      }

      try {
        dailyPlanGrant = resolveDailyPlanGrant({
          currentPlan: profile.daily_plan,
          currentExpiresAt: profile.daily_plan_expires_at,
          requestedPlan: grants.daily_plan,
          durationDays: grants.daily_plan_expires_in_days,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "invalid_daily_plan";
        const publicErrors: Record<string, string> = {
          invalid_daily_plan: "invalid_daily_plan",
          invalid_daily_plan_duration: "invalid_daily_plan_duration",
          daily_plan_permanent_entitlement: "daily_plan_already_permanent",
          invalid_current_daily_expiration: "grant_failed",
        };
        const responseError = publicErrors[reason] || "invalid_daily_plan";
        return json({ ok: false, error: responseError }, responseError === "grant_failed" ? 500 : 400);
      }
    }

    // Prepare profile changes, but do not mutate data outside the atomic RPC.
    const profileUpdates: Record<string, unknown> = {};

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
    if (dailyPlanGrant) Object.assign(profileUpdates, dailyPlanGrant);
    if (grants.plan) profileUpdates.plan = grants.plan;
    if (grants.devjourney_tier && ["social", "pro", "bundle"].includes(String(grants.devjourney_tier).toLowerCase())) {
      profileUpdates.devjourney_tier = String(grants.devjourney_tier).toLowerCase();
    }

    // Badge grants
    if (isBlackDiamondGrant) {
      profileUpdates.is_black_diamond = true;
      profileUpdates.black_diamond_claimed_at = new Date().toISOString();
    }

    const tokensGranted = grants.tokens || 0;
    const grantsApplied = {
      ...grants,
      ...(dailyPlanGrant ? { daily_plan_expires_at: dailyPlanGrant.daily_plan_expires_at } : {}),
      tokens_granted: tokensGranted,
    };

    const { data: redemption, error: redemptionErr } = await supabase.rpc("redeem_voucher_atomic", {
      p_voucher_id: voucher.id,
      p_user_id: userId,
      p_user_email: userEmail,
      p_profile_updates: profileUpdates,
      p_token_amount: tokensGranted,
      p_grants_applied: grantsApplied,
      p_token_description: `Voucher redeemed: ${voucher.label || voucher.type} (${code})`,
      p_token_metadata: {
        source: "voucher",
        voucher_id: voucher.id,
        voucher_type: voucher.type,
      },
    });

    if (redemptionErr) {
      console.error(`[redeem-voucher] atomic redemption failed for ${code}:`, redemptionErr.message);
      return json({ ok: false, error: "grant_failed" }, 500);
    }
    if (!redemption?.ok) {
      const error = redemption?.error || "grant_failed";
      const status = ["invalid_code", "expired", "max_uses_reached", "wrong_recipient", "already_redeemed", "already_black_diamond"].includes(error) ? 400 : 500;
      return json({ ok: false, error }, status);
    }

    console.log(`Voucher ${code} (${voucher.type}) redeemed by ${userEmail}. Grants: ${JSON.stringify(grants)}`);

    return json({
      ok: true,
      voucher_type: voucher.type,
      label: voucher.label || voucher.type,
      grants_applied: {
        tokens: tokensGranted,
        builder_plan: grants.builder_plan || null,
        daily_plan: dailyPlanGrant?.daily_plan || null,
        daily_plan_expires_at: dailyPlanGrant?.daily_plan_expires_at || null,
        badge: grants.badge || null,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[redeem-voucher] Error:", message);
    return json({ ok: false, error: message }, 500);
  }
});
