/* global QRCodeStyling, VxPlan */
(function () {
  "use strict";

  const DEFAULT_DATA = "https://volynx.world";
  const QRGEN_STORAGE_KEY = "volynx_qrgen_projects_v1";
  const USAGE_STORAGE_KEY = "volynx_qrgen_exports_v1";
  const FREE_EXPORT_LIMIT = 2;
  const SAVE_LIMIT_FREE = 3;
  const VX_SVG_EXPORT_COST = 4;
  const DEBOUNCE_MS = 190;
  const ADMIN_EMAIL_ALLOWLIST = ["edupelomundo13@gmail.com"];
  const USER_QR_MANAGER_PATH = "/profile/qr-codes/";
  const USER_PROFILE_PATH = "/profile/";
  const ADMIN_HOME_PATH = "/admin/codes/";
  const ADMIN_QR_MANAGER_PATH = "/admin/codes/?tab=qr";
  const QR_HOST = "https://qr.volynx.world";
  const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const SLUG_LEN = 7;
  const MAX_COLLISION_RETRIES = 3;

  const PLAN_ORDER = { free: 0, launch: 1, pro: 2, studio: 3 };
  const PLAN_LABELS = { free: "Free", launch: "Launch", pro: "Pro", studio: "Studio" };
  const PLAN_LIMITS = { free: 1, launch: 5, pro: 20, studio: 50, teams: 200, enterprise: -1 };
  const CURRENCIES = ["GBP", "EUR", "BRL"];
  const PLAN_COPY = {
    free: "Live preview, basic static QR and standard PNG export.",
    launch: "More static exports, HD PNG and saved project workflow.",
    pro: "Brand-grade exports with SVG, transparent background and logo export.",
    studio: "Dynamic QR path, campaigns, analytics and client organization."
  };

  const FALLBACK_PLANS = [
    {
      id: "free",
      name: "QRGen Free",
      price: { GBP: "£0", EUR: "€0", BRL: "R$0" },
      copy: "For fast static QR drafts and standard PNGs.",
      features: ["Live preview", "Static QR", "Basic colors", "2 free exports/day"],
      cta: "Open QRGen",
      href: "/qrgen/",
      lookupKey: ""
    },
    {
      id: "launch",
      name: "QRGen Launch",
      price: { GBP: "£11", EUR: "€13", BRL: "R$69" },
      copy: "For real campaigns that need HD assets.",
      features: ["HD PNG", "More saved projects", "Gradient styles", "No friction for launch work"],
      cta: "Get Launch",
      href: "/checkout/?lookup_key=builder_launch&next=/qrgen/",
      lookupKey: "builder_launch"
    },
    {
      id: "pro",
      name: "QRGen Pro",
      price: { GBP: "£24", EUR: "€28", BRL: "R$149" },
      copy: "For brand-safe and print-ready exports.",
      features: ["SVG vector", "Transparent background", "Logo export", "4096px PNG"],
      cta: "Go Pro",
      href: "/checkout/?lookup_key=builder_pro&next=/qrgen/",
      lookupKey: "builder_pro"
    },
    {
      id: "studio",
      name: "QRGen Studio",
      price: { GBP: "£54", EUR: "€63", BRL: "R$349" },
      copy: "For dynamic QR campaigns and client work.",
      features: ["Dynamic QR direction", "Campaign organization", "Analytics path", "Client/project workflow"],
      cta: "Get Studio",
      href: "/checkout/?lookup_key=builder_studio&next=/qrgen/",
      lookupKey: "builder_studio"
    }
  ];

  function normalizeCurrency(value) {
    const code = String(value || "").toUpperCase();
    return CURRENCIES.includes(code) ? code : "GBP";
  }

  function currentCurrencyFromPage() {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCurrency = normalizeCurrency(params.get("currency") || "");
      if (urlCurrency && params.get("currency")) {
        try { localStorage.setItem("volynx_currency", urlCurrency); } catch (_) {}
        return urlCurrency;
      }
      return normalizeCurrency(localStorage.getItem("volynx_currency") || "GBP");
    } catch (_) {
      return "GBP";
    }
  }

  function normalizePlans(rows) {
    const source = Array.isArray(rows) && rows.length ? rows : FALLBACK_PLANS;
    return source.map((plan, index) => {
      const fallback = FALLBACK_PLANS[index] || FALLBACK_PLANS[0];
      return {
        ...fallback,
        ...plan,
        price: plan?.price && typeof plan.price === "object" ? plan.price : fallback.price,
        features: Array.isArray(plan?.features) && plan.features.length ? plan.features : fallback.features,
        cta: String(plan?.cta || fallback.cta || ""),
        href: String(plan?.href || fallback.href || ""),
        lookupKey: String(plan?.lookupKey || fallback.lookupKey || ""),
      };
    });
  }

  const PLANS = normalizePlans(window.VOLYNX_QRGEN_PLANS);
  let currentCurrency = currentCurrencyFromPage();

  const I18N = {
    pt: {
      "hero.kicker": "VOLYNX QRGen",
      "hero.title": "Desenhe um QR Code que combine com a sua marca.",
      "hero.subtitle": "Crie QR Codes limpos, com marca e prontos para exportar, com preview ao vivo, controles inteligentes e caminho para campanhas dinâmicas.",
      "plan.status": "Plano atual do QRGen",
      "plan.free_copy": "Preview ao vivo e exportação PNG padrão.",
      "plan.cta": "Desbloquear Pro",
      "editor.kicker": "Editor",
      "editor.title": "Conteúdo e controles de marca",
      "content.legend": "Projeto",
      "content.name": "Nome do QR",
      "content.static": "QR estático",
      "content.dynamic": "QR dinâmico",
      "content.value": "Link, texto ou destino da campanha",
      "content.example": "Preview de exemplo - digite seu conteúdo para personalizar.",
      "style.legend": "Estilo visual",
      "style.dots": "Estilo dos pontos",
      "style.dots_rounded": "Arredondado",
      "style.dots_dots": "Pontos",
      "style.dots_square": "Quadrado",
      "style.corners": "Estilo dos cantos",
      "style.color_mode": "Modo de cor",
      "style.color_solid": "Sólida",
      "style.color_gradient": "Gradiente - Launch",
      "style.color_metallic": "Metálico",
      "style.metallic_preset": "Acabamento metálico",
      "style.metallic_chrome": "Cromo",
      "style.metallic_gold": "Ouro",
      "style.metallic_rose": "Metal rosé",
      "style.metallic_volynx": "Teal VOLYNX",
      "style.error": "Correção de erro",
      "style.dot_color": "Cor do QR",
      "style.dot_color_2": "Final do gradiente",
      "style.bg": "Fundo",
      "style.preview_size": "Tamanho do preview",
      "style.margin": "Margem segura",
      "brand.legend": "Marca e segurança de impressão",
      "brand.logo": "Logo central",
      "brand.logo_note": "Exportar com logo é recurso QRGen Pro. Você pode pré-visualizar aqui.",
      "brand.logo_size": "Tamanho do logo",
      "brand.logo_margin": "Margem do logo",
      "preview.kicker": "Preview ao vivo",
      "preview.title": "Cada alteração atualiza na hora.",
      "preview.note": "Preview de exemplo - digite seu conteúdo para personalizar.",
      "export.kicker": "Exportação",
      "export.note": "Para impressão em grande formato, prefira SVG ou PNG em alta resolução.",
      "export.format": "Formato",
      "export.size": "Tamanho de exportação",
      "export.transparent": "Fundo transparente",
      "export.button": "Exportar QR final",
      "project.save": "Salvar projeto",
      "projects.kicker": "Projetos",
      "projects.title": "Workspace de QRs salvos",
      "projects.copy": "Rascunhos ficam salvos neste browser. QRs dinâmicos gerenciados ficam no seu gerenciador de QR.",
      "dynamic.title": "QR Codes dinâmicos e campanhas",
      "dynamic.copy": "O caminho de redirects dinâmicos já existe na VOLYNX. Analytics e campanhas devem ficar ligados apenas a QR dinâmicos reais.",
      "dynamic.create_title": "Criar QR dinâmico gerenciado",
      "dynamic.login_required": "Entre para criar QRs dinâmicos que você pode editar depois.",
      "dynamic.target": "Destino final",
      "dynamic.label": "Etiqueta interna",
      "dynamic.create_button": "Criar QR gerenciado",
      "dynamic.creating": "Criando...",
      "dynamic.created": "QR dinâmico criado:",
      "dynamic.quota_unlimited": "QRs dinâmicos ilimitados",
      "dynamic.quota": "{used}/{limit} QRs dinâmicos ativos",
      "dynamic.err_url": "Informe um destino http ou https válido.",
      "dynamic.err_login": "Entre para criar QRs dinâmicos editáveis.",
      "dynamic.err_quota": "Você atingiu o limite do plano. Faça upgrade ou pause um QR.",
      "dynamic.err_generic": "Não foi possível criar o QR dinâmico. Tente novamente.",
      "dynamic.err_collision": "Conflito raro de slug. Tente novamente.",
      "dynamic.item1": "Destino editável depois da impressão",
      "dynamic.item2": "Analytics sem dados inventados",
      "dynamic.item3": "Organização por campanha e cliente",
      "dynamic.manage": "Abrir gerenciador de QR dinâmico",
      "plans.kicker": "Planos QRGen",
      "plans.title": "Um produto além de um formulário gratuito de QR.",
      "account.product": "Área QRGen",
      "account.guest": "Sem login ativo",
      "account.login": "Entrar",
      "account.signup": "Criar conta",
      "account.profile": "Perfil",
      "account.codes": "Meus QRs",
      "account.admin": "Admin",
      "account.admin_codes": "QR Admin",
      "dynamic.admin_manage": "Abrir admin de QR",
      "account.logout": "Sair",
      "projects.empty": "Nenhum projeto de QR salvo ainda. Salve este design para criar o primeiro rascunho local.",
      "projects.dynamic_preview": "Preview dinâmico",
      "projects.open": "Abrir",
      "projects.clone": "Duplicar",
      "projects.delete": "Excluir",
      "projects.loaded": "Projeto carregado.",
      "projects.not_found": "Este projeto salvo não foi encontrado neste navegador.",
      "projects.duplicated": "Projeto duplicado no editor. Salve para criar um novo rascunho.",
      "projects.deleted": "Projeto excluído.",
      "plans.free.copy": "Para rascunhos rápidos de QR estático e PNG padrão.",
      "plans.free.f1": "Preview ao vivo",
      "plans.free.f2": "QR estático",
      "plans.free.f3": "Cores básicas",
      "plans.free.f4": "2 exports grátis/dia",
      "plans.launch.copy": "Para campanhas reais que precisam de assets em HD.",
      "plans.launch.f1": "PNG HD",
      "plans.launch.f2": "Mais projetos salvos",
      "plans.launch.f3": "Estilos em gradiente",
      "plans.launch.f4": "Fluxo sem atrito para lançar",
      "plans.pro.copy": "Para exportações seguras para marca e impressão.",
      "plans.pro.f1": "SVG vetorial",
      "plans.pro.f2": "Fundo transparente",
      "plans.pro.f3": "Exportação com logo",
      "plans.pro.f4": "PNG 4096px",
      "plans.studio.copy": "Para campanhas dinâmicas e trabalho com clientes.",
      "plans.studio.f1": "Caminho para QR dinâmico",
      "plans.studio.f2": "Organização por campanha",
      "plans.studio.f3": "Analytics preparado",
      "plans.studio.f4": "Fluxo por cliente/projeto"
    }
  };

  let previewQr = null;
  let logoDataUrl = "";
  let activeProjectId = null;
  let previewTimer = null;
  let currentPlan = "free";
  let remotePlan = "";
  let remoteAdminBypass = false;
  let isAdminBypass = false;

  function $(id) {
    return document.getElementById(id);
  }

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function normalizePlan(raw) {
    const p = String(raw || "free").toLowerCase();
    if (p === "studio" || p === "teams" || p === "enterprise") return "studio";
    if (p === "pro" || p === "business" || p === "diamond") return "pro";
    if (p === "launch") return "launch";
    return "free";
  }

  function bestPlan(...plans) {
    return plans
      .map(normalizePlan)
      .reduce((best, plan) => (PLAN_ORDER[plan] > PLAN_ORDER[best] ? plan : best), "free");
  }

  function refreshPlan() {
    try {
      const cached = window.VxPlan?.getCachedRelaxed?.() || window.VxPlan?.getCached?.();
      isAdminBypass = detectAdminHint() || remoteAdminBypass || cached?.isBlackDiamond === true;
      currentPlan = isAdminBypass ? "studio" : normalizePlan(remotePlan || cached?.plan);
    } catch (_) {
      isAdminBypass = detectAdminHint();
      currentPlan = isAdminBypass ? "studio" : "free";
    }

    const label = $("qgPlanLabel");
    const copy = $("qgPlanCopy");
    if (label) label.textContent = isAdminBypass ? "QRGen Admin" : `QRGen ${PLAN_LABELS[currentPlan]}`;
    if (copy) {
      copy.textContent = isAdminBypass
        ? (getLang() === "pt" ? "Bypass admin ativo. Exportações e recursos premium liberados." : "Admin bypass active. Premium exports and features are unlocked.")
        : (PLAN_COPY[currentPlan] || PLAN_COPY.free);
    }
    document.documentElement.setAttribute("data-qrgen-plan", currentPlan);
    document.documentElement.setAttribute("data-qrgen-admin", isAdminBypass ? "1" : "0");
  }

  function decodeJwtPayload(token) {
    try {
      const payload = String(token || "").split(".")[1];
      if (!payload) return null;
      let normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      normalized = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
      return JSON.parse(atob(normalized));
    } catch (_) {
      return null;
    }
  }

  function getAuthToken() {
    try {
      return localStorage.getItem("volynx_access_token") || "";
    } catch (_) {
      return "";
    }
  }

  function getSession() {
    try {
      const raw = localStorage.getItem("volynx_session");
      const stored = raw ? JSON.parse(raw) : {};
      const accessToken = getAuthToken() || stored.access_token || "";
      if (!accessToken) return null;
      const payload = decodeJwtPayload(accessToken);
      const userId = stored?.user?.id || payload?.sub || "";
      if (!userId) return null;
      return {
        ...stored,
        access_token: accessToken,
        refresh_token: localStorage.getItem("volynx_refresh_token") || stored.refresh_token || "",
        user: {
          ...(stored.user || {}),
          id: userId,
          email: stored?.user?.email || localStorage.getItem("volynx_user_email") || payload?.email || "",
        },
      };
    } catch (_) {
      return null;
    }
  }

  async function ensureSession() {
    try { window.VxAuthBridge?.hydrate?.(); } catch (_) {}
    try { await window.vxEnsureFreshToken?.(); } catch (_) {}
    return getSession();
  }

  function detectAdminHint() {
    try {
      if (window.VX_IS_ADMIN === true) return true;
      if (document.documentElement.classList.contains("vx-admin")) return true;
      if (document.body?.classList.contains("vx-admin")) return true;
      if (localStorage.getItem("volynx_is_admin") === "1") return true;
      const payload = decodeJwtPayload(getAuthToken());
      const email = String(payload?.email || localStorage.getItem("volynx_user_email") || "").toLowerCase();
      if (email && ADMIN_EMAIL_ALLOWLIST.includes(email)) return true;
      if (payload?.app_metadata?.is_admin === true) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function getSessionUserId() {
    return decodeJwtPayload(getAuthToken())?.sub || "";
  }

  function generateSlug() {
    const buf = new Uint8Array(SLUG_LEN);
    crypto.getRandomValues(buf);
    let out = "";
    for (let i = 0; i < SLUG_LEN; i += 1) {
      out += SLUG_ALPHABET[buf[i] % SLUG_ALPHABET.length];
    }
    return out;
  }

  function normalizeTargetUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function isValidHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch("/config.json", { cache: "no-store" });
      return res.ok ? await res.json() : {};
    } catch (_) {
      return {};
    }
  }

  async function refreshRemoteEntitlement() {
    if (!hasFreshAuth()) return;
    const uid = getSessionUserId();
    if (!uid) return;
    const cfg = await loadConfig();
    const supabaseUrl = String(cfg.supabaseUrl || cfg.supabase_url || "").replace(/\/$/, "");
    const anonKey = cfg.supabaseAnonKey || cfg.anonKey || "";
    const token = getAuthToken();
    if (!supabaseUrl || !anonKey || !token) return;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=is_admin,plan,builder_plan,is_black_diamond`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });
      if (!res.ok) return;
      const rows = await res.json();
      const profile = Array.isArray(rows) ? rows[0] : null;
      if (!profile) return;

      if (profile.is_admin) {
        remoteAdminBypass = true;
        isAdminBypass = true;
        currentPlan = "studio";
        try {
          localStorage.setItem("volynx_is_admin", "1");
          localStorage.setItem("volynx_is_admin_ts", String(Date.now()));
        } catch (_) {}
      } else if (profile.is_black_diamond) {
        remoteAdminBypass = true;
        isAdminBypass = true;
        currentPlan = "studio";
      } else {
        remoteAdminBypass = false;
        const resolved = bestPlan(profile.plan, profile.builder_plan);
        remotePlan = PLAN_ORDER[resolved] > PLAN_ORDER[currentPlan] ? resolved : currentPlan;
      }

      refreshPlan();
      renderPlans();
      syncAccountBar();
      schedulePreview();
    } catch (err) {
      console.warn("[qrgen] entitlement refresh failed", err);
    }
  }

  function dynamicMessage(text, kind) {
    const el = $("qgDynamicMessage");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind || "";
  }

  function setDynamicShortUrl(url) {
    const el = $("qgDynamicShortUrl");
    if (el) el.value = url || "";
  }

  function getDynamicShortUrl() {
    return getFieldValue("qgDynamicShortUrl", "").trim();
  }

  async function fetchQrProfile(cfg, session) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=plan,builder_plan,is_admin,is_black_diamond`, {
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        Accept: "application/json"
      }
    });
    if (!res.ok) return { plan: "free", is_admin: false, is_black_diamond: false };
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : { plan: "free", is_admin: false, is_black_diamond: false };
  }

  async function fetchActiveQrCount(cfg, session) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/qr_codes?owner_id=eq.${encodeURIComponent(session.user.id)}&status=in.(active,paused,grace)&select=id`, {
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        Prefer: "count=exact"
      }
    });
    if (!res.ok) return 0;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  }

  function updateDynamicQuota(used, limit) {
    const el = $("qgDynamicQuota");
    if (!el) return;
    el.textContent = limit === -1
      ? tq("dynamic.quota_unlimited", "Unlimited dynamic QRs")
      : tq("dynamic.quota", `${used}/${limit} active dynamic QRs`).replace("{used}", used).replace("{limit}", limit);
    el.dataset.state = limit !== -1 && used >= limit ? "full" : "ok";
  }

  async function refreshDynamicPanel() {
    const dynamicForm = $("qgDynamicForm");
    if (!dynamicForm || getMode() !== "dynamic") return;

    const login = $("qgDynamicLogin");
    const fields = $("qgDynamicFields");
    const session = await ensureSession();

    if (!session) {
      if (login) login.hidden = false;
      if (fields) fields.hidden = true;
      updateDynamicQuota(0, PLAN_LIMITS.free);
      return;
    }

    if (login) login.hidden = true;
    if (fields) fields.hidden = false;

    const cfg = await loadConfig();
    const supabaseUrl = String(cfg.supabaseUrl || cfg.supabase_url || "").replace(/\/$/, "");
    const supabaseAnonKey = cfg.supabaseAnonKey || cfg.anonKey || "";
    if (!supabaseUrl || !supabaseAnonKey) return;
    const normalizedCfg = { supabaseUrl, supabaseAnonKey };
    const profile = await fetchQrProfile(normalizedCfg, session);
    const resolvedPlan = bestPlan(profile.plan, profile.builder_plan);
    const limit = profile.is_admin || profile.is_black_diamond ? -1 : (PLAN_LIMITS[resolvedPlan] ?? PLAN_LIMITS.free);
    const used = await fetchActiveQrCount(normalizedCfg, session);
    updateDynamicQuota(used, limit);
  }

  async function createDynamicQrRecord(targetUrl, label) {
    const session = await ensureSession();
    if (!session) {
      dynamicMessage(tq("dynamic.err_login", "Sign in to create editable dynamic QRs."), "warn");
      refreshDynamicPanel();
      return null;
    }

    const cfg = await loadConfig();
    const supabaseUrl = String(cfg.supabaseUrl || cfg.supabase_url || "").replace(/\/$/, "");
    const supabaseAnonKey = cfg.supabaseAnonKey || cfg.anonKey || "";
    if (!supabaseUrl || !supabaseAnonKey) {
      dynamicMessage(tq("dynamic.err_generic", "Could not create the dynamic QR. Try again."), "err");
      return null;
    }

    let lastError = "";
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
      const res = await fetch(`${supabaseUrl}/rest/v1/qr_codes`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          owner_id: session.user.id,
          slug: generateSlug(),
          target_url: targetUrl,
          label: label || null
        })
      });

      if (res.ok) {
        const rows = await res.json();
        return Array.isArray(rows) ? rows[0] : null;
      }

      lastError = await res.text();
      if (lastError.includes("23505") || lastError.includes("qr_codes_slug_key")) continue;
      if (lastError.includes("qr_quota_exceeded")) {
        dynamicMessage(tq("dynamic.err_quota", "You hit your plan limit. Upgrade or pause one QR."), "warn");
        return null;
      }
      break;
    }

    console.error("[qrgen] dynamic QR create failed", lastError);
    dynamicMessage(
      lastError.includes("23505")
        ? tq("dynamic.err_collision", "Rare slug collision. Try again.")
        : tq("dynamic.err_generic", "Could not create the dynamic QR. Try again."),
      "err"
    );
    return null;
  }

  async function createDynamicQr() {
    const targetInput = $("qgDynamicTarget");
    const labelInput = $("qgDynamicLabel");
    const btn = $("qgCreateDynamicBtn");
    const target = normalizeTargetUrl(targetInput?.value || "");
    const label = String(labelInput?.value || "").trim();

    if (targetInput) targetInput.value = target;
    if (!isValidHttpUrl(target)) {
      dynamicMessage(tq("dynamic.err_url", "Enter a valid http or https destination."), "warn");
      targetInput?.focus({ preventScroll: true });
      return;
    }

    const original = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = tq("dynamic.creating", "Creating...");
    }

    try {
      const created = await createDynamicQrRecord(target, label);
      if (!created?.slug) return;
      const shortUrl = `${QR_HOST}/${created.slug}`;
      setDynamicShortUrl(shortUrl);
      dynamicMessage(`${tq("dynamic.created", "Dynamic QR created:")} ${shortUrl}`, "ok");
      if (window.VxLab) {
        VxLab.recordEvent("qr-gen", "dynamic", "Dynamic QR created");
        VxLab.savePreset("qr-gen", {
          mode: "dynamic",
          host: QR_HOST,
          label: label || "none",
        });
      }
      if (labelInput) labelInput.value = "";
      renderPreview();
      refreshDynamicPanel();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = original || tq("dynamic.create_button", "Create managed QR");
      }
    }
  }

  function hasFreshAuth() {
    try {
      const token = getAuthToken();
      const payload = decodeJwtPayload(token);
      if (!payload?.exp) return false;
      return payload.exp * 1000 > Date.now() + 30000;
    } catch (_) {
      return false;
    }
  }

  function getAccountLabel() {
    try {
      const session = JSON.parse(localStorage.getItem("volynx_session") || "{}");
      const meta = session?.user?.user_metadata || {};
      const name = meta.full_name || meta.username || meta.name || "";
      const email = localStorage.getItem("volynx_user_email") || session?.user?.email || "";
      return name || email || "";
    } catch (_) {
      return localStorage.getItem("volynx_user_email") || "";
    }
  }

  function syncAccountBar() {
    const authed = hasFreshAuth();
    const html = document.documentElement;
    const body = document.body;
    html.classList.toggle("vx-authed", authed);
    body?.classList.toggle("vx-authed", authed);

    qa("[data-qg-auth]").forEach((el) => {
      const expected = el.getAttribute("data-qg-auth");
      el.hidden = expected === "in" ? !authed : authed;
    });

    const status = $("qgAccountStatus");
    if (status) {
      const lang = getLang();
      const label = getAccountLabel();
      if (authed) {
        status.textContent = label
          ? (lang === "pt" ? `Conectado como ${label}` : `Signed in as ${label}`)
          : (lang === "pt" ? "Conectado" : "Signed in");
      } else {
        status.textContent = lang === "pt" ? "Sem login ativo" : "Not signed in";
      }
    }

    syncAdminLinks();
  }

  function setRoleLink(role, href, label) {
    qa(`[data-qg-role-link="${role}"]`).forEach((el) => {
      el.setAttribute("href", href);
      if (label) el.textContent = label;
    });
  }

  function syncAdminLinks() {
    const admin = isAdminBypass || detectAdminHint();
    if (admin) {
      setRoleLink("profile", ADMIN_HOME_PATH, tq("account.admin", "Admin"));
      setRoleLink("codes", ADMIN_QR_MANAGER_PATH, tq("account.admin_codes", "QR Admin"));
      setRoleLink("dynamic-manager", ADMIN_QR_MANAGER_PATH, tq("dynamic.admin_manage", "Open QR admin"));
      return;
    }

    setRoleLink("profile", USER_PROFILE_PATH, tq("account.profile", "Profile"));
    setRoleLink("codes", USER_QR_MANAGER_PATH, tq("account.codes", "My QRs"));
    setRoleLink("dynamic-manager", USER_QR_MANAGER_PATH, tq("dynamic.manage", "Open dynamic QR manager"));
  }

  function signOutQrGen() {
    try { window.VxAuthBridge?.clear?.(); } catch (_) {}
    try { window.VxPlan?.clearCache?.(); } catch (_) {}
    try {
      [
        "volynx_access_token",
        "volynx_refresh_token",
        "volynx_session",
        "volynx_user_email",
        "volynx_plan_cache"
      ].forEach((key) => localStorage.removeItem(key));
    } catch (_) {}

    document.documentElement.classList.remove("vx-authed");
    document.body?.classList.remove("vx-authed");
    remotePlan = "";
    remoteAdminBypass = false;
    isAdminBypass = false;
    currentPlan = "free";
    refreshPlan();
    renderPlans();
    syncAccountBar();
    refreshDynamicPanel();
    setMessage(getLang() === "pt" ? "Sessão encerrada." : "Signed out.", "ok");
  }

  function canAccess(requiredPlan) {
    if (isAdminBypass || detectAdminHint()) return true;
    return PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan || "free"];
  }

  function getLang() {
    try {
      const lang = localStorage.getItem("volynx_lang") || document.documentElement.lang || "en";
      return String(lang).toLowerCase().startsWith("pt") ? "pt" : "en";
    } catch (_) {
      return "en";
    }
  }

  function applyLocalI18n() {
    const lang = getLang();
    const dict = I18N[lang] || {};
    qa("[data-qg-i18n]").forEach((el) => {
      const key = el.getAttribute("data-qg-i18n");
      if (!el.dataset.qgDefaultText) el.dataset.qgDefaultText = el.textContent;
      const fallback = lang === "en" ? el.dataset.qgDefaultText : "";
      el.textContent = dict[key] || fallback || el.textContent;
    });
  }

  function tq(key, fallback) {
    const dict = I18N[getLang()] || {};
    return dict[key] || fallback;
  }

  function getFieldValue(id, fallback) {
    const el = $(id);
    return el ? el.value : fallback;
  }

  function getMode() {
    return q('input[name="qrMode"]:checked')?.value || "static";
  }

  function getState() {
    return {
      projectName: getFieldValue("qgProjectName", "Campaign QR").trim() || "Campaign QR",
      mode: getMode(),
      content: getFieldValue("qgContent", "").trim(),
      dynamicTarget: getFieldValue("qgDynamicTarget", "").trim(),
      dynamicLabel: getFieldValue("qgDynamicLabel", "").trim(),
      dynamicShortUrl: getDynamicShortUrl(),
      dotsType: getFieldValue("qgDotsType", "rounded"),
      cornerStyle: getFieldValue("qgCornerStyle", "extra-rounded"),
      colorMode: getFieldValue("qgColorMode", "solid"),
      dotColor: getFieldValue("qgDotColor", "#111827"),
      dotColor2: getFieldValue("qgDotColor2", "#20e3b2"),
      metallicPreset: getFieldValue("qgMetallicPreset", "chrome"),
      bgColor: getFieldValue("qgBgColor", "#ffffff"),
      previewSize: numberValue("qgPreviewSize", 320),
      exportSize: numberValue("qgExportSize", 1024),
      margin: numberValue("qgMargin", 12),
      logoSize: numberValue("qgLogoSize", 0.22),
      logoMargin: numberValue("qgLogoMargin", 10),
      errorCorrection: getFieldValue("qgErrorCorrection", "H"),
      exportFormat: getFieldValue("qgExportFormat", "png"),
      transparent: $("qgTransparent")?.checked || false,
      logoDataUrl
    };
  }

  function numberValue(id, fallback) {
    const n = Number(getFieldValue(id, fallback));
    return Number.isFinite(n) ? n : fallback;
  }

  function getQrData(state, mode) {
    if (state.mode === "dynamic") return state.dynamicShortUrl || `${QR_HOST}/preview`;
    return state.content || DEFAULT_DATA;
  }

  function makeGradient(c1, c2) {
    return {
      type: "linear",
      rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 }
      ]
    };
  }

  function makeMetallicGradient(preset) {
    const palettes = {
      chrome: ["#f8fafc", "#94a3b8", "#ffffff", "#475569", "#dbeafe"],
      gold: ["#fff7cc", "#f5c451", "#fff2a8", "#a16207", "#fde68a"],
      rose: ["#ffe4e6", "#fb7185", "#fff1f2", "#9f1239", "#fecdd3"],
      volynx: ["#eaffff", "#7df9ff", "#20e3b2", "#148ea9", "#f8fafc"]
    };
    const colors = palettes[preset] || palettes.chrome;
    return {
      type: "linear",
      rotation: Math.PI / 4,
      colorStops: colors.map((color, index) => ({
        offset: index / (colors.length - 1),
        color
      }))
    };
  }

  function colorOptionsForState(state) {
    if (state.colorMode === "solid") {
      return { color: state.dotColor };
    }
    if (state.colorMode === "metallic") {
      return { gradient: makeMetallicGradient(state.metallicPreset) };
    }
    return { gradient: makeGradient(state.dotColor, state.dotColor2) };
  }

  function buildQrOptions(state, context) {
    const mode = context?.mode || "preview";
    const size = context?.size || (mode === "preview" ? state.previewSize : state.exportSize);
    const bg = state.transparent && mode === "export" ? "rgba(255,255,255,0)" : state.bgColor;
    const data = getQrData(state, mode);
    const colorOptions = colorOptionsForState(state);

    return {
      width: size,
      height: size,
      type: context?.type || "canvas",
      data,
      margin: state.margin,
      image: state.logoDataUrl || undefined,
      qrOptions: {
        errorCorrectionLevel: state.errorCorrection || "H"
      },
      dotsOptions: {
        type: state.dotsType,
        ...colorOptions
      },
      cornersSquareOptions: {
        type: state.cornerStyle || "extra-rounded",
        ...colorOptions
      },
      cornersDotOptions: {
        type: state.cornerStyle === "dot" ? "dot" : "square",
        ...colorOptions
      },
      backgroundOptions: {
        color: bg
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: state.logoMargin,
        imageSize: state.logoSize
      }
    };
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    const box = $("qgPreview");
    box?.classList.add("is-updating");
    previewTimer = setTimeout(renderPreview, DEBOUNCE_MS);
  }

  function renderPreview() {
    const box = $("qgPreview");
    if (!box || typeof QRCodeStyling === "undefined") return;
    const state = getState();
    const options = buildQrOptions(state, { mode: "preview", size: state.previewSize });

    try {
      if (!previewQr) {
        previewQr = new QRCodeStyling(options);
        box.innerHTML = "";
        previewQr.append(box);
      } else if (previewQr.update) {
        previewQr.update(options);
      } else {
        previewQr = new QRCodeStyling(options);
        box.innerHTML = "";
        previewQr.append(box);
      }
    } catch (err) {
      console.error("[qrgen] preview render failed", err);
      box.innerHTML = "";
      previewQr = new QRCodeStyling(options);
      previewQr.append(box);
    }

    box.classList.remove("is-updating");
    updateNotices(state);
    updateLocks();
  }

  function updateNotices(state) {
    const example = !state.content && state.mode !== "dynamic";
    const dynamic = state.mode === "dynamic";
    const notice = $("qgPreviewNote");
    const inline = $("qgExampleNotice");
    const text = dynamic
      ? state.dynamicShortUrl
        ? "Managed dynamic QR ready. Export now uses the editable VOLYNX short link."
        : "Create the managed QR before printing so future destination edits stay possible."
      : example
        ? "Preview de exemplo - digite seu conteúdo para personalizar."
        : "Live preview. Export generates the final file at the selected quality.";

    if (notice) notice.textContent = text;
    if (inline) inline.textContent = text;

    const warnings = buildWarnings(state);
    renderWarnings(warnings);

    const health = $("qgHealthBadge");
    if (health) {
      health.textContent = warnings.length ? "Check scan safety" : "Scan-ready";
      health.dataset.state = warnings.length ? "warn" : "ok";
    }
  }

  function buildWarnings(state) {
    const warnings = [];
    if (state.mode === "dynamic" && !state.dynamicShortUrl) {
      warnings.push("Create the managed QR before exporting so the printed code uses the editable short link.");
    }
    if (state.colorMode === "solid" && !state.transparent) {
      const ratio = contrastRatio(state.dotColor, state.bgColor);
      if (ratio < 3.2) warnings.push("Low contrast may make this QR Code harder to scan.");
    }
    if (state.margin < 8) warnings.push("Small margins can hurt scans on print. Keep a quiet zone around the QR.");
    if (state.logoDataUrl && state.logoSize > 0.30 && state.errorCorrection !== "H") {
      warnings.push("Large center logos scan better with brand-safe error correction.");
    }
    if (state.colorMode === "gradient") warnings.push("Gradient QRs should be tested on the final printed size.");
    if (state.colorMode === "metallic") warnings.push("Metallic QRs look premium, but test the final file on the real print material before production.");
    return warnings;
  }

  function renderWarnings(warnings) {
    const wrap = $("qgWarnings");
    if (!wrap) return;
    wrap.innerHTML = warnings.map((w) => `<div class="qrgen-warning">${escapeHtml(w)}</div>`).join("");
  }

  function hexToRgb(hex) {
    const clean = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function luminance(rgb) {
    if (!rgb) return 0;
    const values = [rgb.r, rgb.g, rgb.b].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }

  function contrastRatio(a, b) {
    const l1 = luminance(hexToRgb(a));
    const l2 = luminance(hexToRgb(b));
    const light = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
  }

  function updateLocks() {
    const state = getState();
    const selectedLocks = getSelectedLockedFeatures(state);
    const message = $("qgMessage");
    if (!message || document.activeElement === message) return;
    if (message.textContent.trim()) return;
    if (selectedLocks.length) {
      setMessage(`${selectedLocks[0].label} is available on QRGen ${PLAN_LABELS[selectedLocks[0].plan]}. You can preview it here.`, "warn", false);
    }
  }

  function getSelectedLockedFeatures(state) {
    const locks = [];
    if (state.colorMode === "gradient" && !canAccess("launch")) locks.push({ plan: "launch", label: "Gradient styles" });
    if (state.exportFormat === "png-hd" && !canAccess("launch")) locks.push({ plan: "launch", label: "HD PNG export" });
    if (state.exportFormat === "svg" && !canAccess("pro")) locks.push({ plan: "pro", label: "SVG export" });
    if (state.exportSize >= 2048 && !canAccess("launch")) locks.push({ plan: "launch", label: "2048px export" });
    if (state.exportSize >= 4096 && !canAccess("pro")) locks.push({ plan: "pro", label: "4096px export" });
    if (state.transparent && !canAccess("pro")) locks.push({ plan: "pro", label: "Transparent background" });
    if (state.logoDataUrl && !canAccess("pro")) locks.push({ plan: "pro", label: "Logo export" });
    return locks;
  }

  function validateExport(state) {
    if (state.mode === "dynamic" && !state.dynamicShortUrl) {
      return {
        ok: false,
        kind: "warn",
        message: "Create the managed dynamic QR first. Export must use the editable VOLYNX short link, not a preview."
      };
    }
    const locked = getSelectedLockedFeatures(state);
    if (locked.length) {
      const item = locked[0];
      if (canUseVxForLockedExport(state, locked)) {
        return {
          ok: false,
          kind: "warn",
          action: "vx_svg_export",
          cost: VX_SVG_EXPORT_COST,
          message: `SVG vector export is included in QRGen Pro, or you can use ${VX_SVG_EXPORT_COST} VX for this export only.`
        };
      }
      return {
        ok: false,
        kind: "warn",
        action: "upgrade",
        message: `${item.label} is available on QRGen ${PLAN_LABELS[item.plan]}. Use the available free export or upgrade to unlock it.`
      };
    }
    if (currentPlan === "free" && getUsage().used >= FREE_EXPORT_LIMIT) {
      return {
        ok: false,
        kind: "warn",
        action: window.VxLab?.hasAccessToken() ? "upgrade" : "login",
        message: `Free export limit reached for today (${FREE_EXPORT_LIMIT}). QRGen Launch unlocks a production workflow.`
      };
    }
    return { ok: true };
  }

  function canUseVxForLockedExport(state, locked) {
    return state.exportFormat === "svg"
      && Array.isArray(locked)
      && locked.length === 1
      && locked[0].label === "SVG export";
  }

  async function spendVxForSvgExport(state) {
    if (!window.VxLab || typeof window.VxLab.spendVxAction !== "function") {
      setMessage("VX checkout is not ready yet. Try again in a moment or use QRGen Pro.", "err");
      return false;
    }
    const result = await window.VxLab.spendVxAction({
      tool: "qr-gen",
      action: "svg_export",
      actionClass: "pro",
      tokens: VX_SVG_EXPORT_COST,
      title: "Use VX for SVG export?",
      message: `SVG is included in QRGen Pro. You can also spend ${VX_SVG_EXPORT_COST} VX now to export this one SVG without changing your plan.`,
      loginMessage: `Sign in to use ${VX_SVG_EXPORT_COST} VX for SVG export. You will return to QRGen after login.`,
      description: `QRGen SVG export: ${state.projectName || "QR project"}`
    });
    if (!result.ok) {
      if (result.error === "cancelled") {
        setMessage("SVG export cancelled. You can use PNG standard for free or upgrade to QRGen Pro.", "warn");
      } else if (result.error === "not_authenticated") {
        setMessage(`Sign in to use ${VX_SVG_EXPORT_COST} VX for SVG export.`, "warn", false);
      } else {
        setMessage(result.error === "insufficient_balance"
          ? `Not enough VX for SVG export. This action needs ${VX_SVG_EXPORT_COST} VX.`
          : "Could not spend VX for SVG export. Try again.",
          "err",
          false
        );
      }
      return false;
    }
    setMessage(`VX confirmed. ${result.spent || VX_SVG_EXPORT_COST} VX used for this SVG export.`, "ok", false);
    return true;
  }

  function getUsage() {
    try {
      const raw = localStorage.getItem(USAGE_STORAGE_KEY);
      const today = todayKey();
      if (!raw) return { date: today, used: 0 };
      const parsed = JSON.parse(raw);
      return parsed.date === today ? parsed : { date: today, used: 0 };
    } catch (_) {
      return { date: todayKey(), used: 0 };
    }
  }

  function incrementUsage() {
    const usage = getUsage();
    usage.used += 1;
    try { localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage)); } catch (_) {}
  }

  function fileNameForState(state) {
    return `volynx-qrgen-${state.projectName || "qr"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "volynx-qrgen";
  }

  function saveBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function exportFinal() {
    await refreshRemoteEntitlement();
    const state = getState();
    const validation = validateExport(state);
    if (!validation.ok) {
      if (validation.action === "vx_svg_export") {
        setMessage(validation.message, validation.kind || "warn", false);
        const paidWithVx = await spendVxForSvgExport(state);
        if (!paidWithVx) return;
        await exportQrFile(state, { vxCost: VX_SVG_EXPORT_COST });
        return;
      }
      if (validation.action === "login" && window.VxLab) {
        VxLab.confirmLogin(
          VxLab.currentReturnPath(),
          "Sign in to continue exporting in QRGen. You will return to this editor after login."
        );
        return;
      }
      if (validation.action === "upgrade" && window.VxLab) {
        setMessage(validation.message, validation.kind || "warn", false);
        VxLab.confirmUpgrade(`${validation.message}\n\nClick OK to see upgrade options.`);
        return;
      }
      setMessage(validation.message, validation.kind || "warn");
      return;
    }

    await exportQrFile(state);
  }

  async function exportQrFile(state, options) {
    const exportOptions = options || {};
    const btn = $("qgExportBtn");
    const original = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Exporting...";
    }

    try {
      const size = state.exportFormat === "png" ? 1024 : state.exportSize;
      const extension = state.exportFormat === "svg" ? "svg" : "png";
      const exportQr = new QRCodeStyling(buildQrOptions(state, { mode: "export", size, type: extension === "svg" ? "svg" : "canvas" }));

      if (exportQr.getRawData) {
        const blob = await exportQr.getRawData(extension);
        if (blob) {
          saveBlob(blob, `${fileNameForState(state)}.${extension}`);
          incrementUsage();
          if (window.VxLab) {
            VxLab.recordEvent("qr-gen", "export", exportOptions.vxCost ? `${extension.toUpperCase()} exported via VX` : `${extension.toUpperCase()} exported`);
            VxLab.savePreset("qr-gen", {
              mode: state.mode,
              format: extension,
              color: state.colorMode,
              size: String(size),
              payment: exportOptions.vxCost ? `${exportOptions.vxCost} VX` : "plan/free",
            });
          }
          setMessage(exportOptions.vxCost
            ? `Export complete. ${exportOptions.vxCost} VX used for this SVG export. Test the QR before sending to print.`
            : "Export complete. Test the QR before sending to print.",
            "ok"
          );
          return;
        }
      }

      await exportQr.download({ name: fileNameForState(state), extension });
      incrementUsage();
      if (window.VxLab) {
        VxLab.recordEvent("qr-gen", "export", exportOptions.vxCost ? `${extension.toUpperCase()} exported via VX` : `${extension.toUpperCase()} exported`);
        VxLab.savePreset("qr-gen", {
          mode: state.mode,
          format: extension,
          color: state.colorMode,
          size: String(size),
          payment: exportOptions.vxCost ? `${exportOptions.vxCost} VX` : "plan/free",
        });
      }
      setMessage(exportOptions.vxCost
        ? `Export complete. ${exportOptions.vxCost} VX used for this SVG export. Test the QR before sending to print.`
        : "Export complete. Test the QR before sending to print.",
        "ok"
      );
    } catch (err) {
      console.error("[qrgen] export failed", err);
      setMessage("Could not export this QR. Try PNG standard or simplify the design.", "err");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = original || "Export final QR";
      }
    }
  }

  function setMessage(text, kind, clearLater = true) {
    const el = $("qgMessage");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind || "";
    if (clearLater && text) {
      clearTimeout(setMessage.timer);
      setMessage.timer = setTimeout(() => {
        if (el.textContent === text) {
          el.textContent = "";
          el.dataset.kind = "";
        }
      }, 6000);
    }
  }

  function getProjects() {
    try {
      const raw = localStorage.getItem(QRGEN_STORAGE_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function saveProjects(rows) {
    try { localStorage.setItem(QRGEN_STORAGE_KEY, JSON.stringify(rows)); } catch (_) {}
  }

  function clearRestoreParam(name) {
    if (!window.history?.replaceState) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(name);
      history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (_) {}
  }

  function restoreProjectFromUrl() {
    let projectId = "";
    try {
      projectId = new URLSearchParams(window.location.search).get("project") || "";
    } catch (_) {}
    if (!projectId) return false;

    const row = getProjects().find((item) => item?.id === projectId);
    clearRestoreParam("project");
    if (!row) {
      setMessage(tq("projects.not_found", "Saved project was not found in this browser."), "warn");
      return false;
    }

    activeProjectId = row.id;
    applyState(row.state);
    setMessage(tq("projects.loaded", "Project loaded."), "ok");
    return true;
  }

  function saveProject() {
    const state = getState();
    const rows = getProjects();
    if (currentPlan === "free" && !activeProjectId && rows.length >= SAVE_LIMIT_FREE) {
      setMessage(`Free project limit reached (${SAVE_LIMIT_FREE}). QRGen Launch unlocks more saved drafts.`, "warn");
      return;
    }

    const now = new Date().toISOString();
    const storedState = {
      ...state,
      logoDataUrl: state.logoDataUrl && state.logoDataUrl.length < 700000 ? state.logoDataUrl : ""
    };

    if (activeProjectId) {
      const idx = rows.findIndex((row) => row.id === activeProjectId);
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], name: state.projectName, state: storedState, updated_at: now };
      }
    } else {
      activeProjectId = crypto.randomUUID ? crypto.randomUUID() : `qg_${Date.now()}`;
      rows.unshift({
        id: activeProjectId,
        name: state.projectName,
        state: storedState,
        created_at: now,
        updated_at: now
      });
    }

    saveProjects(rows);
    const savedProject = rows.find((item) => item.id === activeProjectId);
    if (savedProject && window.VxLab?.syncArtifact) VxLab.syncArtifact("qr-project", savedProject);
    renderProjects();
    if (window.VxLab) {
      VxLab.recordEvent("qr-gen", "save", "QR draft saved");
      VxLab.savePreset("qr-gen", {
        mode: state.mode,
        format: state.exportFormat,
        color: state.colorMode,
        dots: state.dotsType,
      });
    }
    setMessage("Draft saved in this browser. Managed dynamic QRs stay in your QR manager.", "ok");
  }

  function applyState(state) {
    if (!state) return;
    setValue("qgProjectName", state.projectName || "Campaign QR");
    setValue("qgContent", state.content || "");
    setValue("qgDynamicTarget", state.dynamicTarget || "");
    setValue("qgDynamicLabel", state.dynamicLabel || "");
    setDynamicShortUrl(state.dynamicShortUrl || "");
    setRadio("qrMode", state.mode || "static");
    setValue("qgDotsType", state.dotsType || "rounded");
    setValue("qgCornerStyle", state.cornerStyle || "extra-rounded");
    setValue("qgColorMode", state.colorMode || "solid");
    setValue("qgDotColor", state.dotColor || "#111827");
    setValue("qgDotColor2", state.dotColor2 || "#20e3b2");
    setValue("qgMetallicPreset", state.metallicPreset || "chrome");
    setValue("qgBgColor", state.bgColor || "#ffffff");
    setValue("qgPreviewSize", state.previewSize || 320);
    setValue("qgExportSize", state.exportSize || 1024);
    setValue("qgMargin", state.margin || 12);
    setValue("qgLogoSize", state.logoSize || 0.22);
    setValue("qgLogoMargin", state.logoMargin || 10);
    setValue("qgErrorCorrection", state.errorCorrection || "H");
    setValue("qgExportFormat", state.exportFormat || "png");
    const transparent = $("qgTransparent");
    if (transparent) transparent.checked = !!state.transparent;
    logoDataUrl = state.logoDataUrl || "";
    updateConditionalControls();
    updateModeUi();
    schedulePreview();
  }

  function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value;
  }

  function setRadio(name, value) {
    const el = q(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  }

  function renderProjects() {
    const wrap = $("qgProjects");
    if (!wrap) return;
    const rows = getProjects();
    if (!rows.length) {
      wrap.innerHTML = `<div class="qrgen-empty">${escapeHtml(tq("projects.empty", "No saved QR projects yet. Save this design to create your first local draft."))}</div>`;
      return;
    }
    wrap.innerHTML = rows.map((row) => {
      const summary = row.state?.mode === "dynamic"
        ? tq("projects.dynamic_preview", "Dynamic preview")
        : (row.state?.content || DEFAULT_DATA);
      const date = row.updated_at ? new Date(row.updated_at).toLocaleDateString(getLang() === "pt" ? "pt-BR" : "en-GB") : "";
      const openLabel = tq("projects.open", "Open");
      const cloneLabel = tq("projects.clone", "Clone");
      const deleteLabel = tq("projects.delete", "Delete");
      return `
        <article class="qrgen-project" data-id="${escapeHtml(row.id)}">
          <div>
            <strong>${escapeHtml(row.name || "QR project")}</strong>
            <span>${escapeHtml(summary).slice(0, 96)} - ${escapeHtml(date)}</span>
          </div>
          <div class="qrgen-project__actions">
            <button type="button" class="qrgen-project-action" data-action="load" aria-label="${escapeHtml(openLabel)}">
              <span>${escapeHtml(openLabel)}</span>
            </button>
            <button type="button" class="qrgen-project-action" data-action="duplicate" aria-label="${escapeHtml(cloneLabel)}">
              <span>${escapeHtml(cloneLabel)}</span>
            </button>
            <button type="button" class="qrgen-project-action is-danger" data-action="delete" aria-label="${escapeHtml(deleteLabel)}">
              <span>${escapeHtml(deleteLabel)}</span>
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  function handleProjectAction(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const card = event.target.closest("[data-id]");
    const id = card?.dataset.id;
    if (!id) return;
    const rows = getProjects();
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const action = btn.dataset.action;

    if (action === "load") {
      activeProjectId = id;
      applyState(row.state);
      setMessage(tq("projects.loaded", "Project loaded."), "ok");
    }

    if (action === "duplicate") {
      activeProjectId = null;
      applyState({ ...row.state, projectName: `${row.name || "QR project"} copy` });
      setMessage(tq("projects.duplicated", "Project duplicated into the editor. Save it as a new draft."), "ok");
    }

    if (action === "delete") {
      saveProjects(rows.filter((item) => item.id !== id));
      if (window.VxLab?.deleteArtifact) VxLab.deleteArtifact("qr-project", id);
      if (activeProjectId === id) activeProjectId = null;
      renderProjects();
      setMessage(tq("projects.deleted", "Project deleted."), "ok");
    }
  }

  function renderPlans() {
    const wrap = $("qgPlanGrid");
    if (!wrap) return;
    wrap.innerHTML = PLANS.map((plan) => `
      <article class="qrgen-plan-card ${plan.id === currentPlan ? "is-current" : ""}">
        <h3>${escapeHtml(plan.name)}</h3>
        <strong>${escapeHtml(plan.price?.[currentCurrency] || plan.price?.GBP || "")}</strong>
        <p>${escapeHtml(tq(`plans.${plan.id}.copy`, plan.copy))}</p>
        <ul>${plan.features.map((feature, index) => `<li>${escapeHtml(tq(`plans.${plan.id}.f${index + 1}`, feature))}</li>`).join("")}</ul>
        <a class="qrgen-link-button qrgen-plan-card__cta ${plan.lookupKey ? "vx-checkout-btn" : ""}" href="${escapeHtml(planHref(plan))}" ${plan.lookupKey ? `data-lookup="${escapeHtml(plan.lookupKey)}" data-label="${escapeHtml(planCta(plan))}"` : ""}>${escapeHtml(planCta(plan))}</a>
      </article>
    `).join("");
  }

  function planCta(plan) {
    if (plan.id === currentPlan) {
      return getLang() === "pt" ? "Plano atual" : "Current plan";
    }
    return plan.cta || (plan.id === "free" ? "Open QRGen" : "Upgrade");
  }

  function planHref(plan) {
    if (plan.id === "free") return "/qrgen/";
    if (!plan.lookupKey) return plan.href || "/pricing/#qrgen-plans";
    const params = new URLSearchParams({
      lookup_key: plan.lookupKey,
      currency: currentCurrency.toLowerCase(),
      next: "/qrgen/",
    });
    return `/checkout/?${params.toString()}`;
  }

  function syncCurrencyButtons() {
    qa("[data-qg-currency]").forEach((btn) => {
      const active = normalizeCurrency(btn.getAttribute("data-qg-currency")) === currentCurrency;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setQrGenCurrency(value) {
    currentCurrency = normalizeCurrency(value);
    try { localStorage.setItem("volynx_currency", currentCurrency); } catch (_) {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("currency", currentCurrency);
      history.replaceState(null, "", url.toString());
    } catch (_) {}
    syncCurrencyButtons();
    renderPlans();
  }

  function updateConditionalControls() {
    const mode = getFieldValue("qgColorMode", "solid");
    qa(".qg-solid-only").forEach((el) => {
      el.style.display = mode === "solid" || mode === "gradient" ? "grid" : "none";
    });
    qa(".qg-gradient-only").forEach((el) => {
      el.style.display = mode === "gradient" ? "grid" : "none";
    });
    qa(".qg-metallic-only").forEach((el) => {
      el.style.display = mode === "metallic" ? "grid" : "none";
    });
  }

  function updateModeUi() {
    const dynamic = getMode() === "dynamic";
    document.body?.classList.toggle("is-qrgen-dynamic", dynamic);
    document.body?.classList.toggle("is-qrgen-static", !dynamic);
    const dynamicForm = $("qgDynamicForm");
    if (dynamicForm) dynamicForm.hidden = !dynamic;
    qa(".qg-static-field").forEach((el) => {
      el.hidden = dynamic;
    });
    if (dynamic) {
      refreshDynamicPanel();
    } else {
      dynamicMessage("", "");
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bind() {
    const editor = $("qgEditor");
    if (editor) {
      editor.addEventListener("input", (event) => {
        if (["qgContent", "qgDynamicTarget", "qgDynamicLabel"].includes(event.target?.id)) activeProjectId = null;
        if (event.target?.id === "qgDynamicTarget") setDynamicShortUrl("");
        updateConditionalControls();
        schedulePreview();
      });
      editor.addEventListener("change", (event) => {
        updateConditionalControls();
        if (event.target?.name === "qrMode") updateModeUi();
        schedulePreview();
      });
    }

    $("qgLogo")?.addEventListener("change", (event) => {
      const file = event.target?.files?.[0];
      if (!file) {
        logoDataUrl = "";
        schedulePreview();
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        logoDataUrl = String(ev.target?.result || "");
        schedulePreview();
      };
      reader.readAsDataURL(file);
    });

    $("qgExportBtn")?.addEventListener("click", exportFinal);
    $("qgSaveBtn")?.addEventListener("click", saveProject);
    $("qgLogoutBtn")?.addEventListener("click", signOutQrGen);
    $("qgCreateDynamicBtn")?.addEventListener("click", createDynamicQr);
    $("qgProjects")?.addEventListener("click", handleProjectAction);
    qa("[data-qg-currency]").forEach((btn) => {
      btn.addEventListener("click", () => setQrGenCurrency(btn.getAttribute("data-qg-currency")));
    });

    window.addEventListener("storage", (event) => {
      if (["volynx_plan_cache", "volynx_access_token", "volynx_session", "volynx_user_email"].includes(event.key)) {
        refreshPlan();
        renderPlans();
        syncAccountBar();
        schedulePreview();
      }
      if (event.key === "volynx_currency") {
        currentCurrency = normalizeCurrency(event.newValue || "GBP");
        syncCurrencyButtons();
        renderPlans();
      }
    });

    window.addEventListener("vx:plan-ready", () => {
      refreshPlan();
      renderPlans();
      syncAccountBar();
      schedulePreview();
    });

    window.addEventListener("vx:admin-detected", () => {
      remoteAdminBypass = true;
      isAdminBypass = true;
      refreshPlan();
      renderPlans();
      syncAccountBar();
      schedulePreview();
    });

    window.addEventListener("vx:lang-changed", () => {
      applyLocalI18n();
      refreshPlan();
      renderPlans();
      renderProjects();
      syncAccountBar();
      updateNotices(getState());
    });

    window.addEventListener("vx:currency-changed", (event) => {
      currentCurrency = normalizeCurrency(event.detail?.code || event.detail?.currency || currentCurrency);
      syncCurrencyButtons();
      renderPlans();
    });
  }

  function init() {
    applyLocalI18n();
    refreshPlan();
    syncAccountBar();
    syncCurrencyButtons();
    renderPlans();
    renderProjects();
    updateConditionalControls();
    updateModeUi();
    bind();
    restoreProjectFromUrl();
    renderPreview();
    refreshRemoteEntitlement();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.VxQRGenProduct = {
    buildQrOptions,
    getState,
    renderPreview,
    getProjects,
    currentPlan: () => currentPlan
  };
})();
