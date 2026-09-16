/**
 * 9 transactional email templates (EN + PT) in one file.
 *
 * Each renderer takes the user-resolved profile and a free-form payload from
 * the webhook, returns { subject, html } for the Resend call. Locale defaults
 * to 'en' if profile/payload don't pin it. Product names are never translated.
 */

import { renderEmail } from "./layout.ts";

export type Locale = "en" | "pt";
export type EventType =
  | "tokens_credited"
  | "plan_activated"
  | "bundle_activated"
  | "voucher_redeemed"
  | "propertyflow_ready"
  | "addon_activated"
  | "kit_delivered"
  | "icons_delivered"
  | "cvitae_template_unlocked"
  | "devjourney_activated";

export interface Profile {
  email: string;
  first_name: string;
  locale: Locale;
}

export interface RenderArgs {
  event_type: EventType;
  profile: Profile;
  payload: Record<string, any>;
}

export interface RenderResult {
  subject: string;
  html: string;
}

const URL_BASE = "https://volynx.world";
const ICONS_DELIVERY_URL = `${URL_BASE}/dashboard/purchases/icons/`;
const KITS_DELIVERY_URL = `${URL_BASE}/dashboard/purchases/kits/`;
const PROPERTYFLOW_DELIVERY_URL = `${URL_BASE}/dashboard/purchases/propertyflow/`;

export function renderTemplate(args: RenderArgs): RenderResult {
  const { event_type, profile, payload } = args;
  switch (event_type) {
    case "tokens_credited":         return tokensCredited(profile, payload);
    case "plan_activated":          return planActivated(profile, payload);
    case "bundle_activated":        return bundleActivated(profile, payload);
    case "voucher_redeemed":        return voucherRedeemed(profile, payload);
    case "propertyflow_ready":      return propertyflowReady(profile, payload);
    case "addon_activated":         return addonActivated(profile, payload);
    case "kit_delivered":           return kitDelivered(profile, payload);
    case "icons_delivered":         return iconsDelivered(profile, payload);
    case "cvitae_template_unlocked": return cvitaeTemplateUnlocked(profile, payload);
    case "devjourney_activated":   return devJourneyActivated(profile, payload);
    default: throw new Error(`Unknown event_type: ${event_type}`);
  }
}

// ── tokens_credited ────────────────────────────────────────────────────────
function tokensCredited(p: Profile, x: Record<string, any>): RenderResult {
  const tokens = Number(x.tokens || 0);
  const balance = Number(x.new_balance || 0);
  const pack = String(x.pack_name || "Token pack");
  const subject = p.locale === "pt"
    ? `Você recebeu ${tokens} VX`
    : `You received ${tokens} VX`;
  const heading = subject;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, seu pagamento foi confirmado e ${tokens} VX já estão disponíveis na sua conta.`
    : `Hi ${p.first_name}, your payment cleared and ${tokens} VX are already in your account.`;
  const bodyHtml = `
    <div style="background:#0a0a0b;border:1px solid #27272a;border-radius:14px;padding:18px 20px;margin:20px 0;">
      <div style="font-size:12px;color:#71717a;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">${p.locale === "pt" ? "Pacote" : "Pack"}</div>
      <div style="font-size:16px;color:#fafafa;font-weight:600;margin-bottom:12px;">${pack}</div>
      <div style="font-size:12px;color:#71717a;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">${p.locale === "pt" ? "Saldo total" : "New balance"}</div>
      <div style="font-size:24px;color:#2dd4bf;font-weight:800;">${balance.toLocaleString()} VX</div>
    </div>`;
  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading,
      intro,
      bodyHtml,
      ctaLabel: p.locale === "pt" ? "Ver minhas tools" : "Use my tokens",
      ctaUrl: `${URL_BASE}/tools/`,
      secondaryLabel: p.locale === "pt" ? "Recarregar de novo" : "Top up again",
      secondaryUrl: `${URL_BASE}/recarregar/`,
      locale: p.locale,
    }),
  };
}

// ── plan_activated ─────────────────────────────────────────────────────────
function planActivated(p: Profile, x: Record<string, any>): RenderResult {
  const planName = String(x.plan_name || "Your plan");
  const product = String(x.product || "volynx") as "volynx" | "daily" | "cvitae";
  const features: string[] = Array.isArray(x.features) ? x.features : [];
  const productUrl = product === "daily" ? "https://daily.volynx.world/"
    : product === "cvitae" ? "https://cvitae.volynx.world/"
    : `${URL_BASE}/builder/`;

  const subject = p.locale === "pt"
    ? `${planName} ativado`
    : `${planName} is active`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, seu ${planName} já está ativo. Tudo abaixo já está liberado na sua conta.`
    : `Hi ${p.first_name}, ${planName} is now active. Everything below is unlocked on your account.`;

  const featuresHtml = features.length
    ? `<ul style="margin:20px 0 0;padding:0;list-style:none;">
        ${features.map(f => `<li style="padding:8px 0;border-bottom:1px solid #27272a;font-size:14px;color:#d4d4d8;"><span style="color:#2dd4bf;font-weight:700;margin-right:10px;">✓</span>${escapeText(f)}</li>`).join("")}
      </ul>`
    : "";

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: featuresHtml,
      ctaLabel: p.locale === "pt" ? `Abrir ${planName}` : `Open ${planName}`,
      ctaUrl: productUrl,
      locale: p.locale,
    }),
  };
}

