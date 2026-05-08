/**
 * VOLYNX — Deduct Tokens (Supabase Edge Function)
 *
 * Atomically checks balance and deducts tokens via Postgres RPC.
 * Uses SELECT ... FOR UPDATE inside the RPC — no race conditions.
 *
 * Required secrets:
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Auth: Bearer token (Supabase JWT) in Authorization header
 *
 * Request body:
 *   { tool: string, action_class: "light"|"medium"|"pro"|"batch"|"premium", tokens?: number, description?: string }
 *
 * Response:
 *   200: { ok: true, balance: number, spent: number }
 *   402: { ok: false, error: "insufficient_balance", balance: number, required: number }
 *   400/401/429/500: { ok: false, error: string }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Action class → default token cost
const CLASS_COSTS: Record<string, number> = {
  light: 1,
  medium: 2,
  pro: 4,
  batch: 8,
  premium: 12,
};

// In-memory rate limiter (per isolate instance)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

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
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // ── Authenticate via JWT ──
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ ok: false, error: "Missing authorization token" }, 401);
    }

    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ ok: false, error: "Invalid or expired token" }, 401);
    }

    const userId = userData.user.id;

    // ── Rate limit ──
    if (!checkRateLimit(userId)) {
      return json(
        { ok: false, error: "Rate limit exceeded. Try again in a minute." },
        429
      );
    }

    // ── Parse & validate request ──
    const body = await req.json();
    const { tool, action_class, tokens: customTokens, description } = body;

    if (!tool || typeof tool !== "string") {
      return json({ ok: false, error: "Missing 'tool' field" }, 400);
    }

    if (!action_class || !CLASS_COSTS[action_class]) {
      return json(
        {
          ok: false,
          error: `Invalid action_class. Must be one of: ${Object.keys(CLASS_COSTS).join(", ")}`,
        },
        400
      );
    }

    // Premium class allows custom amount in 12-20 range
    let tokensToSpend = CLASS_COSTS[action_class];
    if (action_class === "premium" && typeof customTokens === "number") {
      if (customTokens < 12 || customTokens > 20) {
        return json(
          { ok: false, error: "Premium class tokens must be between 12 and 20" },
          400
        );
      }
      tokensToSpend = customTokens;
    }

    // ── Admin bypass — no deduction, log usage only ──
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin, token_balance")
      .eq("id", userId)
      .maybeSingle();

    if (adminProfile?.is_admin) {
      // Best-effort audit trail (non-blocking)
      supabase.from("token_transactions").insert({
        user_id: userId,
        type: "admin_bypass",
        amount: 0,
        tool_name: tool,
        description: `[ADMIN] ${description || tool} (would_cost=${tokensToSpend})`,
        balance_after: adminProfile.token_balance ?? 1000000000,
      }).then(() => {}, () => {});

      return json({
        ok: true,
        balance: adminProfile.token_balance ?? 1000000000,
        spent: 0,
        admin_bypass: true,
      });
    }

    // ── Atomic deduction via Postgres RPC ──
    // deduct_tokens_atomic uses SELECT ... FOR UPDATE — true atomicity
    const { data: result, error: rpcErr } = await supabase.rpc(
      "deduct_tokens_atomic",
      {
        p_user_id: userId,
        p_amount: tokensToSpend,
        p_tool_name: tool,
        p_description: description || null,
        p_action_class: action_class,
        p_metadata: JSON.stringify({ action_class, tokens_spent: tokensToSpend }),
      }
    );

    if (rpcErr) {
      console.error("deduct_tokens_atomic RPC error:", rpcErr.message);
      return json({ ok: false, error: "Server error" }, 500);
    }

    // RPC returns JSONB: { ok, balance, spent } or { ok, error, balance, required }
    if (!result.ok) {
      const status = result.error === "insufficient_balance" ? 402 : 400;
      return json(result, status);
    }

    console.log(
      `Deducted ${tokensToSpend} tokens from ${userId} for ${tool}. Balance: ${result.balance}`
    );

    return json(result);
  } catch (err) {
    console.error("deduct-tokens error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
