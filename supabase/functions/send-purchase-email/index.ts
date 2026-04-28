/**
 * VOLYNX — send-purchase-email
 *
 * Single dispatcher for transactional post-purchase emails. Webhooks insert
 * a row into email_log (status=pending) synchronously and call this function
 * fire-and-forget. The function:
 *   1. Loads the email_log row (or accepts the payload directly for direct
 *      callers like /redeem-voucher),
 *   2. Resolves recipient + locale from public.profiles,
 *   3. Renders the matching template,
 *   4. Sends via Resend,
 *   5. Updates email_log status (sent | failed) with provider + provider_id.
 *
 * Two call modes:
 *
 *   POST /functions/v1/send-purchase-email
 *     { email_log_id: <uuid> }                       — process an existing pending row
 *
 *   POST /functions/v1/send-purchase-email
 *     { event_type, user_id, payload, idempotency_key } — insert + process in one call
 *
 * Auth: requires service-role-key OR a verified webhook secret. We accept the
 * service-role key in the Authorization header because the only callers are
 * other edge functions (stripe-webhook, pix-webhook, redeem-voucher, etc.)
 * that already hold it.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { renderTemplate, type EventType, type Locale, type Profile } from "./_shared/templates.ts";
import { sendEmail } from "./_shared/resend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("email, full_name, locale")
    .eq("id", userId)
    .maybeSingle();
  if (!prof?.email) return null;
  const locale: Locale = (prof.locale === "pt" || prof.locale === "pt-BR") ? "pt" : "en";
  const fullName = String(prof.full_name || "").trim();
  const firstName = fullName ? fullName.split(/\s+/)[0] : (prof.email.split("@")[0] || "there");
  return { email: prof.email, first_name: firstName, locale };
}

interface IncomingDirect {
  event_type: EventType;
  user_id: string;
  payload: Record<string, any>;
  idempotency_key: string;
  recipient_email?: string;
}

interface IncomingById {
  email_log_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  // Authorization: only accept service_role token from internal callers.
  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (auth !== SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let body: Partial<IncomingDirect & IncomingById>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }

  // Resolve email_log row — either by id (caller already inserted) or by
  // creating one from the direct payload (caller wants one-shot dispatch).
  let logId: string | null = null;
  let eventType: EventType | null = null;
  let userId: string | null = null;
  let payload: Record<string, any> = {};
  let recipientEmail: string | null = null;

  if (body.email_log_id) {
    const { data: row, error } = await supabase
      .from("email_log")
      .select("id, event_type, user_id, payload, recipient_email, status")
      .eq("id", body.email_log_id)
      .maybeSingle();
    if (error || !row) return jsonResponse({ error: "log_not_found" }, 404);
    if (row.status === "sent") return jsonResponse({ ok: true, skipped: "already_sent" });
    logId = row.id;
    eventType = row.event_type as EventType;
    userId = row.user_id;
    payload = row.payload || {};
    recipientEmail = row.recipient_email;
  } else if (body.event_type && body.user_id && body.idempotency_key) {
    eventType = body.event_type;
    userId = body.user_id;
    payload = body.payload || {};
    recipientEmail = body.recipient_email || null;

    // Insert the email_log row (idempotent via unique index).
    const { data: inserted, error: insertErr } = await supabase
      .from("email_log")
      .insert({
        user_id: userId,
        event_type: eventType,
        idempotency_key: body.idempotency_key,
        recipient_email: recipientEmail || "pending",
        payload,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      // If duplicate (idempotency hit), short-circuit — already in flight or sent.
      if (insertErr.code === "23505") {
        return jsonResponse({ ok: true, skipped: "duplicate_idempotency_key" });
      }
      console.error("email_log insert error:", insertErr.message);
      return jsonResponse({ error: "log_insert_failed", detail: insertErr.message }, 500);
    }
    logId = inserted?.id || null;
  } else {
    return jsonResponse({ error: "missing_params" }, 400);
  }

  if (!eventType || !userId || !logId) {
    return jsonResponse({ error: "incomplete_state" }, 500);
  }

  // Resolve recipient + locale.
  const profile = await loadProfile(userId);
  const finalEmail = recipientEmail && recipientEmail !== "pending"
    ? recipientEmail
    : profile?.email || null;

  if (!profile || !finalEmail) {
    await supabase.from("email_log")
      .update({ status: "failed", error: "profile_or_email_missing" })
      .eq("id", logId);
    return jsonResponse({ error: "profile_or_email_missing" }, 422);
  }

  // Some callers (e.g. checkout where profile.email is empty) override.
  const sendingProfile: Profile = { ...profile, email: finalEmail };

  // Render + send.
  let rendered;
  try {
    rendered = renderTemplate({ event_type: eventType, profile: sendingProfile, payload });
  } catch (e) {
    await supabase.from("email_log")
      .update({ status: "failed", error: `render_error: ${(e as Error).message}` })
      .eq("id", logId);
    return jsonResponse({ error: "render_failed", detail: (e as Error).message }, 500);
  }

  const sendRes = await sendEmail({
    to: finalEmail,
    subject: rendered.subject,
    html: rendered.html,
    tags: [
      { name: "event_type", value: eventType },
      { name: "log_id", value: logId },
    ],
  });

  if (!sendRes.ok) {
    await supabase.from("email_log")
      .update({
        status: "failed",
        attempts: (payload?._attempts || 0) + 1,
        provider: "resend",
        error: sendRes.error,
      })
      .eq("id", logId);
    return jsonResponse({ ok: false, error: sendRes.error }, 502);
  }

  await supabase.from("email_log")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider: "resend",
      provider_id: sendRes.messageId || null,
      recipient_email: finalEmail,
    })
    .eq("id", logId);

  return jsonResponse({ ok: true, message_id: sendRes.messageId });
});