// ── bundle_activated ───────────────────────────────────────────────────────
function bundleActivated(p: Profile, x: Record<string, any>): RenderResult {
  const bundleLabel = String(x.bundle_label || "Your bundle");
  const products: { name: string; url: string }[] = Array.isArray(x.products) ? x.products : [];
  const subject = p.locale === "pt"
    ? `${bundleLabel} ativado`
    : `${bundleLabel} is live`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, seu bundle ${bundleLabel} foi ativado. Os dois produtos estão liberados.`
    : `Hi ${p.first_name}, your ${bundleLabel} bundle is active. Both products are unlocked.`;
  const productsHtml = products.map(p => `
    <a href="${escapeAttr(p.url)}" style="display:block;background:#0a0a0b;border:1px solid #27272a;border-radius:14px;padding:18px 20px;margin:12px 0;text-decoration:none;color:#fafafa;">
      <div style="font-size:16px;font-weight:600;">${escapeText(p.name)}</div>
      <div style="font-size:13px;color:#67e8f9;margin-top:4px;">${escapeAttr(p.url)} →</div>
    </a>`).join("");

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: productsHtml,
      ctaLabel: p.locale === "pt" ? "Ver minha conta" : "Open my account",
      ctaUrl: `${URL_BASE}/profile/`,
      locale: p.locale,
    }),
  };
}

// ── voucher_redeemed ───────────────────────────────────────────────────────
function voucherRedeemed(p: Profile, x: Record<string, any>): RenderResult {
  const label = String(x.voucher_label || "your voucher");
  const grants: string[] = Array.isArray(x.grants) ? x.grants : [];
  const subject = p.locale === "pt"
    ? `Voucher ${label} resgatado`
    : `Voucher ${label} redeemed`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, o voucher foi resgatado e os benefícios abaixo já estão na sua conta.`
    : `Hi ${p.first_name}, your voucher has been redeemed and the benefits below are now on your account.`;
  const grantsHtml = grants.length
    ? `<ul style="margin:20px 0 0;padding:0;list-style:none;">${grants.map(g => `<li style="padding:8px 0;border-bottom:1px solid #27272a;font-size:14px;color:#d4d4d8;"><span style="color:#2dd4bf;font-weight:700;margin-right:10px;">✓</span>${escapeText(g)}</li>`).join("")}</ul>`
    : "";

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: grantsHtml,
      ctaLabel: p.locale === "pt" ? "Ver minha conta" : "See my account",
      ctaUrl: `${URL_BASE}/profile/`,
      locale: p.locale,
    }),
  };
}

