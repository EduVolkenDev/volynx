/**
 * VOLYNX — Deduct Tokens (Supabase Edge Function)
 *
 * Atomically checks balance and deducts tokens for a tool action.
 * Returns the new balance or an insufficient_balance error.
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
 *   400/401/500: { ok: false, error: string }
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Rate limit: max deductions per user per minute
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
    // ── Authenticate ──
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ ok: false, error: "Missing authorization token" }, 401);
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ ok: false, error: "Invalid or expired token" }, 401);
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    // ── Rate limit ──
    if (!checkRateLimit(userId)) {
      return json({ ok: false, error: "Rate limit exceeded. Try again in a minute." }, 429);
    }

    // ── Parse request ──
    const body = await req.json();
    const { tool, action_class, tokens: customTokens, description } = body;

    if (!tool || typeof tool !== "string") {
      return json({ ok: false, error: "Missing 'tool' field" }, 400);
    }

    if (!action_class || !CLASS_COSTS[action_class]) {
      return json({ ok: false, error: `Invalid action_class. Must be one of: ${Object.keys(CLASS_COSTS).join(", ")}` }, 400);
    }

    // Allow custom token amount for premium class (12-20 range), otherwise use class default
    let tokensToSpend = CLASS_COSTS[action_class];
    if (action_class === "premium" && typeof customTokens === "number") {
      if (customTokens < 12 || customTokens > 20) {
        return json({ ok: false, error: "Premium class tokens must be between 12 and 20" }, 400);
      }
      tokensToSpend = customTokens;
    }

    // ── Atomic balance check + deduct ──
    // Use a transaction-like approach: read, validate, update with conditional check
    const { data: profile, error: fetchErr } = await supabase
      .from("profiles")
      .select("token_balance")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      return json({ ok: false, error: "Profile not found" }, 404);
    }

    const currentBalance = profile.token_balance || 0;

    if (currentBalance < tokensToSpend) {
      return json({
        ok: false,
        error: "insufficient_balance",
        balance: currentBalance,
        required: tokensToSpend,
      }, 402);
    }

    const newBalance = currentBalance - tokensToSpend;

    // Conditional update: only succeed if balance hasn't changed (optimistic lock)
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({ token_balance: newBalance })
      .eq("id", userId)
      .eq("token_balance", currentBalance)
      .select("token_balance")
      .single();

    if (updateErr || !updated) {
      // Balance changed between read and write — retry once
      const { data: retry } = await supabase
        .from("profiles")
        .select("token_balance")
        .eq("id", userId)
        .single();

      const retryBalance = retry?.token_balance || 0;
      if (retryBalance < tokensToSpend) {
        return json({
          ok: false,
          error: "insufficient_balance",
          balance: retryBalance,
          required: tokensToSpend,
        }, 402);
      }

      const retryNew = retryBalance - tokensToSpend;
      const { error: retryErr } = await supabase
        .from("profiles")
        .update({ token_balance: retryNew })
        .eq("id", userId)
        .eq("token_balance", retryBalance);

      if (retryErr) {
        return json({ ok: false, error: "Concurrent token operation. Please try again." }, 409);
      }

      // Log transaction with retry balance
      await supabase.from("token_transactions").insert({
        user_id: userId,
        user_email: userEmail,
        amount: -tokensToSpend,
        type: "spend",
        tool_name: tool,
        description: description || `${tool} — ${action_class} action`,
        balance_after: retryNew,
        metadata: { action_class, tokens_spent: tokensToSpend },
      });

      return json({ ok: true, balance: retryNew, spent: tokensToSpend });
    }

    // ── Log transaction ──
    await supabase.from("token_transactions").insert({
      user_id: userId,
      user_email: userEmail,
      amount: -tokensToSpend,
      type: "spend",
      tool_name: tool,
      description: description || `${tool} — ${action_class} action`,
      balance_after: newBalance,
      metadata: { action_class, tokens_spent: tokensToSpend },
    });

    console.log(`Deducted ${tokensToSpend} tokens from ${userId} for ${tool}. Balance: ${newBalance}`);

    return json({ ok: true, balance: newBalance, spent: tokensToSpend });

  } catch (err) {
    console.error("deduct-tokens error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
