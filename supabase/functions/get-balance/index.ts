/**
 * VOLYNX — Get Token Balance (Supabase Edge Function)
 *
 * Returns the user's current token balance and recent transactions.
 *
 * Auth: Bearer token (Supabase JWT) in Authorization header
 *
 * Response:
 *   200: { balance: number, recent: Array<{ type, amount, tool_name, description, created_at, balance_after }> }
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
    if (!token) return json({ error: "Missing authorization token" }, 401);

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const userId = userData.user.id;

    // Fetch balance — use maybeSingle so a brand-new signup whose profiles
    // row hasn't been inserted yet (auth trigger lag) doesn't 404. Treat
    // null as balance 0 so the topbar pill shows "0 VX" instead of looking
    // unauthenticated to the user.
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("token_balance")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) {
      console.error(`[get-balance] profiles read error for ${userId}:`, profErr.message);
      return json({ error: "balance_read_failed", detail: profErr.message }, 500);
    }

    // Fetch recent transactions (last 20)
    const { data: transactions } = await supabase
      .from("token_transactions")
      .select("type, amount, tool_name, description, created_at, balance_after")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return json({
      balance: profile?.token_balance ?? 0,
      recent: transactions || [],
    });

  } catch (err) {
    console.error("get-balance error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