// ── propertyflow_ready ─────────────────────────────────────────────────────
function propertyflowReady(p: Profile, x: Record<string, any>): RenderResult {
  const tier = String(x.tier_label || x.tier || "Starter");
  const url = String(x.signed_url || PROPERTYFLOW_DELIVERY_URL);
  const expiresAt = String(x.expires_at || "");
  const sessionId = String(x.session_id || "");
  const workspaceUrl = String(x.workspace_url || "https://volynx.world/dashboard/propertyflow/");
  const publicUrl = String(x.public_url || "");
  const templateCount = Number(x.template_count || 0);
  const deliveryUrl = sessionId
    ? `${PROPERTYFLOW_DELIVERY_URL}?session_id=${encodeURIComponent(sessionId)}`
    : PROPERTYFLOW_DELIVERY_URL;
  const expiresHuman = expiresAt
    ? new Date(expiresAt).toLocaleString(p.locale === "pt" ? "pt-BR" : "en-GB", { dateStyle: "medium", timeStyle: "short" })
    : "";

  const subject = p.locale === "pt"
    ? `Sua PropertyFlow ${tier} está pronta`
    : `PropertyFlow ${tier} is ready`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, seu workspace PropertyFlow ${tier} já foi preparado. Abra o painel para concluir sua identidade e começar a publicar — o site já tem um endereço VOLYNX reservado.`
    : `Hi ${p.first_name}, your PropertyFlow ${tier} workspace is ready. Open the dashboard to finish your brand setup and start publishing — a VOLYNX address is already reserved for you.`;
  const expiryNote = expiresHuman
    ? (p.locale === "pt" ? `<p style="margin:18px 0 0;font-size:13px;color:#a1a1aa;">Link válido até <strong>${escapeText(expiresHuman)}</strong>.</p>` : `<p style="margin:18px 0 0;font-size:13px;color:#a1a1aa;">Link valid until <strong>${escapeText(expiresHuman)}</strong>.</p>`)
    : "";
  const workspaceNote = `<div style="background:#0a0a0b;border:1px solid #27272a;border-radius:14px;padding:18px 20px;margin:20px 0;">
    <div style="font-size:12px;color:#71717a;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">${p.locale === "pt" ? "Workspace publicado" : "Published workspace"}</div>
    <a href="${escapeText(workspaceUrl)}" style="font-size:16px;color:#2dd4bf;font-weight:800;text-decoration:none;">${p.locale === "pt" ? "Abrir painel PropertyFlow" : "Open PropertyFlow dashboard"}</a>
    ${publicUrl ? `<div style="margin-top:12px;font-size:13px;color:#d4d4d8;">${p.locale === "pt" ? "Endereço público:" : "Public address:"} <a href="${escapeText(publicUrl)}" style="color:#f5d58a;">${escapeText(publicUrl)}</a></div>` : ""}
    ${templateCount ? `<div style="margin-top:8px;font-size:12px;color:#a1a1aa;">${templateCount} ${p.locale === "pt" ? "templates disponíveis no seu tier." : "templates available in your tier."}</div>` : ""}
  </div>`;

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: workspaceNote + expiryNote,
      ctaLabel: p.locale === "pt" ? "Abrir meu workspace" : "Open my workspace",
      ctaUrl: workspaceUrl,
      secondaryLabel: p.locale === "pt" ? "Baixar pacote fonte" : "Download source package",
      secondaryUrl: url || deliveryUrl,
      locale: p.locale,
    }),
  };
}

// ── addon_activated ────────────────────────────────────────────────────────
function addonActivated(p: Profile, x: Record<string, any>): RenderResult {
  const name = String(x.addon_name || x.addon_id || "Add-on");
  const where = String(x.where_to_use || "");
  const subject = p.locale === "pt"
    ? `${name} ativado`
    : `${name} unlocked`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, o add-on ${name} foi ativado na sua conta.`
    : `Hi ${p.first_name}, the ${name} add-on is now unlocked on your account.`;
  const whereNote = where
    ? `<p style="margin:18px 0 0;font-size:14px;color:#d4d4d8;">${escapeText(where)}</p>`
    : "";

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: whereNote,
      ctaLabel: p.locale === "pt" ? "Usar agora" : "Use it now",
      ctaUrl: `${URL_BASE}/builder/`,
      locale: p.locale,
    }),
  };
}

