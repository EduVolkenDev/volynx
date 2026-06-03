(function () {
  "use strict";

  var HISTORY_KEY = "volynx_lab_history";
  var PRESETS_KEY = "volynx_lab_presets";
  var MAX_ITEMS = 12;

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

  function confirmLogin(nextPath, message) {
    var text = message || "Sign in to continue. You will return to this tool after login.";
    if (window.confirm(text)) goLogin(nextPath);
  }

  function confirmUpgrade(message, href) {
    var text = message || "Upgrade to unlock higher limits and premium exports.";
    if (window.confirm(text)) window.location.href = href || "/pricing/";
  }

  function recordEvent(tool, action, detail) {
    var events = readJson(HISTORY_KEY, []);
    events.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      tool: tool,
      action: action,
      detail: detail || "",
      path: currentReturnPath(),
      ts: new Date().toISOString(),
    });
    writeJson(HISTORY_KEY, events.slice(0, MAX_ITEMS));
    window.dispatchEvent(new CustomEvent("vx:lab-history-updated"));
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

  window.VxLab = {
    currentReturnPath: currentReturnPath,
    loginUrl: loginUrl,
    goLogin: goLogin,
    hasAccessToken: hasAccessToken,
    isPaidPlan: isPaidPlan,
    shouldSendToLogin: shouldSendToLogin,
    confirmLogin: confirmLogin,
    confirmUpgrade: confirmUpgrade,
    recordEvent: recordEvent,
    savePreset: savePreset,
    renderProfilePanel: renderProfilePanel,
  };
  if (document.documentElement) {
    document.documentElement.dataset.vxLab = "ready";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderProfilePanel(document.getElementById("labWorkspacePanel"));
  });
})();
