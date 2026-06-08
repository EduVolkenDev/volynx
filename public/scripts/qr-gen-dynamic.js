/**
 * VOLYNX QR Generator — Dynamic mode
 * Companion script to qr-gen.js. Adds toggle (Static | Dynamic) and dynamic QR creation flow.
 *
 * Dynamic flow:
 *   1. User picks Dynamic mode → check auth
 *   2. Logged in → fetch quota (count of active|paused|grace QRs + plan limit), show form
 *   3. User enters destination URL + optional label, clicks Create
 *   4. Generate 7-char base62 slug, POST to qr_codes via Postgrest (RLS + trigger enforce)
 *   5. On success, set #text.value to "https://qr.volynx.world/<slug>" and call window.VxQRGen.generateQR()
 *   6. On UNIQUE collision, retry up to 3 times with new slug
 */

(function () {
  "use strict";

  const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const SLUG_LEN = 7;
  const QR_HOST = "https://qr.volynx.world";
  const MAX_COLLISION_RETRIES = 3;

  const PLAN_LIMITS = {
    free: 1,
    launch: 5,
    pro: 20,
    studio: 50,
    teams: 200,
    enterprise: -1, // unlimited
  };

  let supabaseConfig = null;
  let currentUser = null;

  function $(id) { return document.getElementById(id); }

  function decodeJwtPayload(jwt) {
    try {
      const part = String(jwt || "").split(".")[1];
      if (!part) return null;
      const norm = part.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(norm.padEnd(norm.length + (4 - norm.length % 4) % 4, "=")));
    } catch {
      return null;
    }
  }

  function t(key, fallback, vars) {
    const lang = localStorage.getItem("volynx_lang") || "en";
    const dict = window.VX_TRANS && window.VX_TRANS[lang];
    let s = (dict && dict[key]) || fallback || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
      });
    }
    return s;
  }

  function generateSlug() {
    const buf = new Uint8Array(SLUG_LEN);
    crypto.getRandomValues(buf);
    let out = "";
    for (let i = 0; i < SLUG_LEN; i++) {
      out += SLUG_ALPHABET[buf[i] % SLUG_ALPHABET.length];
    }
    return out;
  }

  async function loadConfig() {
    if (supabaseConfig) return supabaseConfig;
    try {
      const res = await fetch("/config.json", { cache: "no-store" });
      if (!res.ok) throw new Error("config.json not found");
      const cfg = await res.json();
      supabaseConfig = {
        url: (cfg.supabaseUrl || "").replace(/\/$/, ""),
        anon: cfg.supabaseAnonKey || "",
      };
      return supabaseConfig;
    } catch (err) {
      console.error("[qr-dynamic] config load failed:", err);
      return null;
    }
  }

  function getSession() {
    try {
      const raw = localStorage.getItem("volynx_session");
      const stored = raw ? JSON.parse(raw) : {};
      const accessToken = localStorage.getItem("volynx_access_token") || stored.access_token || "";
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
    } catch {
      return null;
    }
  }

  async function ensureSession() {
    if (window.VxAuthBridge?.hydrate) {
      window.VxAuthBridge.hydrate();
    }
    if (window.vxEnsureFreshToken) {
      await window.vxEnsureFreshToken().catch(() => null);
    }
    return getSession();
  }

  async function fetchUserPlan(cfg, session) {
    const res = await fetch(`${cfg.url}/rest/v1/profiles?id=eq.${session.user.id}&select=plan,is_admin`, {
      headers: {
        apikey: cfg.anon,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!res.ok) return { plan: "free", is_admin: false };
    const rows = await res.json();
    return rows[0] || { plan: "free", is_admin: false };
  }

  async function fetchActiveQrCount(cfg, session) {
    const res = await fetch(
      `${cfg.url}/rest/v1/qr_codes?owner_id=eq.${session.user.id}&status=in.(active,paused,grace)&select=id`,
      {
        headers: {
          apikey: cfg.anon,
          Authorization: `Bearer ${session.access_token}`,
          Prefer: "count=exact",
        },
      },
    );
    if (!res.ok) return 0;
    const rows = await res.json();
    return rows.length;
  }

  function updateQuotaUI(used, limit, plan) {
    const text = $("qr-dyn-quota-text");
    const wrap = $("qr-dyn-quota");
    if (!text || !wrap) return;
    if (limit === -1) {
      text.textContent = t("qr.dynamic_quota_unlimited", "Unlimited");
      wrap.classList.remove("is-full");
    } else {
      text.textContent = t("qr.dynamic_quota", `${used}/${limit} active dynamic QRs`, { used, limit });
      wrap.classList.toggle("is-full", used >= limit);
    }

    const warning = $("qr-dyn-free-warning");
    if (warning) {
      warning.hidden = plan !== "free";
    }
  }

  function showError(key, fallback) {
    const el = $("qr-dyn-error");
    if (!el) return;
    el.textContent = t(key, fallback);
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 6000);
  }

  function clearError() {
    const el = $("qr-dyn-error");
    if (el) el.hidden = true;
  }

  function loginUrl() {
    if (window.VxLab) return VxLab.loginUrl(VxLab.currentReturnPath());
    const next = window.location.pathname + window.location.search + window.location.hash;
    return `/login/?next=${encodeURIComponent(next || "/qrgen/")}`;
  }

  function showLoginRequired() {
    const loginCta = $("qr-dyn-login-cta");
    const form = $("qr-dyn-form");
    if (loginCta) {
      const link = loginCta.querySelector("a");
      if (link) link.href = loginUrl();
      loginCta.hidden = false;
    }
    if (form) form.hidden = true;
    showError("qr.dynamic_login_required", "Sign in to create dynamic QRs that you can edit later.");
    try {
      if (window.VxReturn) window.VxReturn.remember();
      else localStorage.setItem("volynx_post_login_next", window.location.pathname + window.location.search + window.location.hash);
    } catch (_) {}
  }

  async function refreshQuota() {
    const cfg = await loadConfig();
    const session = await ensureSession();
    if (!cfg || !session) return;
    const profile = await fetchUserPlan(cfg, session);
    const count = await fetchActiveQrCount(cfg, session);
    const limit = profile.is_admin ? -1 : (PLAN_LIMITS[profile.plan] ?? 1);
    updateQuotaUI(count, limit, profile.plan);
    currentUser = { ...session.user, plan: profile.plan, is_admin: profile.is_admin };
  }

  async function createQrCode(targetUrl, label) {
    const cfg = await loadConfig();
    const session = await ensureSession();
    if (!cfg || !session) {
      showLoginRequired();
      return null;
    }

    let lastError = null;
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
      const slug = generateSlug();
      const body = {
        owner_id: session.user.id,
        slug,
        target_url: targetUrl,
        label: label || null,
      };

      const res = await fetch(`${cfg.url}/rest/v1/qr_codes`, {
        method: "POST",
        headers: {
          apikey: cfg.anon,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const rows = await res.json();
        return rows[0];
      }

      const errorBody = await res.text();
      lastError = errorBody;

      // Postgres error code 23505 = unique_violation (slug collision)
      if (errorBody.includes("23505") || errorBody.includes("qr_codes_slug_key")) {
        continue; // retry with new slug
      }

      // Quota exceeded — our trigger raises with hint "qr_quota_exceeded"
      if (errorBody.includes("qr_quota_exceeded")) {
        showError("qr.dynamic_err_quota", "You hit your plan limit. Upgrade or pause one.");
        return null;
      }

      console.error("[qr-dynamic] insert failed:", errorBody);
      showError("qr.dynamic_err_generic", "Could not create QR. Try again.");
      return null;
    }

    console.error("[qr-dynamic] collision after retries:", lastError);
    showError("qr.dynamic_err_collision", "Slug collision (rare). Try again.");
    return null;
  }

  function setMode(mode) {
    const buttons = document.querySelectorAll(".qr-mode-btn");
    buttons.forEach((b) => {
      b.classList.toggle("is-active", b.dataset.mode === mode);
      b.setAttribute("aria-selected", b.dataset.mode === mode ? "true" : "false");
    });

    const dynSection = $("qr-dyn-section");
    const staticInput = document.querySelector(".qr-static-input");
    const genBtn = $("generateBtn");
    const dynBtn = $("qr-dyn-create-btn");
    const qrContainer = $("qr-container");
    const downloadBtn = $("downloadBtn");

    if (mode === "dynamic") {
      if (dynSection) dynSection.hidden = false;
      if (staticInput) staticInput.hidden = true;
      if (genBtn) genBtn.hidden = true;
      if (dynBtn) dynBtn.hidden = false;
      if (qrContainer) qrContainer.innerHTML = "";
      if (downloadBtn) downloadBtn.style.display = "none";
      checkAuthAndRender();
    } else {
      if (dynSection) dynSection.hidden = true;
      if (staticInput) staticInput.hidden = false;
      if (genBtn) genBtn.hidden = false;
      if (dynBtn) dynBtn.hidden = true;
      const success = $("qr-dyn-success");
      if (success) success.hidden = true;
      clearError();
    }
  }

  function checkAuthAndRender() {
    ensureSession().then((session) => {
    const loginCta = $("qr-dyn-login-cta");
    const form = $("qr-dyn-form");

    if (!session) {
      if (loginCta) {
        const link = loginCta.querySelector("a");
        if (link) link.href = loginUrl();
        loginCta.hidden = false;
      }
      if (form) form.hidden = true;
    } else {
      if (loginCta) loginCta.hidden = true;
      if (form) form.hidden = false;
      refreshQuota();
    }
    });
  }

  async function handleCreate() {
    clearError();
    const successEl = $("qr-dyn-success");
    if (successEl) successEl.hidden = true;

    const targetInput = $("qr-dyn-target");
    const labelInput = $("qr-dyn-label-input");
    const dynBtn = $("qr-dyn-create-btn");

    const target = (targetInput?.value || "").trim();
    const label = (labelInput?.value || "").trim();

    if (!/^https?:\/\//i.test(target)) {
      showError("qr.dynamic_err_url", "Destination URL must start with http:// or https://");
      return;
    }

    const originalLabel = dynBtn?.textContent;
    if (dynBtn) {
      dynBtn.disabled = true;
      dynBtn.textContent = t("qr.dynamic_creating", "Creating…");
    }

    try {
      const session = await ensureSession();
      if (!session) {
        showLoginRequired();
        return;
      }
      const created = await createQrCode(target, label);
      if (!created) return;

      const shortUrl = `${QR_HOST}/${created.slug}`;
      if (window.VxLab) {
        VxLab.recordEvent("qr-gen", "dynamic", "Dynamic QR created");
        VxLab.savePreset("qr-gen", {
          mode: "dynamic",
          host: QR_HOST,
          label: label || "none",
        });
      }

      // Render the QR using existing styling pipeline by setting #text and calling generateQR
      const textInput = $("text");
      if (textInput) textInput.value = shortUrl;
      if (window.VxQRGen?.generateQR) {
        window.VxQRGen.generateQR();
      }

      // Show success state
      const codeEl = $("qr-dyn-short-url");
      if (codeEl) codeEl.textContent = shortUrl;
      if (successEl) successEl.hidden = false;

      // Reset inputs and refresh quota
      if (targetInput) targetInput.value = "";
      if (labelInput) labelInput.value = "";
      refreshQuota();
    } finally {
      if (dynBtn) {
        dynBtn.disabled = false;
        dynBtn.textContent = originalLabel || t("qr.dynamic_btn_create", "Create dynamic QR");
      }
    }
  }

  function init() {
    document.querySelectorAll(".qr-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });
    const dynBtn = $("qr-dyn-create-btn");
    if (dynBtn) dynBtn.addEventListener("click", handleCreate);

    // Re-check auth when storage changes (e.g. user logged in another tab)
    window.addEventListener("storage", (e) => {
      if (e.key === "volynx_session" && document.querySelector(".qr-mode-btn.is-active")?.dataset.mode === "dynamic") {
        checkAuthAndRender();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
