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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const inquiryId = String(body.inquiry_id || "").trim();
    if (!inquiryId) return json({ ok: false, error: "Missing inquiry_id" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "Backend not configured" }, 500);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: inquiry, error: inquiryError } = await supabase
      .from("world_inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      console.error("[notify-world-inquiry] inquiry fetch error:", inquiryError?.message);
      return json({ ok: false, error: "Inquiry not found" }, 404);
    }

    const [providerResult, profileResult, serviceResult, providerPlanResult] = await Promise.all([
      supabase.auth.admin.getUserById(inquiry.provider_id),
      supabase.from("world_profiles").select("display_name, handle").eq("user_id", inquiry.provider_id).maybeSingle(),
      inquiry.service_id
        ? supabase.from("world_services").select("title").eq("id", inquiry.service_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("profiles").select("world_plan").eq("id", inquiry.provider_id).maybeSingle(),
    ]);

    const providerEmail = providerResult.data?.user?.email || "";
    if (!providerEmail) {
      console.error("[notify-world-inquiry] could not resolve provider email");
      return json({ ok: false, error: "Provider email not found" }, 404);
    }

    const providerPlan = providerPlanResult.data?.world_plan === "pro" || providerPlanResult.data?.world_plan === "member"
      ? providerPlanResult.data.world_plan
      : "free";
    if (providerPlan === "free") {
      return json({ ok: true, email_sent: false, gated_by_plan: true, world_plan: providerPlan });
    }

    const providerName = profileResult.data?.display_name || "Professional";
    const profileHandle = profileResult.data?.handle || "";
    const serviceTitle = serviceResult.data?.title || "your service";

    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendKey) {
      console.warn("[notify-world-inquiry] RESEND_API_KEY not set — skipping email");
      return json({ ok: true, email_sent: false });
    }

    const managerUrl = "https://volynx.world/world/#join-world";
    const replySubject = encodeURIComponent(`Re: ${inquiry.subject}`);

    const budgetRow = inquiry.budget
      ? `<tr><td style="color:rgba(255,255,255,.42);font-size:11px;text-transform:uppercase;padding:4px 12px 4px 0;">Budget</td><td style="color:#fff;">${escapeHtml(inquiry.budget)}</td></tr>`
      : "";
    const timelineRow = inquiry.timeline
      ? `<tr><td style="color:rgba(255,255,255,.42);font-size:11px;text-transform:uppercase;padding:4px 12px 4px 0;">Timeline</td><td style="color:#fff;">${escapeHtml(inquiry.timeline)}</td></tr>`
      : "";

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,-apple-system,sans-serif;background:#07090f;color:#fff;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <p style="color:#ffd76a;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin:0 0 28px;">Volynx World</p>
    <h1 style="font-size:32px;font-weight:800;letter-spacing:-.04em;margin:0 0 10px;">New brief received</h1>
    <p style="color:rgba(255,255,255,.62);margin:0 0 28px;font-size:16px;">Hi ${escapeHtml(providerName)}, someone sent a private brief for <strong style="color:#fff;">${escapeHtml(serviceTitle)}</strong>.</p>
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px;margin-bottom:22px;">
      <p style="color:#ffd76a;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px;">Brief</p>
      <p style="font-size:20px;font-weight:700;margin:0 0 14px;">${escapeHtml(inquiry.subject)}</p>
      <p style="color:rgba(255,255,255,.72);line-height:1.65;margin:0 0 18px;white-space:pre-wrap;">${escapeHtml(inquiry.brief)}</p>
      ${budgetRow || timelineRow ? `<table style="border-collapse:collapse;width:100%;margin-top:4px;">${budgetRow}${timelineRow}</table>` : ""}
    </div>
    <a href="mailto:${encodeURIComponent(inquiry.reply_email)}?subject=${replySubject}" style="display:inline-block;background:#ffd76a;color:#090909;font-weight:800;font-size:15px;padding:14px 26px;border-radius:10px;text-decoration:none;margin-bottom:14px;">Reply to ${escapeHtml(inquiry.reply_email)}</a><br>
    <a href="${managerUrl}" style="color:rgba(255,255,255,.45);font-size:13px;text-decoration:underline;">View in World manager</a>
    <p style="margin:36px 0 0;color:rgba(255,255,255,.25);font-size:12px;">Volynx World &middot; <a href="https://volynx.world/world/${profileHandle ? `profile/?handle=${encodeURIComponent(profileHandle)}` : ""}" style="color:rgba(255,255,255,.25);">volynx.world/world/</a></p>
  </div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("CONTACT_FROM_EMAIL") || "Volynx World <hello@volynx.world>",
        to: [providerEmail],
        reply_to: inquiry.reply_email,
        subject: `New brief: ${inquiry.subject}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text().catch(() => "");
      console.error("[notify-world-inquiry] Resend error:", errText);
      return json({ ok: true, email_sent: false, warning: "Email delivery failed" });
    }

    return json({ ok: true, email_sent: true });
  } catch (err) {
    console.error("[notify-world-inquiry] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