// ── kit_delivered ──────────────────────────────────────────────────────────
function kitDelivered(p: Profile, x: Record<string, any>): RenderResult {
  const kitName = String(x.kit_name || "Your kit");
  const projectId = String(x.project_id || "");
  const tier = String(x.tier_label || "");
  const subject = p.locale === "pt"
    ? `Seu projeto ${kitName} está no Builder`
    : `Your ${kitName} project is open in Builder`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, criamos seu projeto ${kitName}${tier ? " (" + tier + ")" : ""} no Builder. É só abrir, editar conteúdo e publicar.`
    : `Hi ${p.first_name}, your ${kitName}${tier ? " (" + tier + ")" : ""} project is auto-loaded in Builder. Edit the content and publish — that's it.`;
  const builderUrl = projectId
    ? `${URL_BASE}/builder/?project=${encodeURIComponent(projectId)}`
    : `${URL_BASE}/builder/`;
  const sessionId = String(x.session_id || "");
  const kitDeliveryUrl = sessionId
    ? `${KITS_DELIVERY_URL}?session_id=${encodeURIComponent(sessionId)}`
    : KITS_DELIVERY_URL;

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      ctaLabel: p.locale === "pt" ? "Abrir no Builder" : "Open in Builder",
      ctaUrl: builderUrl,
      secondaryLabel: p.locale === "pt" ? "Abrir entrega do kit" : "Open kit delivery",
      secondaryUrl: kitDeliveryUrl,
      locale: p.locale,
    }),
  };
}

// ── icons_delivered ────────────────────────────────────────────────────────
function iconsDelivered(p: Profile, x: Record<string, any>): RenderResult {
  const tier = String(x.tier || "");
  const kind = String(x.kind || "");
  const isSingle = kind === "single";
  const sessionId = String(x.session_id || "");
  const signedUrl = String(x.signed_url || "");
  const deliveryStatus = String(x.delivery_status || "");
  const ready = Boolean(signedUrl) && (!deliveryStatus || deliveryStatus === "ready");
  const dashboardUrl = sessionId
    ? `${URL_BASE}/dashboard/purchases/icons/?session_id=${encodeURIComponent(sessionId)}`
    : ICONS_DELIVERY_URL;
  const downloadUrl = ready ? signedUrl : dashboardUrl;
  const subject = ready
    ? (isSingle
      ? (p.locale === "pt" ? `Seu ícone está pronto` : `Your icon is ready`)
      : (p.locale === "pt" ? `Seu pacote de ícones está pronto` : `Your icon pack is ready`))
    : (p.locale === "pt" ? `Sua compra de ícones foi registrada` : `Your icon purchase is registered`);
  const intro = ready
    ? (isSingle
      ? (p.locale === "pt"
        ? `Olá ${p.first_name}, seu ícone ${tier ? tier + " " : ""}já está disponível. O link é privado, válido por 24h e renovável quando precisar.`
        : `Hi ${p.first_name}, your ${tier ? tier + " " : ""}icon is ready. The link is private, valid for 24h, and refreshable anytime.`)
      : (p.locale === "pt"
        ? `Olá ${p.first_name}, seu pacote ${tier ? tier + " " : ""}já está disponível. O link é privado, válido por 24h e renovável quando precisar.`
        : `Hi ${p.first_name}, your ${tier ? tier + " " : ""}pack is ready. The link is private, valid for 24h, and refreshable anytime.`))
    : (p.locale === "pt"
      ? `Olá ${p.first_name}, sua compra de ícones foi registrada. Abra a página de entrega para gerar ou recuperar o link privado.`
      : `Hi ${p.first_name}, your icon purchase is registered. Open the delivery page to generate or recover the private link.`);
  const expiresAt = String(x.expires_at || "");
  const expiresHuman = expiresAt
    ? new Date(expiresAt).toLocaleString(p.locale === "pt" ? "pt-BR" : "en-GB", { dateStyle: "medium", timeStyle: "short" })
    : "";
  const expiryNote = ready && expiresHuman
    ? (p.locale === "pt" ? `<p style="margin:18px 0 0;font-size:13px;color:#a1a1aa;">Link válido até <strong>${escapeText(expiresHuman)}</strong>.</p>` : `<p style="margin:18px 0 0;font-size:13px;color:#a1a1aa;">Link valid until <strong>${escapeText(expiresHuman)}</strong>.</p>`)
    : "";

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: expiryNote,
      ctaLabel: ready
        ? (isSingle
          ? (p.locale === "pt" ? "Baixar arquivo privado" : "Download private file")
          : (p.locale === "pt" ? "Baixar ZIP privado" : "Download private ZIP"))
        : (p.locale === "pt" ? "Abrir entrega" : "Open delivery"),
      ctaUrl: downloadUrl,
      secondaryLabel: ready ? (p.locale === "pt" ? "Ver entregas" : "Open delivery page") : undefined,
      secondaryUrl: ready ? dashboardUrl : undefined,
      locale: p.locale,
    }),
  };
}

