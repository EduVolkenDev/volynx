import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://volynx.world",
  "http://127.0.0.1:4321",
  "http://localhost:4321",
  "http://127.0.0.1:4324",
  "http://localhost:4324",
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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: "audit_unavailable" }, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const access = await ensureAdmin(supabase, token);
  if (!access.ok) return json(req, { error: access.error }, access.status);

  try {
    const body = await req.json().catch(() => ({}));
    const requestedDays = Number(body?.days || 7);
    const days = [7, 30].includes(requestedDays) ? requestedDays : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await supabase
      .from("lab_usage_audit")
      .select("record_id,source_table,tool_key,action,event_status,user_id,user_email,occurred_at,quantity,actor_class,environment,confidence,metadata")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(10000);

    if (error) {
      console.error("[lab-usage-summary] query_failed", error.code || "unknown");
      return json(req, { error: "audit_unavailable" }, 503);
    }

    const summary = new Map<string, { tool_key: string; confirmed: number; test: number; unclassified: number; legacy: number }>();
    const confidenceTotals: Record<string, number> = {};
    const daily = new Map<string, { confirmed: number; test: number; other: number }>();
    for (const row of rows || []) {
      const confidence = String(row.confidence || "unclassified");
      confidenceTotals[confidence] = (confidenceTotals[confidence] || 0) + Number(row.quantity || 0);
      const tool = String(row.tool_key || "unknown");
      const current = summary.get(tool) || { tool_key: tool, confirmed: 0, test: 0, unclassified: 0, legacy: 0 };
      if (confidence === "confirmed") current.confirmed += Number(row.quantity || 0);
      else if (confidence === "test") current.test += Number(row.quantity || 0);
      else if (confidence === "legacy_needs_review" || confidence === "unattributed") current.legacy += Number(row.quantity || 0);
      else current.unclassified += Number(row.quantity || 0);
      summary.set(tool, current);

      const day = String(row.occurred_at || "").slice(0, 10);
      const dayTotal = daily.get(day) || { confirmed: 0, test: 0, other: 0 };
      if (confidence === "confirmed") dayTotal.confirmed += Number(row.quantity || 0);
      else if (confidence === "test") dayTotal.test += Number(row.quantity || 0);
      else dayTotal.other += Number(row.quantity || 0);
      daily.set(day, dayTotal);
    }

    return json(req, {
      ok: true,
      range: { days, since, until: new Date().toISOString() },
      totals: confidenceTotals,
      by_tool: [...summary.values()].sort((a, b) => (b.confirmed + b.test + b.legacy + b.unclassified) - (a.confirmed + a.test + a.legacy + a.unclassified)),
      timeline: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values })),
      recent: (rows || []).slice(0, 30),
    });
  } catch (error) {
    console.error("[lab-usage-summary] invalid_request", (error as Error).name);
    return json(req, { error: "invalid_request" }, 400);
  }
});
