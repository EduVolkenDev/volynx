/**
 * VOLYNX — Admin Vouchers (Supabase Edge Function)
 *
 * JWT-required. Caller must have profiles.is_admin = true.
 * Actions:
 *   { action: "list" }          — returns recent vouchers (newest first)
 *   { action: "create", … }     — create voucher, auto-generates code
 *   { action: "update", id, … } — update validity, recipient gate and usage cap
 *   { action: "revoke", id }    — deactivate voucher
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

const TYPE_PREFIX: Record<string, string> = {
  black_diamond: "BD",
  builder_bonus: "KIT",
  daily_access: "DAILY",
  discount_code: "DISC",
  token_pack: "VX",
  generic: "VLX",
};

const LEGACY_TYPE_ALIASES: Record<string, string> = {
  discount: "discount_code",
  devjourney: "builder_bonus",
  icons: "builder_bonus",
  kit: "builder_bonus",
  plan: "builder_bonus",
  tokens: "token_pack",
};

const ALLOWED_TYPES = [...Object.keys(TYPE_PREFIX), ...Object.keys(LEGACY_TYPE_ALIASES)];

function normalizeType(type: string): string {
  return LEGACY_TYPE_ALIASES[type] ?? type;
}

function validateGrantContract(type: string, grants: Record<string, unknown>): string | null {
  const dailyPlan = grants.daily_plan;
  const hasDuration = Object.prototype.hasOwnProperty.call(grants, "daily_plan_expires_in_days");
  if (type === "daily_access" && !dailyPlan) return "daily_plan_required";
  if (dailyPlan !== undefined && !["free", "pro", "diamond"].includes(String(dailyPlan).toLowerCase())) {
    return "invalid_daily_plan";
  }
  if (hasDuration) {
    const days = grants.daily_plan_expires_in_days;
    if (!dailyPlan) return "daily_plan_required_for_duration";
    if (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 3650 || String(dailyPlan).toLowerCase() === "free") {
      return "invalid_daily_plan_duration";
    }
  }
  return null;
}

function normalizeExpiry(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("invalid_expires_at");
  return date.toISOString();
}

function generateCode(type: string): string {
  const prefix = TYPE_PREFIX[type] ?? "VLX";
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${prefix}-${hex}`;
}

async function ensureAdmin(token: string): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  if (!token) return { ok: false, status: 401, error: "missing_token" };
  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData?.user) return { ok: false, status: 401, error: "invalid_token" };
  const { data: adminCheck, error: rpcErr } = await supabase.rpc("is_user_admin", { p_user_id: userData.user.id });
  if (rpcErr) return { ok: false, status: 500, error: "admin_check_failed" };
  if (!adminCheck) return { ok: false, status: 403, error: "forbidden" };
  return { ok: true, userId: userData.user.id };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const auth = await ensureAdmin(token);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "list") {
      const limit = Math.min(Math.max(parseInt(body?.limit ?? 100), 1), 500);
      const { data, error } = await supabase
        .from("vouchers")
        .select("id, code, type, label, description, target_email, max_uses, times_used, transferable, expires_at, grants, active, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return json({ error: "list_failed", detail: error.message }, 500);
      return json({ ok: true, items: data ?? [] });
    }

    if (action === "redemptions") {
      const limit = Math.min(Math.max(Number.parseInt(body?.limit ?? 100, 10) || 100, 1), 500);
      let query = supabase
        .from("voucher_redemptions")
        .select("id, voucher_id, user_email, grants_applied, redeemed_at")
        .order("redeemed_at", { ascending: false })
        .limit(limit);
      if (body?.voucher_id) query = query.eq("voucher_id", String(body.voucher_id));
      const { data, error } = await query;
      if (error) return json({ error: "redemptions_failed", detail: error.message }, 500);
      return json({ ok: true, items: data ?? [] });
    }

    if (action === "create") {
      const requestedType = String(body?.type ?? "generic").toLowerCase();
      if (!ALLOWED_TYPES.includes(requestedType)) return json({ error: "invalid_type", allowed: ALLOWED_TYPES }, 400);
      const type = normalizeType(requestedType);

      const label = body?.label ? String(body.label).slice(0, 200) : null;
      const description = body?.description ? String(body.description).slice(0, 1000) : null;
      const recipientName = body?.recipient_name ? String(body.recipient_name).slice(0, 80) : null;
      const targetEmail = body?.target_email ? String(body.target_email).toLowerCase().slice(0, 320) : null;
      const maxUses = Math.min(Math.max(parseInt(body?.max_uses ?? 1), 1), 100000);
      const transferable = body?.transferable !== false;
      let expiresAt: string | null;
      try {
        expiresAt = normalizeExpiry(body?.expires_at);
      } catch {
        return json({ error: "invalid_expires_at" }, 400);
      }
      const grants = body?.grants && typeof body.grants === "object" && !Array.isArray(body.grants)
        ? body.grants as Record<string, unknown>
        : {};
      const grantError = validateGrantContract(type, grants);
      if (grantError) return json({ error: grantError }, 400);

      // Try a few times in case of code collision (very rare)
      let code = "";
      let inserted = null;
      let lastErr: string | null = null;
      for (let i = 0; i < 5; i++) {
        code = generateCode(type);
        const { data, error } = await supabase
          .from("vouchers")
          .insert({
            code,
            type,
            label,
            description,
            target_email: targetEmail,
            max_uses: maxUses,
            transferable,
            expires_at: expiresAt,
            grants,
            created_by: auth.userId,
            active: true,
          })
          .select("id, code, type, label, description, target_email, max_uses, times_used, transferable, expires_at, grants, active, created_at")
          .single();
        if (!error) { inserted = data; break; }
        if (error.code !== "23505") { lastErr = error.message; break; }
      }
      if (!inserted) return json({ error: "create_failed", detail: lastErr ?? "code_collision" }, 500);

      const baseUrl = (Deno.env.get("VOLYNX_PUBLIC_URL") || "https://volynx.world").replace(/\/$/, "");
      const inviteUrl = (() => {
        if (inserted.grants?.daily_plan) {
          const dailyUrl = new URL("/redeem/", "https://daily.volynx.world");
          dailyUrl.searchParams.set("code", inserted.code);
          return dailyUrl.toString();
        }
        if (inserted.grants?.badge !== "black_diamond") {
          const accountUrl = new URL("/account/", baseUrl);
          accountUrl.searchParams.set("voucher", inserted.code);
          return accountUrl.toString();
        }
        const u = new URL("/invite/black-diamond/", baseUrl);
        if (recipientName) u.searchParams.set("to", recipientName);
        u.searchParams.set("code", inserted.code);
        return u.toString();
      })();

      return json({ ok: true, voucher: inserted, invite_url: inviteUrl, recipient_name: recipientName });
    }

    if (action === "revoke") {
      const id = String(body?.id ?? "");
      if (!id) return json({ error: "missing_id" }, 400);
      const { data, error } = await supabase
        .from("vouchers")
        .update({ active: false })
        .eq("id", id)
        .select("id, active")
        .single();
      if (error) return json({ error: "revoke_failed", detail: error.message }, 500);
      return json({ ok: true, voucher: data });
    }

    if (action === "update") {
      const id = String(body?.id ?? "");
      if (!id) return json({ error: "missing_id" }, 400);

      const patch: Record<string, unknown> = {};
      if ("label" in body) patch.label = body.label ? String(body.label).slice(0, 200) : null;
      if ("target_email" in body) patch.target_email = body.target_email ? String(body.target_email).toLowerCase().slice(0, 320) : null;
      if ("max_uses" in body) {
        const maxUses = Number(body.max_uses);
        if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000) return json({ error: "invalid_max_uses" }, 400);
        const { data: current, error: currentError } = await supabase
          .from("vouchers")
          .select("times_used")
          .eq("id", id)
          .maybeSingle();
        if (currentError) return json({ error: "voucher_lookup_failed" }, 500);
        if (!current) return json({ error: "voucher_not_found" }, 404);
        if (maxUses < Number(current.times_used || 0)) return json({ error: "max_uses_below_redemptions" }, 400);
        patch.max_uses = maxUses;
      }
      if ("transferable" in body) patch.transferable = body.transferable === true;
      if ("expires_at" in body) {
        try {
          patch.expires_at = normalizeExpiry(body.expires_at);
        } catch {
          return json({ error: "invalid_expires_at" }, 400);
        }
      }
      if ("active" in body) patch.active = body.active === true;

      if (!Object.keys(patch).length) return json({ error: "empty_update" }, 400);

      const { data, error } = await supabase
        .from("vouchers")
        .update(patch)
        .eq("id", id)
        .select("id, code, type, label, description, target_email, max_uses, times_used, transferable, expires_at, grants, active, created_at, created_by")
        .single();
      if (error) return json({ error: "update_failed", detail: error.message }, 500);
      return json({ ok: true, voucher: data });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    console.error("[admin-vouchers] error:", (err as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
