(function () {
  "use strict";

  var HISTORY_KEY = "volynx_lab_history";
  var PRESETS_KEY = "volynx_lab_presets";
  var ANALYTICS_KEY = "volynx_lab_analytics";
  var STATUS_KEY = "volynx_lab_status";
  var MAX_ITEMS = 12;
  var MAX_ANALYTICS = 80;
  var configPromise = null;
  var cloudSyncPromise = null;

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch;
    });
  }

  function safePath(path) {
    var p = String(path || currentReturnPath() || "/volynx-lab/");
    return p.charAt(0) === "/" ? p : "/volynx-lab/";
  }

  function isSafeRelativePath(path) {
    var p = String(path || "");
    return p.charAt(0) === "/" && p.slice(0, 2) !== "//";
  }

  function isProfilePath(path) {
    return /^\/(profile|login|signup|auth)(\/|\?|#|$)/.test(String(path || ""));
  }

  function isUsefulLabPath(path) {
    var p = String(path || "");
    return /^\/(volynx-lab|qrgen|lab)(\/|\?|#|$)/.test(p);
  }

  function isPassiveAction(action) {
    return /^(modal_|notice_|login_modal_|upgrade_modal_|upgrade_click$)/.test(String(action || ""));
  }

  function decodeJwtPayload(token) {
    try {
      var payload = String(token || "").split(".")[1];
      if (!payload) return null;
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(payload));
    } catch (_) {
      return null;
    }
  }

  function currentUserId() {
    var data = decodeJwtPayload(getAccessToken());
    return data && data.sub ? String(data.sub) : "";
  }

  function getAccessToken() {
    try {
      if (window.VxAuthBridge && typeof window.VxAuthBridge.hydrate === "function") {
        window.VxAuthBridge.hydrate();
      }
      return localStorage.getItem("volynx_access_token") || "";
    } catch (_) {
      return "";
    }
  }

  function ensureFreshToken() {
    if (window.vxEnsureFreshToken && getAccessToken()) {
      return window.vxEnsureFreshToken().then(function () { return getAccessToken(); }).catch(function () { return getAccessToken(); });
    }
    return Promise.resolve(getAccessToken());
  }

  function getConfig() {
    if (configPromise) return configPromise;
    configPromise = fetch("/config.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("config " + res.status);
        return res.json();
      })
      .then(function (cfg) {
        return {
          supabaseUrl: String(cfg.supabaseUrl || cfg.supabase_url || "").replace(/\/$/, ""),
          supabaseAnonKey: cfg.supabaseAnonKey || cfg.anonKey || "",
        };
      })
      .catch(function () { return null; });
    return configPromise;
  }

  function apiFetch(path, options) {
    return ensureFreshToken().then(function (token) {
      if (!token) throw new Error("missing_token");
      return getConfig().then(function (cfg) {
        if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error("missing_config");
        var headers = Object.assign({
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        }, (options && options.headers) || {});
        return fetch(cfg.supabaseUrl + "/rest/v1/" + path, Object.assign({}, options || {}, { headers: headers }));
      });
    });
  }

  function mergeItems(localRows, remoteRows, tsKey) {
    var seen = {};
    return [].concat(remoteRows || [], localRows || [])
      .filter(function (item) {
        var id = item && item.id ? String(item.id) : "";
        if (!id || seen[id]) return false;
        seen[id] = true;
        return true;
      })
      .sort(function (a, b) {
        return Date.parse(b[tsKey] || b.ts || 0) - Date.parse(a[tsKey] || a.ts || 0);
      })
      .slice(0, MAX_ITEMS);
  }

  function toActivityRow(item) {
    return {
      user_id: currentUserId(),
      client_id: String(item.id || ""),
      tool: String(item.tool || "lab"),
      action: String(item.action || "event"),
      detail: String(item.detail || ""),
      path: safePath(item.path),
      plan_at_time: currentPlan(),
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
      created_at: item.ts || new Date().toISOString(),
    };
  }

  function fromActivityRow(row) {
    return {
      id: row.client_id || row.id,
      tool: row.tool || "lab",
      action: row.action || "event",
      detail: row.detail || "",
      path: safePath(row.path),
      ts: row.created_at || new Date().toISOString(),
      metadata: row.metadata || {},
      cloud: true,
    };
  }

  function toPresetRow(item) {
    return {
      user_id: currentUserId(),
      client_id: String(item.id || ""),
      tool: String(item.tool || "lab"),
      label: item.label || "",
      values: item.values && typeof item.values === "object" ? item.values : {},
      path: safePath(item.path),
      plan_at_time: currentPlan(),
      updated_at: item.ts || new Date().toISOString(),
      created_at: item.ts || new Date().toISOString(),
    };
  }

  function fromPresetRow(row) {
    return {
      id: row.client_id || row.id,
      tool: row.tool || "lab",
      label: row.label || "",
      values: row.values || {},
      path: safePath(row.path),
      ts: row.updated_at || row.created_at || new Date().toISOString(),
      cloud: true,
    };
  }

  function upsertRows(table, rows) {
    if (!rows.length || !currentUserId()) return Promise.resolve(false);
    return apiFetch(table + "?on_conflict=user_id,client_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    }).then(function (res) {
      if (!res.ok) throw new Error(table + " " + res.status);
      return true;
    }).catch(function () { return false; });
  }

  function fetchCloudRows(table, select, orderColumn) {
    return apiFetch(table + "?select=" + encodeURIComponent(select) + "&order=" + orderColumn + ".desc&limit=" + MAX_ITEMS, {
      method: "GET",
    }).then(function (res) {
      if (!res.ok) throw new Error(table + " " + res.status);
      return res.json();
    }).catch(function () { return []; });
  }

  function syncLabCloud(options) {
    if (!hasAccessToken()) return Promise.resolve(false);
    if (cloudSyncPromise) return cloudSyncPromise;
    var renderRoot = options && options.renderRoot;
    var localHistory = readJson(HISTORY_KEY, []);
    var localPresets = readJson(PRESETS_KEY, []);
    cloudSyncPromise = Promise.all([
      upsertRows("lab_activity", localHistory.map(toActivityRow).filter(function (row) { return row.client_id && row.user_id; })),
      upsertRows("lab_presets", localPresets.map(toPresetRow).filter(function (row) { return row.client_id && row.user_id; })),
      fetchCloudRows("lab_activity", "client_id,tool,action,detail,path,metadata,created_at", "created_at"),
      fetchCloudRows("lab_presets", "client_id,tool,label,values,path,created_at,updated_at", "updated_at"),
    ]).then(function (parts) {
      var remoteHistory = (parts[2] || []).map(fromActivityRow);
      var remotePresets = (parts[3] || []).map(fromPresetRow);
      writeJson(HISTORY_KEY, mergeItems(localHistory, remoteHistory, "ts"));
      writeJson(PRESETS_KEY, mergeItems(localPresets, remotePresets, "ts"));
      if (renderRoot) renderProfilePanel(renderRoot, { skipCloud: true });
      configureProfileContinue();
      window.dispatchEvent(new CustomEvent("vx:lab-cloud-synced"));
      return true;
    }).catch(function () {
      return false;
    }).then(function (result) {
      cloudSyncPromise = null;
      return result;
    });
    return cloudSyncPromise;
  }

  function currentReturnPath(extraParams) {
    var url = new URL(window.location.href);
    if (extraParams) {
      Object.keys(extraParams).forEach(function (key) {
        var value = extraParams[key];
        if (value == null || value === "") url.searchParams.delete(key);
        else url.searchParams.set(key, value);
      });
    }
    return url.pathname + url.search + url.hash;
  }

  function loginUrl(nextPath) {
    var next = nextPath || currentReturnPath();
    return "/login/?next=" + encodeURIComponent(next || "/volynx-lab/");
  }

  function goLogin(nextPath) {
    var next = nextPath || currentReturnPath();
    try {
      localStorage.setItem("volynx_post_login_next", next);
    } catch (_) {}
    window.location.href = loginUrl(next);
  }

  function hasAccessToken() {
    return !!(localStorage.getItem("volynx_access_token") || "");
  }

  function isPaidPlan(plan) {
    if (window.VxPlan && typeof window.VxPlan.isPaid === "function") {
      return window.VxPlan.isPaid(plan);
    }
    var p = String(plan || "free").toLowerCase();
    return !!p && p !== "free";
  }

  function shouldSendToLogin(permission) {
    if (hasAccessToken()) return false;
    if (!permission) return true;
    if (permission.allowed) return false;
    if (permission.reason && /auth|login|token|unauthor/i.test(permission.reason)) return true;
    if (permission.error && /auth|login|token|unauthor|jwt/i.test(permission.error)) return true;
    return true;
  }

  function ensureModalStyles() {
    if (document.getElementById("vxLabModalStyles")) return;
    var style = document.createElement("style");
    style.id = "vxLabModalStyles";
    style.textContent = [
      ".vx-lab-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(2,6,14,.68);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}",
      ".vx-lab-modal[hidden]{display:none!important}",
      ".vx-lab-modal__card{width:min(440px,100%);border:1px solid rgba(255,255,255,.14);border-radius:12px;background:linear-gradient(135deg,rgba(125,249,255,.11),rgba(214,168,79,.07)),rgba(4,8,18,.96);box-shadow:0 30px 90px rgba(0,0,0,.46);color:#fff;overflow:hidden}",
      ".vx-lab-modal__top{display:flex;align-items:center;gap:12px;padding:18px 18px 12px}",
      ".vx-lab-modal__icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(125,249,255,.2);border-radius:10px;background:rgba(125,249,255,.09);color:#7df9ff;font-size:20px;font-weight:900;flex:0 0 auto}",
      ".vx-lab-modal__title{margin:0;color:#fff;font:900 18px/1.15 Manrope,ui-sans-serif,system-ui,sans-serif;letter-spacing:0}",
      ".vx-lab-modal__body{padding:0 18px 16px;color:rgba(255,255,255,.68);font:500 14px/1.55 Manrope,ui-sans-serif,system-ui,sans-serif}",
      ".vx-lab-modal__body p{margin:0 0 10px}.vx-lab-modal__body p:last-child{margin-bottom:0}",
      ".vx-lab-modal__actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;padding:14px 18px 18px;border-top:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025)}",
      ".vx-lab-modal__btn{min-height:40px;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:0 14px;background:rgba(255,255,255,.055);color:rgba(255,255,255,.86);font:900 13px/1 Manrope,ui-sans-serif,system-ui,sans-serif;cursor:pointer}",
      ".vx-lab-modal__btn:hover{border-color:rgba(125,249,255,.42);color:#fff}",
      ".vx-lab-modal__btn--primary{border-color:rgba(214,168,79,.42);background:linear-gradient(135deg,#d6a84f,#f8e9c1);color:#06142e}",
      "@media(max-width:520px){.vx-lab-modal{align-items:end;padding:12px}.vx-lab-modal__actions{display:grid;grid-template-columns:1fr}.vx-lab-modal__btn{width:100%}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensurePresetStyles() {
    if (document.getElementById("vxLabPresetStyles")) return;
    var style = document.createElement("style");
    style.id = "vxLabPresetStyles";
    style.textContent = [
      ".vx-lab-presets{margin:14px 0 0;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035)}",
      ".vx-lab-presets__head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}",
      ".vx-lab-presets__title{margin:0;color:rgba(255,255,255,.9);font:900 12px/1.2 Manrope,ui-sans-serif,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}",
      ".vx-lab-presets__status{color:rgba(125,249,255,.78);font:800 11px/1.2 Manrope,ui-sans-serif,system-ui,sans-serif}",
      ".vx-lab-presets__list{display:flex;flex-wrap:wrap;gap:8px}",
      ".vx-lab-presets__chip{min-height:34px;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:7px 11px;background:rgba(255,255,255,.055);color:rgba(255,255,255,.84);font:800 12px/1.2 Manrope,ui-sans-serif,system-ui,sans-serif;cursor:pointer;max-width:100%;white-space:normal;text-align:left}",
      ".vx-lab-presets__chip:hover,.vx-lab-presets__chip:focus-visible{border-color:rgba(125,249,255,.46);background:rgba(125,249,255,.095);color:#fff;outline:none}",
      ".vx-lab-presets__empty{margin:0;color:rgba(255,255,255,.52);font:600 12px/1.45 Manrope,ui-sans-serif,system-ui,sans-serif}",
      "@media(max-width:620px){.vx-lab-presets__head{align-items:flex-start;flex-direction:column}.vx-lab-presets__chip{width:100%;border-radius:8px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function closeModal(root) {
    if (!root) return;
    root.setAttribute("hidden", "");
    root.remove();
    document.removeEventListener("keydown", root._vxKeyHandler);
  }

  function modalParagraphs(message) {
    return String(message || "")
      .replace(/Click OK to see upgrade options\.?/gi, "")
      .replace(/Click OK to see options\.?/gi, "")
      .split(/\n+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function openModal(options) {
    if (!document.body) return false;
    ensureModalStyles();

    var root = document.createElement("div");
    root.className = "vx-lab-modal";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "vxLabModalTitle");

    var card = document.createElement("div");
    card.className = "vx-lab-modal__card";

    var top = document.createElement("div");
    top.className = "vx-lab-modal__top";

    var icon = document.createElement("div");
    icon.className = "vx-lab-modal__icon";
    icon.textContent = options.icon || "V";

    var title = document.createElement("h2");
    title.id = "vxLabModalTitle";
    title.className = "vx-lab-modal__title";
    title.textContent = options.title || "VOLYNX Lab";

    var body = document.createElement("div");
    body.className = "vx-lab-modal__body";
    modalParagraphs(options.message || "").forEach(function (part) {
      var p = document.createElement("p");
      p.textContent = part;
      body.appendChild(p);
    });

    var actions = document.createElement("div");
    actions.className = "vx-lab-modal__actions";

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "vx-lab-modal__btn";
    cancel.textContent = options.cancelLabel || "Stay here";
    cancel.addEventListener("click", function () {
      track("lab", "modal_cancel", { title: options.title || "VOLYNX Lab" });
      closeModal(root);
      if (typeof options.onCancel === "function") options.onCancel();
    });

    var primary = document.createElement("button");
    primary.type = "button";
    primary.className = "vx-lab-modal__btn vx-lab-modal__btn--primary";
    primary.textContent = options.primaryLabel || "Continue";
    primary.addEventListener("click", function () {
      track("lab", "modal_confirm", { title: options.title || "VOLYNX Lab" });
      closeModal(root);
      if (typeof options.onConfirm === "function") options.onConfirm();
    });

    actions.appendChild(cancel);
    actions.appendChild(primary);
    top.appendChild(icon);
    top.appendChild(title);
    card.appendChild(top);
    card.appendChild(body);
    card.appendChild(actions);
    root.appendChild(card);
    root.addEventListener("click", function (event) {
      if (event.target === root) cancel.click();
    });
    root._vxKeyHandler = function (event) {
      if (event.key === "Escape") cancel.click();
    };
    document.addEventListener("keydown", root._vxKeyHandler);
    document.body.appendChild(root);
    primary.focus({ preventScroll: true });
    return true;
  }

  function confirmLogin(nextPath, message) {
    var text = message || "Sign in to continue. You will return to this tool after login.";
    track("lab", "login_modal_open", { next: nextPath || currentReturnPath() });
    if (!openModal({
      icon: "L",
      title: "Sign in to keep working",
      message: text,
      primaryLabel: "Sign in",
      cancelLabel: "Stay here",
      onConfirm: function () { goLogin(nextPath); },
    }) && window.confirm(text)) {
      goLogin(nextPath);
    }
  }

  function confirmUpgrade(message, href) {
    var text = message || "Upgrade to unlock higher limits and premium exports.";
    var target = href || "/pricing/";
    track("lab", "upgrade_modal_open", { href: target });
    if (!openModal({
      icon: "P",
      title: "Upgrade for the premium workflow",
      message: text,
      primaryLabel: "See upgrade options",
      cancelLabel: "Not now",
      onConfirm: function () { window.location.href = target; },
    }) && window.confirm(text)) {
      window.location.href = target;
    }
  }

  function notify(options) {
    var config = typeof options === "string" ? { message: options } : (options || {});
    track(config.tool || "lab", config.event || "notice_open", { title: config.title || "VOLYNX Lab" });
    return openModal({
      icon: config.icon || "!",
      title: config.title || "VOLYNX Lab",
      message: config.message || "",
      primaryLabel: config.primaryLabel || "OK",
      cancelLabel: config.cancelLabel || "Close",
      onConfirm: config.onConfirm,
      onCancel: config.onCancel,
    });
  }

  function recordEvent(tool, action, detail) {
    var events = readJson(HISTORY_KEY, []);
    var item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      tool: tool,
      action: action,
      detail: detail || "",
      path: currentReturnPath(),
      ts: new Date().toISOString(),
    };
    events.unshift(item);
    writeJson(HISTORY_KEY, events.slice(0, MAX_ITEMS));
    track(tool, action, { detail: detail || "", path: item.path });
    setStatus(tool, action, detail || "");
    upsertRows("lab_activity", [toActivityRow(item)]);
    window.dispatchEvent(new CustomEvent("vx:lab-history-updated"));
  }

  function currentPlan() {
    try {
      if (window.VxPlan && typeof window.VxPlan.getCachedRelaxed === "function") return window.VxPlan.getCachedRelaxed().plan;
      if (window.VxPlan && typeof window.VxPlan.getCached === "function") return (window.VxPlan.getCached() || {}).plan || "free";
    } catch (_) {}
    return window.vxPlan || "free";
  }

  function track(tool, eventName, metadata) {
    var rows = readJson(ANALYTICS_KEY, []);
    rows.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      tool: tool || "lab",
      event: eventName || "event",
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      path: currentReturnPath(),
      plan: currentPlan(),
      ts: new Date().toISOString(),
    });
    writeJson(ANALYTICS_KEY, rows.slice(0, MAX_ANALYTICS));
    window.dispatchEvent(new CustomEvent("vx:lab-analytics-updated"));
    try {
      window.dispatchEvent(new CustomEvent("vx:lab-analytics", {
        detail: { tool: tool, action: eventName, detail: metadata || {}, path: currentReturnPath() }
      }));
    } catch (_) {}
  }

  function setStatus(tool, state, detail) {
    var statuses = readJson(STATUS_KEY, {});
    statuses[tool || "lab"] = {
      state: state || "ready",
      detail: detail || "",
      path: currentReturnPath(),
      ts: new Date().toISOString(),
    };
    writeJson(STATUS_KEY, statuses);
    window.dispatchEvent(new CustomEvent("vx:lab-status-updated", { detail: { tool: tool, state: state, text: detail || "" } }));
  }

  function savePreset(tool, values) {
    var presets = readJson(PRESETS_KEY, []);
    var cleanValues = values || {};
    presets = presets.filter(function (item) {
      return item.tool !== tool || JSON.stringify(item.values) !== JSON.stringify(cleanValues);
    });
    presets.unshift({
      id: tool + "-" + Date.now().toString(36),
      tool: tool,
      values: cleanValues,
      path: currentReturnPath(),
      ts: new Date().toISOString(),
    });
    writeJson(PRESETS_KEY, presets.slice(0, MAX_ITEMS));
    upsertRows("lab_presets", [toPresetRow(presets[0])]);
    window.dispatchEvent(new CustomEvent("vx:lab-presets-updated"));
  }

  function toolLabel(tool) {
    return {
      converter: "Converter",
      "image-scaler": "Image Scaler",
      "image-suite": "Image Suite",
      lumina: "Lumina",
      "qr-gen": "QRGen",
      qr: "QRGen",
      lab: "Lab",
      "lab-home": "Lab Home",
    }[tool] || tool || "Lab";
  }

  function presetSummary(tool, values) {
    var v = values || {};
    if (tool === "converter") {
      return [
        v.format ? String(v.format).toUpperCase() : "",
        v.quality ? "Q " + v.quality : "",
        v.maxWidth ? "Max " + v.maxWidth : "",
      ].filter(Boolean).join(" · ");
    }
    if (tool === "image-scaler") {
      return [
        v.scale || "",
        v.format ? String(v.format).toUpperCase() : "",
        v.smoothing ? "Smooth " + v.smoothing : "",
      ].filter(Boolean).join(" · ");
    }
    if (tool === "image-suite") {
      return [
        v.tool ? String(v.tool).replace(/-/g, " ") : "",
        v.scale || "",
        v.format ? String(v.format).toUpperCase() : "",
        v.quality ? "Q " + v.quality : "",
        v.fill ? "Fill " + v.fill : "",
      ].filter(Boolean).join(" · ");
    }
    if (tool === "lumina") {
      return [v.mode || "", v.language || ""].filter(Boolean).join(" · ");
    }
    return Object.keys(v).map(function (key) {
      return key + ": " + v[key];
    }).join(" · ");
  }

  function renderToolPresets(tool, options) {
    var config = options || {};
    var anchor = typeof config.anchor === "string" ? document.querySelector(config.anchor) : config.anchor;
    if (!anchor || !tool) return null;
    ensurePresetStyles();

    var root = document.querySelector('[data-vx-lab-presets="' + tool + '"]');
    if (!root) {
      root = document.createElement("section");
      root.className = "vx-lab-presets";
      root.dataset.vxLabPresets = tool;
      root.setAttribute("aria-label", toolLabel(tool) + " presets");
      root.innerHTML = '<div class="vx-lab-presets__head"><h3 class="vx-lab-presets__title">Recent presets</h3><span class="vx-lab-presets__status" aria-live="polite"></span></div><div class="vx-lab-presets__list"></div>';
      if (config.position === "before") anchor.parentNode.insertBefore(root, anchor);
      else anchor.parentNode.insertBefore(root, anchor.nextSibling);
    }

    var list = root.querySelector(".vx-lab-presets__list");
    var status = root.querySelector(".vx-lab-presets__status");
    var presets = getPresets(tool).slice(0, config.limit || 4);
    if (!presets.length) {
      list.innerHTML = '<p class="vx-lab-presets__empty">' + escapeHtml(config.emptyText || "No saved presets yet. Process something once and it appears here.") + '</p>';
      if (status) status.textContent = "";
      return root;
    }

    list.innerHTML = "";
    presets.forEach(function (preset) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "vx-lab-presets__chip";
      button.textContent = presetSummary(tool, preset.values) || toolLabel(tool) + " preset";
      button.addEventListener("click", function () {
        if (typeof config.apply === "function") config.apply(preset.values || {}, preset);
        if (status) {
          status.textContent = "Preset applied";
          window.setTimeout(function () {
            if (status.textContent === "Preset applied") status.textContent = "";
          }, 1800);
        }
        recordEvent(tool, "preset_apply", button.textContent);
      });
      list.appendChild(button);
    });

    if (!root._vxRefreshBound) {
      root._vxRefreshBound = true;
      window.addEventListener("vx:lab-presets-updated", function () { renderToolPresets(tool, config); });
      window.addEventListener("vx:lab-cloud-synced", function () { renderToolPresets(tool, config); });
    }
    return root;
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  }

  function uniqueToolCount(rows) {
    var seen = {};
    (rows || []).forEach(function (item) {
      if (item && item.tool) seen[item.tool] = true;
    });
    return Object.keys(seen).length;
  }

  function plural(count, one, many) {
    return count === 1 ? one : many;
  }

  function renderSummaryCard(label, value, detail) {
    return '<div class="lab-profile-summary-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><em>' + escapeHtml(detail || "") + '</em></div>';
  }

  function getContinueTarget(options) {
    var allowPending = !options || options.allowPending !== false;
    var pending = "";
    try {
      pending = localStorage.getItem("volynx_post_login_next") || "";
    } catch (_) {}
    if (allowPending && isSafeRelativePath(pending) && !isProfilePath(pending)) {
      return {
        path: pending,
        label: "Continue where you were",
        source: "pending",
      };
    }

    var history = readJson(HISTORY_KEY, []);
    for (var i = 0; i < history.length; i++) {
      var item = history[i] || {};
      var path = safePath(item.path);
      if (!isSafeRelativePath(path) || !isUsefulLabPath(path) || isPassiveAction(item.action)) continue;
      return {
        path: path,
        label: "Continue " + toolLabel(item.tool),
        source: "history",
        item: item,
      };
    }

    var presets = readJson(PRESETS_KEY, []);
    for (var j = 0; j < presets.length; j++) {
      var preset = presets[j] || {};
      var presetPath = safePath(preset.path);
      if (!isSafeRelativePath(presetPath) || !isUsefulLabPath(presetPath)) continue;
      return {
        path: presetPath,
        label: "Continue " + toolLabel(preset.tool),
        source: "preset",
        item: preset,
      };
    }

    return {
      path: "/volynx-lab/",
      label: "Open VOLYNX Lab",
      source: "fallback",
    };
  }

  function configureProfileContinue(root) {
    var scope = root || document;
    var target = getContinueTarget();
    var continueBtn = scope.querySelector ? scope.querySelector("#continueBtn") : document.getElementById("continueBtn");
    var firstTimeBtn = scope.querySelector ? scope.querySelector("#firstTimeContinueBtn") : document.getElementById("firstTimeContinueBtn");

    function wire(button, allowFallback) {
      if (!button) return;
      var buttonTarget = target;
      if (!allowFallback && buttonTarget.source === "fallback") {
        button.hidden = true;
        return;
      }
      button.hidden = false;
      button.removeAttribute("data-i18n");
      button.textContent = buttonTarget.label;
      button.onclick = function () {
        try { localStorage.removeItem("volynx_post_login_next"); } catch (_) {}
        window.location.href = isSafeRelativePath(buttonTarget.path) ? buttonTarget.path : "/volynx-lab/";
      };
    }

    wire(continueBtn, true);
    wire(firstTimeBtn, false);
  }

  function renderProfilePanel(root, options) {
    if (!root) return;
    var history = readJson(HISTORY_KEY, []);
    var presets = readJson(PRESETS_KEY, []);
    var summaryEl = root.querySelector("[data-lab-summary]");
    var historyEl = root.querySelector("[data-lab-history]");
    var presetsEl = root.querySelector("[data-lab-presets]");
    var continueTarget = getContinueTarget({ allowPending: false });

    if (summaryEl) {
      var usefulHistory = history.filter(function (item) {
        return item && !isPassiveAction(item.action) && isUsefulLabPath(safePath(item.path));
      });
      var latest = usefulHistory[0] || history[0] || presets[0] || null;
      var latestLabel = latest ? toolLabel(latest.tool) : "Lab";
      var latestDetail = latest && latest.ts ? formatTime(latest.ts) : "Ready when you are";
      var continuePath = isSafeRelativePath(continueTarget.path) ? continueTarget.path : "/volynx-lab/";
      summaryEl.innerHTML = [
        renderSummaryCard("Last workspace", latestLabel, latestDetail),
        renderSummaryCard("Recent actions", String(history.length), plural(history.length, "recorded action", "recorded actions")),
        renderSummaryCard("Saved presets", String(presets.length), plural(presets.length, "reusable recipe", "reusable recipes")),
        renderSummaryCard("Tools touched", String(uniqueToolCount(history.concat(presets))), "across VOLYNX Lab"),
        '<a class="lab-profile-summary-card lab-profile-summary-card--cta" href="' + escapeHtml(continuePath) + '"><span>Continue</span><strong>' + escapeHtml(continueTarget.label) + '</strong><em>Open the most relevant Lab workspace</em></a>'
      ].join("");
    }

    if (historyEl) {
      historyEl.innerHTML = history.length
        ? history.slice(0, 5).map(function (item) {
            return '<a class="lab-profile-row" href="' + escapeHtml(safePath(item.path)) + '"><strong>' + escapeHtml(toolLabel(item.tool)) + '</strong><span>' + escapeHtml(item.detail || item.action || "Recent activity") + '</span><em>' + escapeHtml(formatTime(item.ts)) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No Lab activity yet.</p>';
    }

    if (presetsEl) {
      presetsEl.innerHTML = presets.length
        ? presets.slice(0, 5).map(function (item) {
            var summary = Object.keys(item.values || {}).map(function (key) {
              return key + ": " + item.values[key];
            }).join(" · ");
            return '<a class="lab-profile-row" href="' + escapeHtml(safePath(item.path)) + '"><strong>' + escapeHtml(toolLabel(item.tool)) + '</strong><span>' + escapeHtml(summary) + '</span><em>' + escapeHtml(formatTime(item.ts)) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No saved presets yet.</p>';
    }

    if (!options || !options.skipCloud) {
      syncLabCloud({ renderRoot: root });
    }
    configureProfileContinue(root.ownerDocument || document);
  }

  function getHistory(tool) {
    var rows = readJson(HISTORY_KEY, []);
    return tool ? rows.filter(function (item) { return item.tool === tool; }) : rows;
  }

  function getPresets(tool) {
    var rows = readJson(PRESETS_KEY, []);
    return tool ? rows.filter(function (item) { return item.tool === tool; }) : rows;
  }

  function getAnalytics(tool) {
    var rows = readJson(ANALYTICS_KEY, []);
    return tool ? rows.filter(function (item) { return item.tool === tool; }) : rows;
  }

  function getStatuses() {
    return readJson(STATUS_KEY, {});
  }

  window.VxLab = {
    currentReturnPath: currentReturnPath,
    loginUrl: loginUrl,
    goLogin: goLogin,
    hasAccessToken: hasAccessToken,
    isPaidPlan: isPaidPlan,
    shouldSendToLogin: shouldSendToLogin,
    confirmLogin: confirmLogin,
    confirmUpgrade: confirmUpgrade,
    notify: notify,
    openModal: openModal,
    recordEvent: recordEvent,
    track: track,
    setStatus: setStatus,
    savePreset: savePreset,
    renderProfilePanel: renderProfilePanel,
    getContinueTarget: getContinueTarget,
    configureProfileContinue: configureProfileContinue,
    renderToolPresets: renderToolPresets,
    getHistory: getHistory,
    getPresets: getPresets,
    getAnalytics: getAnalytics,
    getStatuses: getStatuses,
    syncCloud: syncLabCloud,
  };
  if (document.documentElement) {
    document.documentElement.dataset.vxLab = "ready";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var panel = document.getElementById("labWorkspacePanel");
    renderProfilePanel(panel);
    var active = document.querySelector(".vx-lab-switcher__link.is-active span");
    if (active) recordEvent(String(active.textContent || "Lab").toLowerCase().replace(/\s+/g, "-"), "tool_open", "Tool opened");
    document.querySelectorAll(".vx-lab-shell__actions a, .vx-lab-shell__legend a").forEach(function (link) {
      link.addEventListener("click", function () {
        var text = String(link.textContent || "").trim();
        if (/upgrade|studio|pro|plans|capacity/i.test(text)) recordEvent("lab", "upgrade_click", text);
      });
    });
  });
})();
