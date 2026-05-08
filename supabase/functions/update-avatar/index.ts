// update-avatar (PT-2a)
//
// POST /update-avatar { avatar_id: string }
// Validates avatar exists in catalog, checks user's effective plan rank meets
// the avatar's requirement (or BD bypass), and writes profiles.avatar_id.
//
// Catalog mirrored from src/data/avatars.ts — keep both in sync.
//
// 200: { ok: true, avatar_id }
// 400: invalid_avatar_id | missing_avatar_id
// 401: unauthorized
// 403: bd_required | plan_required (with `required` field)
// 404: profile_not_found
// 500: update_failed | server_error

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Catalog mirror (src/data/avatars.ts) ────────────────────────────────
type AvatarSpec = { plan: string; bdOnly?: boolean };
const AVATAR_CATALOG: Record<string, AvatarSpec> = {
  "free-1":     { plan: "free" },
  "launch-1":   { plan: "launch" },
  "pro-1":      { plan: "pro" },
  "diamond-1":  { plan: "diamond" },
  "studio-1":   { plan: "studio" },
  "teams-1":    { plan: "teams" },
  "bd-main":    { plan: "free", bdOnly: true },
  "bd-1":       { plan: "free", bdOnly: true },
  "bd-2":       { plan: "free", bdOnly: true },
  "bd-alt-1":   { plan: "free", bdOnly: true },
  "bd-alt-2":   { plan: "free", bdOnly: true },
  "bd-alt-3":   { plan: "free", bdOnly: true },
  "bd-alt-4":   { plan: "free", bdOnly: true },
  "bd-black":   { plan: "free", bdOnly: true },
  "bd-gold":    { plan: "free", bdOnly: true },
};

const PLAN_RANK: Record<string, number> = {
  free: 0, launch: 1, business: 2, pro: 2, diamond: 2, studio: 3, teams: 4, enterprise: 5,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ ok: false, error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const avatarId: unknown = body?.avatar_id;
    if (!avatarId || typeof avatarId !== "string") {
      return json({ ok: false, error: "missing_avatar_id" }, 400);
    }

    const meta = AVATAR_CATALOG[avatarId];
    if (!meta) return json({ ok: false, error: "invalid_avatar_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error: "unauthorized" }, 401);

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("plan, builder_plan, daily_plan, cvitae_plan, is_black_diamond")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) return json({ ok: false, error: "profile_not_found" }, 404);

    const isBd = !!profile.is_black_diamond;

    // ── Authorization checks ─────────────────────────────────────────────
    if (meta.bdOnly && !isBd) {
      return json({ ok: false, error: "bd_required" }, 403);
    }
    if (!meta.bdOnly) {
      const ranks = [
        PLAN_RANK[(profile.plan || "free").toLowerCase()] ?? 0,
        PLAN_RANK[(profile.builder_plan || "free").toLowerCase()] ?? 0,
        PLAN_RANK[(profile.daily_plan || "free").toLowerCase()] ?? 0,
        PLAN_RANK[(profile.cvitae_plan || "free").toLowerCase()] ?? 0,
      ];
      const userRank = Math.max(...ranks);
      const reqRank = PLAN_RANK[meta.plan] ?? 99;
      if (userRank < reqRank) {
        return json({ ok: false, error: "plan_required", required: meta.plan }, 403);
      }
    }

    // ── Persist ─────────────────────────────────────────────────────────
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_id: avatarId })
      .eq("id", user.id);

    if (updErr) {
      console.error("[update-avatar] update error:", updErr.message);
      return json({ ok: false, error: "update_failed" }, 500);
    }

    return json({ ok: true, avatar_id: avatarId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server_error";
    console.error("[update-avatar] error:", message);
    return json({ ok: false, error: "server_error" }, 500);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
