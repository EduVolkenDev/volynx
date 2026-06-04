/**
 * VOLYNX QR Admin — /admin/qr-codes/
 * Uses admin RPCs backed by RLS + SECURITY DEFINER checks.
 */
(function () {
  "use strict";

  const QR_HOST = "https://qr.volynx.world";
  const STATUS = ["active", "paused", "grace", "expired", "admin_blocked"];

  let cfg = null;

  function $(id) { return document.getElementById(id); }

  const els = {
    loading: $("qraLoading"),
    loggedOut: $("qraLoggedOut"),
    forbidden: $("qraForbidden"),
    admin: $("qraAdmin"),
    filters: $("qraFilters"),
    status: $("qraStatus"),
    search: $("qraSearch"),
    limit: $("qraLimit"),
    list: $("qraList"),
    message: $("qraMessage"),
  };

  function setMessage(text, tone) {
    if (!els.message) return;
    els.message.textContent = text || "";
    els.message.dataset.tone = tone || "";
  }

  function showOnly(which) {
    [els.loading, els.loggedOut, els.forbidden, els.admin].forEach((el) => {
      if (el) el.hidden = el !== which;
    });
  }

  async function getToken() {
    try {
      if (window.VxAuthBridge?.hydrate) {
        window.VxAuthBridge.hydrate();
      }
      if (window.vxEnsureFreshToken) {
        await window.vxEnsureFreshToken().catch(() => null);
      }
      return localStorage.getItem("volynx_access_token") || "";
    } catch (_) { return ""; }
  }

  function decodeJwtPayload(jwt) {
    try {
      const part = jwt.split(".")[1];
      if (!part) return null;
      const norm = part.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(norm.padEnd(norm.length + (4 - norm.length % 4) % 4, "=")));
    } catch (_) {
      return null;
    }
  }

  async function loadConfig() {
    if (cfg) return cfg;
    const res = await fetch("/config.json", { cache: "no-store" });
    const json = await res.json();
    cfg = {
      url: (json.supabaseUrl || json.supabase_url || "").replace(/\/$/, ""),
      anon: json.supabaseAnonKey || json.anonKey || "",
    };
    return cfg;
  }

  async function authHeaders() {
    const token = await getToken();
    const c = await loadConfig();
    return {
      apikey: c.anon,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    };
  }

  async function rpc(name, body) {
    const c = await loadConfig();
    const res = await fetch(`${c.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body || {}),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error((data && (data.message || data.error || data.code)) || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function checkAdmin() {
    const token = await getToken();
    if (!token) return "logged_out";
    const payload = decodeJwtPayload(token);
    const uid = payload && payload.sub;
    if (!uid) return "logged_out";

    const c = await loadConfig();
    const res = await fetch(`${c.url}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=is_admin`, {
      headers: {
        apikey: c.anon,
        Authorization: "Bearer " + token,
      },
    });
    if (!res.ok) return "forbidden";
    const rows = await res.json();
    return rows && rows[0] && rows[0].is_admin ? "admin" : "forbidden";
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return "Never";
    try { return new Date(iso).toLocaleString(); } catch (_) { return iso; }
  }

  function toInputValue(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function inputToIso(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function optionList(current) {
    return STATUS.map((status) => (
      `<option value="${status}" ${status === current ? "selected" : ""}>${status.replace("_", " ")}</option>`
    )).join("");
  }

  function rowTemplate(qr) {
    const shortUrl = `${QR_HOST}/${qr.slug}`;
    const title = qr.label || qr.slug;
    return `
      <article class="qra-row" data-id="${escapeHtml(qr.id)}">
        <div class="qra-row-main">
          <div class="qra-titleline">
            <span class="qra-status qra-status--${escapeHtml(qr.status)}">${escapeHtml(qr.status.replace("_", " "))}</span>
            <span class="qra-label">${escapeHtml(title)}</span>
          </div>
          <div class="qra-meta">
            <div><strong>Short:</strong> <code>${escapeHtml(shortUrl)}</code></div>
            <div><strong>Owner:</strong> ${escapeHtml(qr.owner_email || qr.owner_id)}</div>
            <div><strong>Target:</strong> <a href="${escapeHtml(qr.target_url)}" target="_blank" rel="noopener">${escapeHtml(qr.target_url)}</a></div>
            <div><strong>Plan:</strong> ${escapeHtml(qr.plan_at_creation || "unknown")} · <strong>Scans:</strong> ${Number(qr.scan_count || 0)} · <strong>Last:</strong> ${escapeHtml(fmtDate(qr.last_scan_at))}</div>
            <div><strong>Expires:</strong> ${escapeHtml(fmtDate(qr.expires_at))} · <strong>Grace:</strong> ${escapeHtml(fmtDate(qr.grace_until))}</div>
          </div>
        </div>
        <div class="qra-control">
          <label class="qra-field-wide">
            <span>Destination URL</span>
            <input data-field="target_url" type="url" value="${escapeHtml(qr.target_url)}" />
          </label>
          <label class="qra-field-wide">
            <span>Label</span>
            <input data-field="label" type="text" maxlength="100" value="${escapeHtml(qr.label || "")}" />
          </label>
          <label class="qra-field-wide">
            <span>Transfer to user email</span>
            <input data-field="transfer_email" type="email" placeholder="client@example.com" autocomplete="email" />
          </label>
          <label>
            <span>Status</span>
            <select data-field="status">${optionList(qr.status)}</select>
          </label>
          <label>
            <span>Expires at</span>
            <input data-field="expires_at" type="datetime-local" value="${escapeHtml(toInputValue(qr.expires_at))}" />
          </label>
          <label>
            <span>Grace until</span>
            <input data-field="grace_until" type="datetime-local" value="${escapeHtml(toInputValue(qr.grace_until))}" />
          </label>
          <div class="qra-actions">
            <button class="qra-btn primary" type="button" data-action="saveDestination">Save destination</button>
            <button class="qra-btn primary" type="button" data-action="save">Save</button>
            <button class="qra-btn ghost" type="button" data-action="renew30">Renew 30d</button>
            <button class="qra-btn ghost" type="button" data-action="never">Never expires</button>
            <button class="qra-btn ghost" type="button" data-action="expire">Expire now</button>
            <button class="qra-btn danger" type="button" data-action="block">Block</button>
            <button class="qra-btn ghost" type="button" data-action="copy" data-url="${escapeHtml(shortUrl)}">Copy URL</button>
            <button class="qra-btn ghost" type="button" data-action="transfer">Transfer owner</button>
          </div>
        </div>
      </article>
    `;
  }

  async function loadRows() {
    setMessage("Loading QR codes...");
    const status = els.status && els.status.value ? els.status.value : null;
    const search = els.search && els.search.value ? els.search.value.trim() : null;
    const limit = Math.min(Math.max(Number(els.limit?.value || 100), 1), 500);
    const rows = await rpc("admin_list_qr_codes", {
      p_limit: limit,
      p_status: status,
      p_search: search,
    });
    if (!els.list) return;
    els.list.innerHTML = rows && rows.length
      ? rows.map(rowTemplate).join("")
      : '<section class="qra-state"><p>No QR codes found.</p></section>';
    setMessage(`${rows ? rows.length : 0} QR code(s) loaded.`);
  }

  async function updateValidity(id, patch) {
    await rpc("admin_update_qr_validity", Object.assign({ p_qr_id: id }, patch));
    await loadRows();
  }

  async function updateDestination(id, patch) {
    const c = await loadConfig();
    const res = await fetch(`${c.url}/rest/v1/qr_codes?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(patch),
    });
    const text = await res.text();
    if (!res.ok) {
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
      const err = new Error((data && (data.message || data.error || data.code || data.raw)) || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    await loadRows();
  }

  function getRowPatch(row) {
    const status = row.querySelector('[data-field="status"]')?.value || null;
    const expiresValue = row.querySelector('[data-field="expires_at"]')?.value || "";
    const graceValue = row.querySelector('[data-field="grace_until"]')?.value || "";
    return {
      p_status: status,
      p_expires_at: inputToIso(expiresValue),
      p_grace_until: inputToIso(graceValue),
      p_clear_expiry: !expiresValue,
      p_clear_grace: !graceValue,
    };
  }

  function getDestinationPatch(row) {
    const target = (row.querySelector('[data-field="target_url"]')?.value || "").trim();
    const label = (row.querySelector('[data-field="label"]')?.value || "").trim();
    if (!/^https?:\/\//i.test(target)) {
      throw new Error("Destination URL must start with http:// or https://");
    }
    return {
      target_url: target,
      label: label || null,
    };
  }

  function getTransferEmail(row) {
    const email = String(row.querySelector('[data-field="transfer_email"]')?.value || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter the customer's account email before transferring.");
    }
    return email;
  }

  function transferErrorMessage(err) {
    const raw = JSON.stringify(err?.data || {}) + " " + String(err?.message || err || "");
    if (raw.includes("qr_transfer_target_profile_not_found")) {
      return "Recipient profile not found. Ask the customer to create a VOLYNX account before transferring this QR.";
    }
    if (raw.includes("qr_transfer_target_quota_exceeded")) {
      return "Recipient account is not compatible with this QR yet. Gift a compatible subscription or ask them to upgrade before transfer.";
    }
    if (raw.includes("qr_transfer_same_owner")) {
      return "This QR already belongs to that account.";
    }
    return err?.message || String(err);
  }

  function futureIso(days) {
    const date = new Date(Date.now() + days * 86400000);
    return date.toISOString();
  }

  async function handleRowAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const row = button.closest(".qra-row");
    if (!row) return;
    const id = row.dataset.id;
    const action = button.dataset.action;
    if (!id || !action) return;

    try {
      button.disabled = true;
      if (action === "copy") {
        await navigator.clipboard.writeText(button.dataset.url || "");
        setMessage("Copied QR URL.");
        return;
      }

      if (action === "saveDestination") {
        await updateDestination(id, getDestinationPatch(row));
      } else if (action === "save") {
        await updateValidity(id, getRowPatch(row));
      } else if (action === "transfer") {
        const email = getTransferEmail(row);
        const ok = confirm(`Transfer this QR to ${email}? The short URL stays the same, but the customer will manage destination edits from their profile.`);
        if (!ok) return;
        await rpc("admin_transfer_qr_code", {
          p_qr_id: id,
          p_target_email: email,
          p_note: "Transferred from legacy QR admin",
        });
      } else if (action === "renew30") {
        await updateValidity(id, {
          p_status: "active",
          p_expires_at: futureIso(30),
          p_grace_until: futureIso(37),
          p_clear_expiry: false,
          p_clear_grace: false,
        });
      } else if (action === "never") {
        await updateValidity(id, {
          p_status: "active",
          p_clear_expiry: true,
          p_clear_grace: true,
        });
      } else if (action === "expire") {
        await updateValidity(id, {
          p_status: "expired",
          p_expires_at: futureIso(-1),
          p_grace_until: futureIso(-1),
          p_clear_expiry: false,
          p_clear_grace: false,
        });
      } else if (action === "block") {
        const ok = confirm("Block this QR? It will stop redirecting immediately.");
        if (!ok) return;
        await updateValidity(id, { p_status: "admin_blocked" });
      }
      setMessage(action === "saveDestination"
        ? "QR destination updated."
        : action === "transfer"
          ? "QR owner transferred."
          : "QR validity updated.");
    } catch (err) {
      console.error("[qr-admin]", err);
      setMessage(`Could not update QR: ${action === "transfer" ? transferErrorMessage(err) : (err.message || err)}`, "error");
    } finally {
      button.disabled = false;
    }
  }

  async function init() {
    try {
      const role = await checkAdmin();
      if (role === "logged_out") {
        showOnly(els.loggedOut);
        return;
      }
      if (role !== "admin") {
        showOnly(els.forbidden);
        return;
      }

      showOnly(els.admin);
      els.filters?.addEventListener("submit", (event) => {
        event.preventDefault();
        loadRows().catch((err) => {
          console.error("[qr-admin]", err);
          setMessage(`Could not load QR codes: ${err.message || err}`, "error");
        });
      });
      els.list?.addEventListener("click", handleRowAction);
      await loadRows();
    } catch (err) {
      console.error("[qr-admin]", err);
      showOnly(els.forbidden);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
