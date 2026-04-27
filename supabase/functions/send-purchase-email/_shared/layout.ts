/**
 * Base HTML layout for all VOLYNX transactional emails.
 *
 * Dark, premium, brand-aligned with the platform — but kept compatible with
 * conservative email clients (Outlook, Apple Mail) by sticking to inline
 * styles, table-free flexbox-emulation via display:block, and no CSS vars.
 */

export interface LayoutProps {
  preheader: string;
  heading: string;
  intro: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  footerNote?: string;
  locale: "en" | "pt";
}

export function renderEmail(p: LayoutProps): string {
  const cta = p.ctaLabel && p.ctaUrl
    ? `<a href="${escape(p.ctaUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#2dd4bf 0%,#06b6d4 100%);color:#09090b;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;letter-spacing:.01em;">${escape(p.ctaLabel)}</a>`
    : "";

  const secondary = p.secondaryLabel && p.secondaryUrl
    ? `<a href="${escape(p.secondaryUrl)}" style="display:inline-block;margin-left:12px;padding:14px 24px;background:transparent;color:#d4d4d8;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;border:1px solid #3f3f46;">${escape(p.secondaryLabel)}</a>`
    : "";

  const helpLine = p.locale === "pt"
    ? `Precisa de ajuda? Responda este email ou abra <a href="https://volynx.world/support/" style="color:#67e8f9;text-decoration:underline;">volynx.world/support</a>.`
    : `Need help? Reply to this email or visit <a href="https://volynx.world/support/" style="color:#67e8f9;text-decoration:underline;">volynx.world/support</a>.`;

  const legalLine = p.locale === "pt"
    ? `Você recebeu este email porque comprou no VOLYNX. Receipt fiscal completo no Stripe.`
    : `You received this because you purchased on VOLYNX. Full receipt is in your Stripe email.`;

  return `<!DOCTYPE html>
<html lang="${p.locale === "pt" ? "pt-BR" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(p.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fafafa;">
  <span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escape(p.preheader)}</span>
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://volynx.world/" style="text-decoration:none;color:#fafafa;font-size:18px;font-weight:800;letter-spacing:.18em;">VOLYNX</a>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:24px;padding:40px 32px;">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.2;color:#fafafa;letter-spacing:-.01em;">${escape(p.heading)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d4d8;">${escape(p.intro)}</p>
      ${p.bodyHtml || ""}
      <div style="margin-top:32px;text-align:center;">
        ${cta}${secondary}
      </div>
    </div>
    <div style="margin-top:32px;font-size:13px;line-height:1.6;color:#71717a;text-align:center;">
      ${p.footerNote ? `<p style="margin:0 0 12px;">${p.footerNote}</p>` : ""}
      <p style="margin:0 0 8px;">${helpLine}</p>
      <p style="margin:0;color:#52525b;font-size:12px;">${legalLine}</p>
    </div>
  </div>
</body>
</html>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c);
  });
}
