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

function clean(value: unknown, max = 80) {
  return String(value ?? "").trim().slice(0, max);
}

function tierFor(profile: any) {
  const explicit = clean(profile?.devjourney_tier, 20).toLowerCase();
  if (["social", "pro", "bundle"].includes(explicit)) return explicit;
  const plan = clean(profile?.builder_plan, 20).toLowerCase();
  return plan === "studio" || plan === "teams" ? "bundle" : plan === "pro" ? "pro" : "social";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok: false, error: "Progress backend is not configured." }, 500);
  if (!token) return json({ ok: false, error: "Sign in to save progress." }, 401);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ ok: false, error: "Your session expired. Sign in again." }, 401);
    const userId = authData.user.id;
    const { data: profile } = await service.from("profiles").select("devjourney_tier,builder_plan").eq("id", userId).maybeSingle();
    const tier = tierFor(profile);
    const action = clean(body.action, 20).toLowerCase() || "get";

    if (action === "get") {
      const { data, error } = await service.from("devjourney_progress").select("item_id").eq("user_id", userId).eq("completed", true).order("updated_at", { ascending: true });
      if (error) throw error;
      return json({ ok: true, tier, items: (data || []).map((row) => row.item_id) });
    }

    if (action !== "upsert") return json({ ok: false, error: "Unknown action." }, 400);
    const itemId = clean(body.item_id, 64);
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(itemId)) return json({ ok: false, error: "Invalid progress item." }, 400);
    const completed = body.completed === true;
    const { error } = await service.from("devjourney_progress").upsert({ user_id: userId, item_id: itemId, completed, updated_at: new Date().toISOString() }, { onConflict: "user_id,item_id" });
    if (error) throw error;
    return json({ ok: true, tier, item_id: itemId, completed });
  } catch (error) {
    console.error("[devjourney-progress] error:", error instanceof Error ? error.message : error);
    return json({ ok: false, error: "Could not save progress." }, 500);
  }
});
