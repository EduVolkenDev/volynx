(function () {
  "use strict";

  var HISTORY_KEY = "volynx_lab_history";
  var PRESETS_KEY = "volynx_lab_presets";
  var ANALYTICS_KEY = "volynx_lab_analytics";
  var STATUS_KEY = "volynx_lab_status";
  var MAX_ITEMS = 12;
  var MAX_ANALYTICS = 80;

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
    }[tool] || tool || "Lab";
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  }

  function renderProfilePanel(root) {
    if (!root) return;
    var history = readJson(HISTORY_KEY, []);
    var presets = readJson(PRESETS_KEY, []);
    var historyEl = root.querySelector("[data-lab-history]");
    var presetsEl = root.querySelector("[data-lab-presets]");

    if (historyEl) {
      historyEl.innerHTML = history.length
        ? history.slice(0, 5).map(function (item) {
            return '<a class="lab-profile-row" href="' + item.path + '"><strong>' + toolLabel(item.tool) + '</strong><span>' + (item.detail || item.action || "Recent activity") + '</span><em>' + formatTime(item.ts) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No Lab activity yet.</p>';
    }

    if (presetsEl) {
      presetsEl.innerHTML = presets.length
        ? presets.slice(0, 5).map(function (item) {
            var summary = Object.keys(item.values || {}).map(function (key) {
              return key + ": " + item.values[key];
            }).join(" · ");
            return '<a class="lab-profile-row" href="' + item.path + '"><strong>' + toolLabel(item.tool) + '</strong><span>' + summary + '</span><em>' + formatTime(item.ts) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No saved presets yet.</p>';
    }
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
    getHistory: getHistory,
    getPresets: getPresets,
    getAnalytics: getAnalytics,
    getStatuses: getStatuses,
  };
  if (document.documentElement) {
    document.documentElement.dataset.vxLab = "ready";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderProfilePanel(document.getElementById("labWorkspacePanel"));
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
