import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TOOLS = new Set(["upscale", "compress", "convert", "bg-remove"]);

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
    if (!token) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const {
      tool,
      input_bytes,
      plan_at_time,
      metadata,
    } = await req.json().catch(() => ({
      tool: "",
      input_bytes: null,
      plan_at_time: "free",
      metadata: {},
    }));

    const toolName = (tool || "").toLowerCase().trim();
    if (!ALLOWED_TOOLS.has(toolName)) {
      return json({ error: "Invalid tool" }, 400);
    }

    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = {
      user_id: user.id,
      tool: toolName,
      input_bytes: Number.isFinite(Number(input_bytes)) ? Number(input_bytes) : null,
      plan_at_time: typeof plan_at_time === "string" ? plan_at_time.toLowerCase().trim() : "free",
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    };

    const { error: insertErr } = await supabase
      .from("tool_usage_log")
      .insert(payload);

    if (insertErr) {
      console.error("[track-tool-usage] insert error:", insertErr.message);
      return json({ error: "Failed to track usage" }, 500);
    }

    return json({ ok: true, tool: toolName });
  } catch (err) {
    console.error("[track-tool-usage] error:", (err as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
