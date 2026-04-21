import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

function clean(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const name = clean(body.name, 160);
    const email = clean(body.email, 220).toLowerCase();
    const brief = clean(body.brief, 5000);
    const website = clean(body.website, 250); // Honeypot: real users never fill this.

    if (website) return json({ ok: true });
    if (!name || !isEmail(email) || brief.length < 10) {
      return json({ ok: false, error: "Please include your name, a valid email, and a short brief." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "Contact backend is not configured." }, 500);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const payload = {
      name,
      email,
      project_type: clean(body.project_type, 120),
      budget: clean(body.budget, 120),
      timeline: clean(body.timeline, 120),
      message: brief,
      brief,
      source: clean(body.source_path, 500) || "contact",
      source_path: clean(body.source_path, 500),
      locale: clean(body.locale, 16) || "en",
      user_agent: clean(req.headers.get("user-agent"), 500),
      status: "new",
      read: false,
      metadata: {
        referrer: clean(body.referrer, 500),
        submitted_at: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from("contact_submissions").insert(payload);
    if (error) {
      console.error("[contact-form] insert failed:", error.message);
      return json({ ok: false, error: "Could not save your brief. Please email hello@volynx.world." }, 500);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (resendKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("CONTACT_FROM_EMAIL") || "VOLYNX <hello@volynx.world>",
          to: [Deno.env.get("CONTACT_TO_EMAIL") || "hello@volynx.world"],
          reply_to: email,
          subject: `VOLYNX brief: ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nProject: ${payload.project_type}\nBudget: ${payload.budget}\nTimeline: ${payload.timeline}\nSource: ${payload.source_path}\n\n${brief}`,
        }),
      }).catch((err) => console.error("[contact-form] email failed:", err?.message || err));
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[contact-form] error:", (err as Error).message);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
