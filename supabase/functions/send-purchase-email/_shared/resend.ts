/**
 * Resend client wrapper — fetch-based to avoid pulling an SDK into the Edge
 * runtime. Mirrors the call shape already used by supabase/functions/contact-form.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "VOLYNX <hello@volynx.world>";

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        reply_to: args.replyTo,
        tags: args.tags,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 240)}` };
    }

    const data = await res.json().catch(() => null);
    return { ok: true, messageId: data?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
