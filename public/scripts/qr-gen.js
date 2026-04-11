/* QRCodeStyling loaded via <script> tag in the page (UMD global) */

let qrCode = null;

const FREE_LIMIT = 2;
const STORAGE_KEY = "volynx_qrgen_usage";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getLocalUsage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const today = todayKey();
  if (!raw) { const data = { date: today, used: 0 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data; }
  try {
    const data = JSON.parse(raw);
    if (data.date !== today) { const reset = { date: today, used: 0 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); return reset; }
    return data;
  } catch { const reset = { date: today, used: 0 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); return reset; }
}

function incrementLocalUsage(n = 1) {
  const data = getLocalUsage();
  data.used += n;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function getConfig() {
  try { return await fetch('/config.json', { cache: 'no-store' }).then(r => r.json()); }
  catch { return {}; }
}

async function checkToolPermission(toolName, count) {
  const cfg = await getConfig();
  const apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');
  const token = localStorage.getItem('volynx_access_token') || '';
  if (apiBase) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(`${apiBase}/check-permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tool: toolName }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const perm = await res.json();
        if (!perm.useLocalStorage) return { allowed: perm.remaining === -1 || perm.remaining >= count, plan: perm.plan, remaining: perm.remaining, limit: perm.limit, source: 'server' };
      }
    } catch (_) {}
  }
  const usage = getLocalUsage();
  const remaining = Math.max(0, FREE_LIMIT - usage.used);
  return { allowed: remaining >= count, plan: 'free', remaining, limit: FREE_LIMIT, source: 'local' };
}

async function logToolUsage(toolName, amount) {
  const cfg = await getConfig();
  const apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');
  const token = localStorage.getItem('volynx_access_token') || '';
  if (apiBase && token) {
    fetch(`${apiBase}/log-usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: toolName, amount }),
    }).catch(() => {});
  }
  incrementLocalUsage(amount);
}

function $(id){ return document.getElementById(id); }

function getVal(id){ const el=$(id); return el ? el.value : ""; }

function safeNumber(v, fallback){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getLogoDataUrl() {
  const img = $("logoImg");
  const src = img?.getAttribute("src") || "";
  return src && src.startsWith("data:") ? src : undefined;
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

function buildConfig() {
  const data = getVal("text") || "https://volynx.world";
  const size = safeNumber(getVal("size"), 320);

  const dotsType = getVal("dotsType") || "rounded";
  const dotsColorType = getVal("dotsColorType") || "solid";
  const dotsColor = getVal("dotsColor") || "#ffffff";
  const dotsColor1 = getVal("dotsColor1") || "#59C6E8";
  const dotsColor2 = getVal("dotsColor2") || "#6C0AE4";

  const br = safeNumber(getVal("borderRadius"), 0);

  const logo = getLogoDataUrl();
  const logoSize = safeNumber(getVal("logoSize"), 0.4);
  const logoMargin = safeNumber(getVal("logoMargin"), 10);

  return {
    width: size,
    height: size,
    data,
    margin: 0,
    image: logo,
    dotsOptions: {
      type: dotsType,
      color: dotsColorType === "solid" ? dotsColor : undefined,
      gradient: dotsColorType === "gradient" ? makeGradient(dotsColor1, dotsColor2) : undefined
    },
    cornersSquareOptions: { type: "extra-rounded" },
    cornersDotOptions: { type: "dot" },
    backgroundOptions: { color: "transparent" },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: logoMargin,
      imageSize: logoSize
    }
  };
}

function generateQR() {
  const container = $("qr-container");
  if (!container) return;

  container.innerHTML = "";

  const config = buildConfig();

  qrCode = new QRCodeStyling(config);
  qrCode.append(container);

  const downloadBtn = $("downloadBtn");
  if (downloadBtn) downloadBtn.style.display = "inline-flex";
}

function bind() {
  const genBtn = $("generateBtn");
  const downloadBtn = $("downloadBtn");

  genBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (genBtn.disabled) return;
    const originalText = genBtn.textContent;
    genBtn.disabled = true;
    genBtn.textContent = "Gerando…";
    try {
      // Check permission before generating
      const perm = await checkToolPermission("qr-gen", 1);
      if (!perm.allowed) {
        if (window.VxTokens) {
          const tokenResult = await VxTokens.spend('qr-gen', 'light', {
            description: 'Generate QR code (limit exceeded)'
          });
          if (!tokenResult.ok) return;
        } else {
          const isFreeUser = window.VxPlan ? !window.VxPlan.isPaid(perm.plan) : (perm.plan === 'free');
          alert(`Daily limit reached (${perm.limit}). ${isFreeUser ? 'Upgrade to Pro for more.' : 'Try again tomorrow.'}`);
          return;
        }
      }

      generateQR();

      // Log usage after successful generation
      await logToolUsage("qr-gen", 1);

      // Show save hint based on plan
      const loginHint = document.querySelector(".login-hint");
      if (loginHint && perm.plan !== "free") {
        loginHint.style.display = "none";
      }
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = originalText;
    }
  });

  downloadBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!qrCode) return;
    await qrCode.download({ name: "volynx-qr", extension: "png" });
  });

  const dotsColorType = $("dotsColorType");
  dotsColorType?.addEventListener("change", () => {
    const type = dotsColorType.value;
    const g1 = $("dotsColorGroup");
    const g2 = $("dotsGradientGroup");
    const g3 = $("dotsGradientGroup2");
    if (g1) g1.style.display = type === "solid" ? "flex" : "none";
    if (g2) g2.style.display = type === "gradient" ? "flex" : "none";
    if (g3) g3.style.display = type === "gradient" ? "flex" : "none";
    if (qrCode) generateQR();
  });

  const logoInput = $("logo");
  logoInput?.addEventListener("change", (e) => {
    const file = e.target?.files?.[0];
    const preview = $("logoPreview");
    const img = $("logoImg");

    if (!file || !img) {
      if (preview) preview.style.display = "none";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target?.result;
      if (preview) preview.style.display = "block";
      if (qrCode) generateQR();
    };
    reader.readAsDataURL(file);
  });

  ["logoSize","logoMargin","dotsColor","dotsColor1","dotsColor2","borderRadius","size","text","dotsType"].forEach((id) => {
    const el = $(id);
    el?.addEventListener("input", () => { if (qrCode) generateQR(); });
    el?.addEventListener("change", () => { if (qrCode) generateQR(); });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bind();
});
