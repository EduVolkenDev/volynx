/**
 * VOLYNX — Claim Black Diamond (Supabase Edge Function)
 *
 * Sets is_black_diamond = true and credits 60 tokens to the user.
 * Idempotent — safe to call multiple times, only grants once.
 *
 * Auth: Bearer JWT required
 *
 * Response:
 *   200: { ok: true, already_claimed: boolean, tokens_granted: number, balance: number }
 *   401: { ok: false, error: "Unauthorized" }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BD_TOKENS = 60;

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
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ ok: false, error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify identity
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) return json({ ok: false, error: "Unauthorized" }, 401);

    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    // Fetch current profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("is_black_diamond, black_diamond_claimed_at, token_balance")
      .eq("id", userId)
      .single();

    if (profErr || !profile) return json({ ok: false, error: "Profile not found" }, 404);

    // Already claimed — idempotent, just return current state
    if (profile.is_black_diamond && profile.black_diamond_claimed_at) {
      return json({
        ok: true,
        already_claimed: true,
        tokens_granted: 0,
        balance: profile.token_balance || 0,
      });
    }

    const currentBalance = profile.token_balance || 0;
    const newBalance = currentBalance + BD_TOKENS;

    // Grant Black Diamond + tokens — conditional update prevents race condition
    const { error: updateErr, count } = await supabase
      .from("profiles")
      .update({
        is_black_diamond: true,
        black_diamond_claimed_at: new Date().toISOString(),
        token_balance: newBalance,
      })
      .eq("id", userId)
      .eq("is_black_diamond", false); // Only update if not already claimed

    // If no rows matched, another request already claimed
    if (!updateErr && count === 0) {
      return json({
        ok: true,
        already_claimed: true,
        tokens_granted: 0,
        balance: currentBalance,
      });
    }

    if (updateErr) {
      console.error("[claim-black-diamond] update error:", updateErr.message);
      return json({ ok: false, error: "Failed to activate Black Diamond" }, 500);
    }

    // Log the token grant
    await supabase.from("token_transactions").insert({
      user_id: userId,
      user_email: userEmail,
      amount: BD_TOKENS,
      type: "grant",
      tool_name: null,
      description: "Black Diamond founding member — welcome gift",
      balance_after: newBalance,
      metadata: { source: "black_diamond_claim" },
    });

    console.log(`Black Diamond claimed by ${userEmail}. Granted ${BD_TOKENS} tokens. Balance: ${newBalance}`);

    return json({
      ok: true,
      already_claimed: false,
      tokens_granted: BD_TOKENS,
      balance: newBalance,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[claim-black-diamond] Error:", message);
    return json({ ok: false, error: message }, 500);
  }
});
