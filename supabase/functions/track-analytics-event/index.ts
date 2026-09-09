import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://volynx.world",
  "http://127.0.0.1:4321",
  "http://localhost:4321",
]);

const EVENT_NAMES = new Set([
  "page_view",
  "campaign_view",
  "cta_click",
  "signup_started",
  "signup_confirmation_requested",
  "signup_completed",
  "signup_resend_requested",
  "signup_failed",
  "checkout_started",
  "checkout_redirected",
  "checkout_failed",
  "tool_started",
  "activation_started",
  "activation_result",
  "upgrade_view",
]);

const DEVICE_TYPES = new Set(["mobile", "tablet", "desktop", "other"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LABEL_RE = /^[a-z0-9][a-z0-9._~:-]{0,79}$/;
const PATH_RE = /^\/[a-zA-Z0-9/_-]{0,239}$/;
const HOST_RE = /^[a-z0-9.-]{1,120}$/;

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function isAllowedOrigin(req: Request) {
  return ALLOWED_ORIGINS.has(req.headers.get("origin") || "");
}

function optionalLabel(value: unknown, max = 80) {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().trim();
  return normalized.length <= max && LABEL_RE.test(normalized) ? normalized : null;
}

Deno.serve(async (req: Request) => {
  if (!isAllowedOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 4096) return json(req, { error: "payload_too_large" }, 413);

  try {
    const rawBody = await req.text();
    if (rawBody.length > 4096) return json(req, { error: "payload_too_large" }, 413);
    const body = JSON.parse(rawBody || "{}");

    const eventName = typeof body.event_name === "string" ? body.event_name : "";
    const pagePath = typeof body.page_path === "string" ? body.page_path : "";
    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    const deviceType = typeof body.device_type === "string" ? body.device_type : "other";

    if (!EVENT_NAMES.has(eventName)) return json(req, { error: "invalid_event" }, 400);
    if (!PATH_RE.test(pagePath)) return json(req, { error: "invalid_page" }, 400);
    if (!UUID_RE.test(sessionId)) return json(req, { error: "invalid_session" }, 400);
    if (!DEVICE_TYPES.has(deviceType)) return json(req, { error: "invalid_device" }, 400);

    const referrerHost = optionalLabel(body.referrer_host, 120);
    if (referrerHost && !HOST_RE.test(referrerHost)) return json(req, { error: "invalid_referrer" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) return json(req, { error: "analytics_unavailable" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from("analytics_events").insert({
      event_name: eventName,
      event_label: optionalLabel(body.event_label),
      page_path: pagePath,
      session_id: sessionId,
      referrer_host: referrerHost,
      utm_source: optionalLabel(body.utm_source),
      utm_medium: optionalLabel(body.utm_medium),
      utm_campaign: optionalLabel(body.utm_campaign),
      locale: optionalLabel(body.locale, 16),
      device_type: deviceType,
      event_source: "browser",
    });

    if (error) {
      console.error("[track-analytics-event] insert_failed", error.code || "unknown");
      return json(req, { error: "analytics_unavailable" }, 503);
    }

    return json(req, { ok: true }, 202);
  } catch (error) {
    console.error("[track-analytics-event] invalid_request", (error as Error).name);
    return json(req, { error: "invalid_request" }, 400);
  }
});
