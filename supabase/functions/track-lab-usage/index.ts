import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_STATUS = new Set(["started", "completed", "failed"]);

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanUuid(value: unknown) {
  const candidate = cleanText(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Tracking unavailable" }, 503);

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const authClient = createClient(supabaseUrl, anonKey, {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const toolKey = cleanText(body.tool_key || body.tool, 80);
    const action = cleanText(body.action, 80);
    const eventStatus = cleanText(body.event_status || body.status, 32);
    const requestId = cleanText(body.request_id, 160) || null;
    const testRunId = cleanText(body.test_run_id, 160);

    if (!toolKey || !action || !ALLOWED_STATUS.has(eventStatus)) {
      return json({ error: "tool_key, action and a valid event_status are required" }, 400);
    }

    let userId: string | null = null;
    if (token) {
      const { data, error } = await authClient.auth.getUser(token);
      if (!error && data.user) userId = data.user.id;
    }

    const environment = cleanText(Deno.env.get("VOLYNX_RUNTIME_ENV"), 20) || "production";
    const safeEnvironment = testRunId
      ? "test"
      : new Set(["production", "staging", "local", "test"]).has(environment)
        ? environment
        : "production";
    const source = testRunId ? "test" : "browser";

    let actorClass = userId ? "unknown" : "anonymous";
    if (testRunId) actorClass = "synthetic_test";
    if (userId && !testRunId) {
      const { data: label } = await service
        .from("lab_usage_actor_labels")
        .select("actor_class")
        .eq("user_id", userId)
        .maybeSingle();
      if (label?.actor_class) actorClass = label.actor_class;
    }

    const inputBytes = Number(body.input_bytes);
    const outputBytes = Number(body.output_bytes);
    const { data, error } = await service
      .from("lab_usage_events")
      .insert({
        tool_key: toolKey,
        action,
        event_status: eventStatus,
        user_id: userId,
        session_id: cleanUuid(body.session_id),
        request_id: requestId,
        environment: safeEnvironment,
        actor_class: actorClass,
        source,
        quantity: Number.isInteger(body.quantity) && body.quantity >= 0 ? body.quantity : 1,
        input_bytes: Number.isFinite(inputBytes) && inputBytes >= 0 ? inputBytes : null,
        output_bytes: Number.isFinite(outputBytes) && outputBytes >= 0 ? outputBytes : null,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      })
      .select("id,actor_class,environment,event_status")
      .single();

    if (error) {
      if (error.code === "23505" && requestId) return json({ ok: true, duplicate: true, request_id: requestId });
      console.error("[track-lab-usage] insert error:", error.message);
      return json({ error: "Failed to record Lab usage" }, 500);
    }

    return json({ ok: true, event: data });
  } catch (error) {
    console.error("[track-lab-usage] error:", (error as Error).message);
    return json({ error: "Server error" }, 500);
  }
});