// ── cvitae_template_unlocked ───────────────────────────────────────────────
function cvitaeTemplateUnlocked(p: Profile, x: Record<string, any>): RenderResult {
  const tplName = String(x.template_name || "Template");
  const tokensSpent = Number(x.tokens_spent || 0);
  const subject = p.locale === "pt"
    ? `Template ${tplName} desbloqueado`
    : `Template ${tplName} unlocked`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, o template ${tplName} foi desbloqueado no CVitae${tokensSpent ? " (" + tokensSpent + " VX)" : ""}. Já dá pra abrir e usar no editor.`
    : `Hi ${p.first_name}, the ${tplName} template is unlocked in CVitae${tokensSpent ? " (" + tokensSpent + " VX)" : ""}. Open the editor and use it now.`;

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      ctaLabel: p.locale === "pt" ? "Abrir CVitae" : "Open CVitae",
      ctaUrl: "https://cvitae.volynx.world/",
      locale: p.locale,
    }),
  };
}

// ── devjourney_activated ───────────────────────────────────────────────────
function devJourneyActivated(p: Profile, x: Record<string, any>): RenderResult {
  const tier = String(x.tier || "pro").toLowerCase() === "bundle" ? "Bundle" : "Pro";
  const productName = `Dev Journey ${tier}`;
  const subject = p.locale === "pt"
    ? `${productName} ativado`
    : `${productName} is active`;
  const intro = p.locale === "pt"
    ? `Olá ${p.first_name}, seu acesso ao ${productName} foi confirmado. Os materiais liberados já estão disponíveis na área do aluno.`
    : `Hi ${p.first_name}, your ${productName} access is confirmed. The unlocked materials are now available in your student area.`;

  return {
    subject,
    html: renderEmail({
      preheader: intro,
      heading: subject,
      intro,
      bodyHtml: "",
      ctaLabel: p.locale === "pt" ? "Abrir área do aluno" : "Open student area",
      ctaUrl: `${URL_BASE}/dev-journey/student/`,
      secondaryLabel: p.locale === "pt" ? "Ver entregas" : "View deliveries",
      secondaryUrl: `${URL_BASE}/delivery/`,
      locale: p.locale,
    }),
  };
}

function escapeText(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c));
}
function escapeAttr(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
