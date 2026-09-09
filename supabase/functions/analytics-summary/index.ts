import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://volynx.world",
  "http://127.0.0.1:4321",
  "http://localhost:4321",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
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

async function ensureAdmin(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!token) return { ok: false, status: 401, error: "missing_token" };
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return { ok: false, status: 401, error: "invalid_token" };
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_user_admin", {
    p_user_id: userData.user.id,
  });
  if (adminError) return { ok: false, status: 500, error: "admin_check_failed" };
  if (!isAdmin) return { ok: false, status: 403, error: "forbidden" };
  return { ok: true };
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] || 0) + 1;
}

Deno.serve(async (req: Request) => {
  if (!isAllowedOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: "analytics_unavailable" }, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const access = await ensureAdmin(supabase, token);
  if (!access.ok) return json(req, { error: access.error }, access.status);

  try {
    const body = await req.json().catch(() => ({}));
    const requestedDays = Number(body?.days || 7);
    const days = [7, 30].includes(requestedDays) ? requestedDays : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: events, error: eventsError }, { count: profilesCreated, error: profilesError }] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("occurred_at,event_name,event_label,page_path,session_id,event_source,referrer_host,utm_source,utm_medium,utm_campaign")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(20000),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    if (eventsError) {
      console.error("[analytics-summary] events_query_failed", eventsError.code || "unknown");
      return json(req, { error: "analytics_unavailable" }, 503);
    }
    if (profilesError) console.error("[analytics-summary] profiles_query_failed", profilesError.code || "unknown");

    const eventList = events || [];
    const sessions = new Set<string>();
    const funnel: Record<string, number> = {
      page_views: 0,
      cta_clicks: 0,
      signup_started: 0,
      signup_confirmation_requested: 0,
      signup_completed: 0,
      checkout_started: 0,
      checkout_redirected: 0,
      checkout_failed: 0,
      payment_confirmed: 0,
      fulfillment_recorded: 0,
      profiles_created: profilesError ? 0 : (profilesCreated || 0),
    };
    const topPages: Record<string, number> = {};
    const topSources: Record<string, number> = {};
    const topCampaigns: Record<string, number> = {};
    const daily: Record<string, { visitors: Set<string>; page_views: number; cta_clicks: number; signups: number; checkout_started: number; payment_confirmed: number; fulfillment_recorded: number }> = {};

    for (const event of eventList) {
      const isBrowserEvent = event.event_source !== "server";
      if (isBrowserEvent && event.session_id) sessions.add(event.session_id);
      const day = String(event.occurred_at).slice(0, 10);
      if (!daily[day]) daily[day] = { visitors: new Set(), page_views: 0, cta_clicks: 0, signups: 0, checkout_started: 0, payment_confirmed: 0, fulfillment_recorded: 0 };
      if (isBrowserEvent && event.session_id) daily[day].visitors.add(event.session_id);

      if (event.event_name === "page_view") {
        funnel.page_views += 1;
        increment(topPages, event.page_path);
        daily[day].page_views += 1;
      }
      if (event.event_name === "cta_click") {
        funnel.cta_clicks += 1;
        daily[day].cta_clicks += 1;
      }
      if (event.event_name === "signup_started") funnel.signup_started += 1;
      if (event.event_name === "signup_confirmation_requested") funnel.signup_confirmation_requested += 1;
      if (event.event_name === "signup_completed") {
        funnel.signup_completed += 1;
        daily[day].signups += 1;
      }
      if (event.event_name === "checkout_started") {
        funnel.checkout_started += 1;
        daily[day].checkout_started += 1;
      }
      if (event.event_name === "checkout_redirected") funnel.checkout_redirected += 1;
      if (event.event_name === "checkout_failed") funnel.checkout_failed += 1;
      if (event.event_name === "payment_confirmed") {
        funnel.payment_confirmed += 1;
        daily[day].payment_confirmed += 1;
      }
      if (event.event_name === "fulfillment_recorded") {
        funnel.fulfillment_recorded += 1;
        daily[day].fulfillment_recorded += 1;
      }

      if (isBrowserEvent) {
        const source = event.utm_source || event.referrer_host || "direct";
        increment(topSources, source);
        if (event.utm_campaign) increment(topCampaigns, event.utm_campaign);
        if (event.event_name === "campaign_view" && event.event_label) increment(topCampaigns, event.event_label);
      }
    }

    const rank = (record: Record<string, number>) => Object.entries(record)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));
    const timeline = Object.entries(daily)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, item]) => ({
        date,
        visitors: item.visitors.size,
        page_views: item.page_views,
        cta_clicks: item.cta_clicks,
        signups: item.signups,
        checkout_started: item.checkout_started,
        payment_confirmed: item.payment_confirmed,
        fulfillment_recorded: item.fulfillment_recorded,
      }));

    return json(req, {
      ok: true,
      range: { days, since, until: new Date().toISOString() },
      funnel: { visitors: sessions.size, ...funnel },
      top_pages: rank(topPages),
      top_sources: rank(topSources),
      top_campaigns: rank(topCampaigns),
      timeline,
    });
  } catch (error) {
    console.error("[analytics-summary] invalid_request", (error as Error).name);
    return json(req, { error: "invalid_request" }, 400);
  }
});
