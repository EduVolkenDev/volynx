import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Daily OS tools write to daily_usage_logs; all others write to usage_logs
const DAILY_TOOLS = new Set(["scanner", "summary", "vault", "writing", "decision", "my-day"]);

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { tool, amount } = await req.json().catch(() => ({ tool: "", amount: 1 }));
    const toolName = (tool || "").toLowerCase().trim();
    if (!toolName) {
      return json({ error: "Missing tool name" }, 400);
    }

    const increment = Math.max(1, Math.floor(Number(amount) || 1));

    // Use service role to bypass RLS — user is authenticated via JWT below
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Verify user identity via their JWT
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const today = new Date().toISOString().slice(0, 10);
    const table = DAILY_TOOLS.has(toolName) ? "daily_usage_logs" : "usage_logs";

    // Atomic upsert — no race condition between concurrent requests
    const { data: result, error: upsertErr } = await supabase.rpc("increment_usage", {
      p_user_id: user.id,
      p_user_email: user.email || "",
      p_tool_name: toolName,
      p_usage_date: today,
      p_table: table,
      p_increment: increment,
    });

    // Fallback to two-step if RPC not available
    if (upsertErr && upsertErr.message?.includes("function")) {
      const { data: existing } = await supabase
        .from(table)
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("tool_name", toolName)
        .eq("usage_date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from(table)
          .update({ usage_count: existing.usage_count + increment })
          .eq("id", existing.id);
        return json({ logged: true, tool: toolName, used: existing.usage_count + increment, date: today });
      } else {
        await supabase
          .from(table)
          .insert({ user_id: user.id, user_email: user.email || "", tool_name: toolName, usage_date: today, usage_count: increment });
        return json({ logged: true, tool: toolName, used: increment, date: today });
      }
    }

    if (upsertErr) {
      console.error("[log-usage] upsert error:", upsertErr.message);
      return json({ error: "Failed to log usage" }, 500);
    }

    return json({ logged: true, tool: toolName, date: today });
  } catch (err) {
    console.error("[log-usage] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
