/**
 * VOLYNX QR Manager — /profile/qr-codes/
 * Lists user's dynamic QR codes with edit/pause/resume/delete actions.
 * Uses Postgrest directly with user JWT; RLS limits to owner rows.
 */

(function () {
  "use strict";

  const QR_HOST = "https://qr.volynx.world";
  const ADMIN_QR_MANAGER_PATH = "/admin/codes/?tab=qr";
  const ADMIN_EMAIL_ALLOWLIST = ["edupelomundo13@gmail.com"];

  const PLAN_LIMITS = {
    free: 1, launch: 5, pro: 20, studio: 50, teams: 200, enterprise: -1,
  };

  let supabaseConfig = null;
  let session = null;
  let editingId = null;
  let transferringId = null;

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

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function showOnly(id) {
    ["qrpLoading", "qrpLoggedOut", "qrpEmpty", "qrpList"].forEach((k) => {
      const el = $(k);
      if (el) el.hidden = k !== id;
    });
  }

  async function loadConfig() {
    if (supabaseConfig) return supabaseConfig;
    const res = await fetch("/config.json", { cache: "no-store" });
    const cfg = await res.json();
    supabaseConfig = {
      url: (cfg.supabaseUrl || "").replace(/\/$/, ""),
      anon: cfg.supabaseAnonKey || "",
    };
    return supabaseConfig;
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
    } catch { return null; }
  }

  function detectAdminHint() {
    try {
      if (window.VX_IS_ADMIN === true) return true;
      if (document.documentElement.classList.contains("vx-admin")) return true;
      if (document.body?.classList.contains("vx-admin")) return true;
      if (localStorage.getItem("volynx_is_admin") === "1") return true;
      const payload = decodeJwtPayload(localStorage.getItem("volynx_access_token") || "");
      const email = String(payload?.email || localStorage.getItem("volynx_user_email") || "").toLowerCase();
      if (email && ADMIN_EMAIL_ALLOWLIST.includes(email)) return true;
      return payload?.app_metadata?.is_admin === true;
    } catch {
      return false;
    }
  }

  async function ensureSession() {
    if (window.VxAuthBridge?.hydrate) {
      window.VxAuthBridge.hydrate();
    }
    if (window.vxEnsureFreshToken) {
      await window.vxEnsureFreshToken().catch(() => null);
    }
    session = getSession();
    return session;
  }

  async function authHeaders() {
    await ensureSession();
    const cfg = await loadConfig();
    return {
      apikey: cfg.anon,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }

  async function rpc(name, body) {
    const cfg = await loadConfig();
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body || {}),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error((data && (data.message || data.error || data.code || data.raw)) || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function fetchProfile() {
    const cfg = await loadConfig();
    const res = await fetch(`${cfg.url}/rest/v1/profiles?id=eq.${session.user.id}&select=plan,is_admin`, {
      headers: { apikey: cfg.anon, Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return { plan: "free", is_admin: false };
    const rows = await res.json();
    return rows[0] || { plan: "free", is_admin: false };
  }

  function redirectAdminToAdminQr(profile) {
    if (!profile?.is_admin) return false;
    if (location.pathname.startsWith("/admin/")) return false;
    location.replace(ADMIN_QR_MANAGER_PATH);
    return true;
  }

  async function fetchQRCodes() {
    const cfg = await loadConfig();
    const res = await fetch(
      `${cfg.url}/rest/v1/qr_codes?owner_id=eq.${session.user.id}&select=*&order=created_at.desc`,
      { headers: { apikey: cfg.anon, Authorization: `Bearer ${session.access_token}` } },
    );
    if (!res.ok) return [];
    return await res.json();
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function statusLabel(status) {
    const map = {
      active: t("qrp.status_active", "Active"),
      paused: t("qrp.status_paused", "Paused"),
      grace: t("qrp.status_grace", "Expiring soon"),
      expired: t("qrp.status_expired", "Expired"),
      admin_blocked: t("qrp.status_blocked", "Blocked"),
    };
    return map[status] || status;
  }

  function renderList(qrs, profile) {
    const list = $("qrpItems");
    if (!list) return;

    const activeCount = qrs.filter((q) => ["active", "paused", "grace"].includes(q.status)).length;
    const limit = profile.is_admin ? -1 : (PLAN_LIMITS[profile.plan] ?? 1);
    const quotaEl = $("qrpQuotaText");
    if (quotaEl) {
      quotaEl.textContent = limit === -1
        ? t("qrp.quota_unlimited", "Unlimited active QRs")
        : t("qrp.quota_count", `${activeCount}/${limit} active QRs`, { used: activeCount, limit });
    }

    list.innerHTML = qrs.map((qr) => {
      const shortUrl = `${QR_HOST}/${qr.slug}`;
      const target = qr.target_url;
      const labelOrSlug = qr.label || qr.slug;
      const founderControlled = qr.founder_controlled === true;
      const expiresLine = qr.expires_at
        ? `<span title="${escapeHtml(qr.expires_at)}">${t("qrp.expires", "Expires")}: ${formatDate(qr.expires_at)}</span>`
        : `<span>${t("qrp.never_expires", "Never expires")}</span>`;

      const canPause = !founderControlled && qr.status === "active";
      const canResume = !founderControlled && qr.status === "paused";
      const canEdit = !["expired", "admin_blocked"].includes(qr.status);
      const canTransfer = canEdit && !founderControlled;
      const canDelete = !founderControlled;

      return `
        <article class="qrp-item qrp-item--${qr.status}" data-id="${qr.id}">
          <span class="qrp-status qrp-status--${qr.status}">${escapeHtml(statusLabel(qr.status))}</span>

          <div class="qrp-item-body">
            <div class="qrp-item-title">${escapeHtml(labelOrSlug)}</div>
            <div class="qrp-item-meta">
              <button type="button" class="copy-btn" data-copy="${escapeHtml(shortUrl)}" title="${t("qrp.copy_short", "Copy short URL")}">
                ${escapeHtml(shortUrl.replace(/^https?:\/\//, ""))} 📋
              </button>
              <span class="qrp-target" title="${escapeHtml(target)}">→ ${escapeHtml(target)}</span>
              <span>${qr.scan_count} ${t("qrp.scans", "scans")}</span>
              ${expiresLine}
              ${founderControlled ? `<span>${t("qrp.founder_managed", "Founder managed")}</span>` : ""}
            </div>
          </div>

          <div class="qrp-actions">
            ${canEdit ? `<button type="button" class="qrp-action" data-action="edit" data-id="${qr.id}" title="${t("qrp.action_edit", "Edit destination")}">✏️</button>` : ""}
            ${canTransfer ? `<button type="button" class="qrp-action" data-action="transfer" data-id="${qr.id}" title="${t("qrp.action_transfer", "Transfer ownership")}">⇄</button>` : ""}
            ${canPause ? `<button type="button" class="qrp-action" data-action="pause" data-id="${qr.id}" title="${t("qrp.action_pause", "Pause")}">⏸</button>` : ""}
            ${canResume ? `<button type="button" class="qrp-action" data-action="resume" data-id="${qr.id}" title="${t("qrp.action_resume", "Resume")}">▶️</button>` : ""}
            ${canDelete ? `<button type="button" class="qrp-action qrp-action--danger" data-action="delete" data-id="${qr.id}" title="${t("qrp.action_delete", "Delete")}">🗑</button>` : ""}
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const qr = qrs.find((q) => q.id === id);
        if (!qr) return;
        if (action === "edit") openEditModal(qr);
        else if (action === "transfer") openTransferModal(qr);
        else if (action === "pause") updateStatus(id, "paused");
        else if (action === "resume") updateStatus(id, "active");
        else if (action === "delete") deleteQr(id, qr.label || qr.slug);
      });
    });

    list.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.dataset.copy;
        navigator.clipboard.writeText(url).then(() => {
          const original = btn.innerHTML;
          btn.innerHTML = `${t("qrp.copied", "Copied!")} ✓`;
          setTimeout(() => { btn.innerHTML = original; }, 1500);
        }).catch(() => {});
      });
    });
  }

  async function updateStatus(id, newStatus) {
    const cfg = await loadConfig();
    const res = await fetch(`${cfg.url}/rest/v1/qr_codes?id=eq.${id}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      alert(t("qrp.err_update", "Could not update QR status."));
      return;
    }
    refresh();
  }

  async function deleteQr(id, name) {
    const confirmed = confirm(t("qrp.confirm_delete", `Delete "${name}"? This cannot be undone.`, { name }));
    if (!confirmed) return;
    const cfg = await loadConfig();
    const res = await fetch(`${cfg.url}/rest/v1/qr_codes?id=eq.${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) {
      alert(t("qrp.err_delete", "Could not delete QR."));
      return;
    }
    refresh();
  }

  function openEditModal(qr) {
    editingId = qr.id;
    const modal = $("qrpEditModal");
    const target = $("qrpEditTarget");
    const label = $("qrpEditLabel");
    const error = $("qrpEditError");
    if (target) target.value = qr.target_url || "";
    if (label) label.value = qr.label || "";
    if (error) error.hidden = true;
    if (modal) modal.hidden = false;
  }

  function closeEditModal() {
    editingId = null;
    const modal = $("qrpEditModal");
    if (modal) modal.hidden = true;
  }

  function openTransferModal(qr) {
    transferringId = qr.id;
    const modal = $("qrpTransferModal");
    const email = $("qrpTransferEmail");
    const error = $("qrpTransferError");
    if (email) email.value = "";
    if (error) error.hidden = true;
    if (modal) modal.hidden = false;
    setTimeout(() => email?.focus({ preventScroll: true }), 0);
  }

  function closeTransferModal() {
    transferringId = null;
    const modal = $("qrpTransferModal");
    if (modal) modal.hidden = true;
  }

  function transferErrorMessage(err) {
    const raw = JSON.stringify(err?.data || {}) + " " + String(err?.message || err || "");
    if (raw.includes("qr_transfer_target_profile_not_found")) {
      return "That email does not have a VOLYNX profile yet. Ask the recipient to create an account first.";
    }
    if (raw.includes("qr_transfer_target_quota_exceeded")) {
      return "The recipient account is not compatible with this QR yet. Gift a compatible subscription or ask them to upgrade before transferring.";
    }
    if (raw.includes("qr_transfer_same_owner")) {
      return "This QR already belongs to that account.";
    }
    if (raw.includes("qr_transfer_locked_status")) {
      return "This QR is locked and cannot be transferred.";
    }
    return "Could not transfer this QR. Check the recipient email and try again.";
  }

  async function saveTransfer() {
    if (!transferringId) return;
    const email = ($("qrpTransferEmail")?.value || "").trim().toLowerCase();
    const error = $("qrpTransferError");
    const saveBtn = $("qrpTransferSave");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (error) {
        error.textContent = "Enter the recipient account email.";
        error.hidden = false;
      }
      return;
    }

    const ok = confirm(`Transfer this QR to ${email}? The short URL stays the same, but the recipient will manage destination edits from their profile.`);
    if (!ok) return;

    if (saveBtn) saveBtn.disabled = true;
    try {
      await rpc("transfer_qr_code", {
        p_qr_id: transferringId,
        p_target_email: email,
        p_note: "Transferred from user QR manager",
      });
      closeTransferModal();
      refresh();
    } catch (err) {
      if (error) {
        error.textContent = transferErrorMessage(err);
        error.hidden = false;
      }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    const target = ($("qrpEditTarget")?.value || "").trim();
    const label = ($("qrpEditLabel")?.value || "").trim();
    const error = $("qrpEditError");
    const saveBtn = $("qrpEditSave");

    if (!/^https?:\/\//i.test(target)) {
      if (error) {
        error.textContent = t("qrp.err_url", "Destination URL must start with http:// or https://");
        error.hidden = false;
      }
      return;
    }

    const cfg = await loadConfig();
    if (saveBtn) saveBtn.disabled = true;

    const res = await fetch(`${cfg.url}/rest/v1/qr_codes?id=eq.${editingId}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ target_url: target, label: label || null }),
    });

    if (saveBtn) saveBtn.disabled = false;

    if (!res.ok) {
      const body = await res.text();
      if (error) {
        error.textContent = body.includes("qr_codes_target_url_http")
          ? t("qrp.err_url", "Destination URL must start with http:// or https://")
          : t("qrp.err_save", "Could not save changes.");
        error.hidden = false;
      }
      return;
    }
    closeEditModal();
    refresh();
  }

  async function refresh() {
    if (!await ensureSession()) {
      showOnly("qrpLoggedOut");
      return;
    }
    if (detectAdminHint()) {
      location.replace(ADMIN_QR_MANAGER_PATH);
      return;
    }
    const profile = await fetchProfile();
    if (redirectAdminToAdminQr(profile)) return;
    const qrs = await fetchQRCodes();
    if (qrs.length === 0) {
      showOnly("qrpEmpty");
    } else {
      renderList(qrs, profile);
      showOnly("qrpList");
    }
  }

  async function init() {
    if (!await ensureSession()) {
      showOnly("qrpLoggedOut");
      return;
    }

    // Wire modal close handlers
    $("qrpEditModal")?.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener("click", closeEditModal);
    });
    $("qrpEditSave")?.addEventListener("click", saveEdit);
    $("qrpTransferModal")?.querySelectorAll("[data-transfer-close]").forEach((el) => {
      el.addEventListener("click", closeTransferModal);
    });
    $("qrpTransferSave")?.addEventListener("click", saveTransfer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("qrpEditModal")?.hidden) closeEditModal();
      if (e.key === "Escape" && !$("qrpTransferModal")?.hidden) closeTransferModal();
    });

    await refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
