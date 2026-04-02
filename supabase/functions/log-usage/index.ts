import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const today = new Date().toISOString().slice(0, 10);

    // Check if row exists for today (RLS: user_id = auth.uid())
    const { data: existing } = await supabase
      .from("usage_logs")
      .select("id, usage_count")
      .eq("user_id", user.id)
      .eq("tool_name", toolName)
      .eq("usage_date", today)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("usage_logs")
        .update({ usage_count: existing.usage_count + increment })
        .eq("id", existing.id);

      if (updateErr) {
        console.error("[log-usage] update error:", updateErr.message);
        return json({ error: "Failed to update usage" }, 500);
      }

      return json({ logged: true, tool: toolName, used: existing.usage_count + increment, date: today });
    } else {
      const { error: insertErr } = await supabase
        .from("usage_logs")
        .insert({ user_id: user.id, user_email: user.email || "", tool_name: toolName, usage_date: today, usage_count: increment });

      if (insertErr) {
        console.error("[log-usage] insert error:", insertErr.message);
        return json({ error: "Failed to log usage" }, 500);
      }

      return json({ logged: true, tool: toolName, used: increment, date: today });
    }
  } catch (err) {
    console.error("[log-usage] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
