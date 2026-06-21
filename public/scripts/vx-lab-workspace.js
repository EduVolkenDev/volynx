(function () {
  "use strict";

  var HISTORY_KEY = "volynx_lab_history";
  var PRESETS_KEY = "volynx_lab_presets";
  var ANALYTICS_KEY = "volynx_lab_analytics";
  var STATUS_KEY = "volynx_lab_status";
  var QRGEN_PROJECTS_KEY = "volynx_qrgen_projects_v1";
  var LUMINA_HISTORY_KEY = "vx_lumina_history_v1";
  var MAX_ITEMS = 12;
  var MAX_ANALYTICS = 80;
  var configPromise = null;
  var cloudSyncPromise = null;
  var memoryManagerState = { query: "", filter: "all", editing: "" };

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

  function withQuery(path, key, value) {
    var safe = safePath(path);
    if (!isSafeRelativePath(safe) || !value) return safe;
    try {
      var url = new URL(safe, window.location.origin);
      url.searchParams.set(key, String(value));
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return safe;
    }
  }

  function presetRestorePath(item) {
    return item && item.id ? withQuery(item.path, "preset", item.id) : safePath(item && item.path);
  }

  function qrProjectRestorePath(item) {
    return item && item.id ? withQuery("/qrgen/", "project", item.id) : "/qrgen/";
  }

  function luminaHistoryRestorePath(item) {
    return item && item.id ? withQuery("/volynx-lab/lumina/", "history", item.id) : "/volynx-lab/lumina/";
  }

  function timestampValue(value) {
    var parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clearQueryParam(name) {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete(name);
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (_) {}
  }

  function restorePresetFromUrl(tool, apply, options) {
    var config = options || {};
    var presetId = "";
    try {
      presetId = new URLSearchParams(window.location.search).get("preset") || "";
    } catch (_) {}
    if (!presetId || typeof apply !== "function") return false;

    var preset = getPresets(tool).find(function (item) { return item && item.id === presetId; });
    clearQueryParam("preset");
    if (!preset) {
      if (typeof config.onMissing === "function") config.onMissing(presetId);
      return false;
    }

    apply(preset.values || {}, preset);
    if (typeof config.onSuccess === "function") config.onSuccess(preset);
    recordEvent(tool, "preset_restore", presetSummary(tool, preset.values));
    return true;
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
    var latest = {};
    [].concat(remoteRows || [], localRows || []).forEach(function (item) {
      var id = item && item.id ? String(item.id) : "";
      if (!id) return;
      var existing = latest[id];
      var itemTs = Date.parse(item[tsKey] || item.ts || 0) || 0;
      var existingTs = existing ? (Date.parse(existing[tsKey] || existing.ts || 0) || 0) : -1;
      if (!existing || itemTs >= existingTs) latest[id] = item;
    });
    return Object.keys(latest).map(function (id) { return latest[id]; })
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
      pinned: Boolean(item.pinned),
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
      pinned: Boolean(row.pinned),
      ts: row.updated_at || row.created_at || new Date().toISOString(),
      cloud: true,
    };
  }

  function toArtifactRow(kind, item) {
    var createdAt = item.created_at || item.ts || new Date().toISOString();
    var updatedAt = item.updated_at || item.ts || createdAt;
    return {
      user_id: currentUserId(),
      client_id: String(item.id || ""),
      kind: kind,
      title: String(item.name || item.title || ""),
      payload: item && typeof item === "object" ? item : {},
      path: kind === "qr-project" ? "/qrgen/" : "/volynx-lab/lumina/",
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }

  function fromArtifactRow(row) {
    var item = row.payload && typeof row.payload === "object" ? row.payload : {};
    return Object.assign({}, item, {
      id: row.client_id || item.id || row.id,
      cloud: true,
      created_at: item.created_at || row.created_at,
      updated_at: item.updated_at || row.updated_at,
      ts: item.ts || row.updated_at || row.created_at,
    });
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

  function upsertArtifacts(rows) {
    if (!rows.length || !currentUserId()) return Promise.resolve(false);
    return apiFetch("lab_artifacts?on_conflict=user_id,kind,client_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    }).then(function (res) {
      if (!res.ok) throw new Error("lab_artifacts " + res.status);
      return true;
    }).catch(function () { return false; });
  }

  function syncArtifact(kind, item) {
    if (!item || !item.id || !hasAccessToken()) return Promise.resolve(false);
    return upsertArtifacts([toArtifactRow(kind, item)]);
  }

  function deleteArtifact(kind, clientId) {
    if (!kind || !clientId || !hasAccessToken()) return Promise.resolve(false);
    var query = "lab_artifacts?kind=eq." + encodeURIComponent(kind) + "&client_id=eq." + encodeURIComponent(clientId);
    return apiFetch(query, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  function deleteCloudRow(table, clientId) {
    if (!table || !clientId || !hasAccessToken()) return Promise.resolve(false);
    return apiFetch(table + "?client_id=eq." + encodeURIComponent(clientId), {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    }).then(function (res) { return res.ok; }).catch(function () { return false; });
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
    var localQrProjects = readJson(QRGEN_PROJECTS_KEY, []);
    var localLuminaHistory = readJson(LUMINA_HISTORY_KEY, []);
    cloudSyncPromise = Promise.all([
      upsertRows("lab_activity", localHistory.map(toActivityRow).filter(function (row) { return row.client_id && row.user_id; })),
      upsertRows("lab_presets", localPresets.map(toPresetRow).filter(function (row) { return row.client_id && row.user_id; })),
      upsertArtifacts(localQrProjects.map(function (item) { return toArtifactRow("qr-project", item); }).filter(function (row) { return row.client_id && row.user_id; })),
      upsertArtifacts(localLuminaHistory.map(function (item) { return toArtifactRow("lumina-response", item); }).filter(function (row) { return row.client_id && row.user_id; })),
      fetchCloudRows("lab_activity", "client_id,tool,action,detail,path,metadata,created_at", "created_at"),
      fetchCloudRows("lab_presets", "client_id,tool,label,values,path,pinned,created_at,updated_at", "updated_at"),
      fetchCloudRows("lab_artifacts", "client_id,kind,title,payload,path,created_at,updated_at", "updated_at"),
    ]).then(function (parts) {
      var remoteHistory = (parts[4] || []).map(fromActivityRow);
      var remotePresets = (parts[5] || []).map(fromPresetRow);
      var remoteArtifacts = parts[6] || [];
      var remoteQrProjects = remoteArtifacts.filter(function (row) { return row.kind === "qr-project"; }).map(fromArtifactRow);
      var remoteLuminaHistory = remoteArtifacts.filter(function (row) { return row.kind === "lumina-response"; }).map(fromArtifactRow);
      writeJson(HISTORY_KEY, mergeItems(localHistory, remoteHistory, "ts"));
      writeJson(PRESETS_KEY, mergeItems(localPresets, remotePresets, "ts"));
      writeJson(QRGEN_PROJECTS_KEY, mergeItems(localQrProjects, remoteQrProjects, "updated_at"));
      writeJson(LUMINA_HISTORY_KEY, mergeItems(localLuminaHistory, remoteLuminaHistory, "ts"));
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
    return window.VxReturn
      ? window.VxReturn.loginUrl(next)
      : "/login/?next=" + encodeURIComponent(next || "/volynx-lab/");
  }

  function goLogin(nextPath) {
    var next = nextPath || currentReturnPath();
    if (window.VxReturn) {
      window.VxReturn.redirectToLogin(next);
      return;
    }
    try { localStorage.setItem("volynx_post_login_next", next); } catch (_) {}
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

  function modalLanguage() {
    try {
      return localStorage.getItem("volynx_lang") === "pt" ? "pt" : "en";
    } catch (_) {
      return "en";
    }
  }

  var MODAL_FALLBACK_COPY = {
    en: {
      "modal.action.close": "Close",
      "modal.action.done": "Done",
      "modal.action.delete": "Delete",
      "modal.action.keep": "Keep it",
      "modal.action.not_now": "Not now",
      "modal.action.sign_in": "Sign in",
      "modal.action.stay_here": "Stay here",
      "modal.action.upgrade": "See upgrade options",
      "modal.login.title": "Enter your VOLYNX workspace",
      "modal.login.message": "Sign in to continue. You will return to this tool after login.",
      "modal.upgrade.title": "Upgrade for the premium workflow",
      "modal.upgrade.message": "Upgrade to unlock higher limits and premium exports.",
      "modal.vx.title": "Use VX for this action?",
      "modal.vx.message": "Use {cost} VX from your balance for this premium action?",
      "modal.vx.primary": "Use {cost} VX",
      "modal.vx.cost": "Cost: {cost} VX",
      "modal.notice.title": "VOLYNX Lab",
      "modal.warning.title": "Action needs attention",
      "modal.error.title": "Something needs fixing",
      "modal.success.download_title": "Download started",
      "modal.success.download_message": "Your file is ready and the download has started.",
      "modal.success.export_title": "Export complete",
      "modal.success.export_message": "Your file is ready. Review it before using it in production.",
      "modal.success.save_title": "Saved to your workspace",
      "modal.success.save_message": "Your latest work is ready to continue from this browser.",
      "modal.delete.title": "Delete saved Lab work?",
      "modal.delete.message": "{name} will be removed from this device and your VOLYNX profile."
    },
    pt: {
      "modal.action.close": "Fechar",
      "modal.action.done": "Concluído",
      "modal.action.delete": "Excluir",
      "modal.action.keep": "Manter",
      "modal.action.not_now": "Agora não",
      "modal.action.sign_in": "Entrar",
      "modal.action.stay_here": "Ficar aqui",
      "modal.action.upgrade": "Ver opções de upgrade",
      "modal.login.title": "Entre no seu workspace VOLYNX",
      "modal.login.message": "Entre para continuar. Você voltará para esta ferramenta após o login.",
      "modal.upgrade.title": "Evolua para o workflow premium",
      "modal.upgrade.message": "Faça upgrade para liberar limites maiores e exportações premium.",
      "modal.vx.title": "Usar VX nesta ação?",
      "modal.vx.message": "Usar {cost} VX do seu saldo nesta ação premium?",
      "modal.vx.primary": "Usar {cost} VX",
      "modal.vx.cost": "Custo: {cost} VX",
      "modal.notice.title": "VOLYNX Lab",
      "modal.warning.title": "Esta ação precisa de atenção",
      "modal.error.title": "Algo precisa ser corrigido",
      "modal.success.download_title": "Download iniciado",
      "modal.success.download_message": "Seu arquivo está pronto e o download foi iniciado.",
      "modal.success.export_title": "Exportação concluída",
      "modal.success.export_message": "Seu arquivo está pronto. Revise-o antes de usar em produção.",
      "modal.success.save_title": "Salvo no seu workspace",
      "modal.success.save_message": "Seu trabalho está pronto para continuar neste navegador.",
      "modal.delete.title": "Excluir trabalho salvo do Lab?",
      "modal.delete.message": "{name} será removido deste dispositivo e do seu perfil VOLYNX."
    }
  };

  function modalText(key, replacements) {
    var lang = modalLanguage();
    var translations = window.VX_TRANS && window.VX_TRANS[lang];
    var text = (translations && translations[key]) || MODAL_FALLBACK_COPY[lang][key] || MODAL_FALLBACK_COPY.en[key] || key;
    Object.keys(replacements || {}).forEach(function (name) {
      text = text.replace(new RegExp("\\{" + name + "\\}", "g"), String(replacements[name]));
    });
    return text;
  }

  function localizedModalOption(value, fallbackKey, replacements) {
    if (value && typeof value === "object") {
      return value[modalLanguage()] || value.en || value.pt || modalText(fallbackKey, replacements);
    }
    if (modalLanguage() === "pt") return modalText(fallbackKey, replacements);
    return value || modalText(fallbackKey, replacements);
  }

  function ensureModalStyles() {
    if (document.getElementById("vxLabModalStyles")) return;
    var style = document.createElement("style");
    style.id = "vxLabModalStyles";
    style.textContent = [
      ".vx-lab-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(2,6,14,.68);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}",
      ".vx-lab-modal--login{background:radial-gradient(circle at 50% 18%,rgba(125,249,255,.18),transparent 34%),radial-gradient(circle at 50% 82%,rgba(214,168,79,.11),transparent 30%),rgba(2,6,14,.76)}",
      ".vx-lab-modal--upgrade{background:radial-gradient(circle at 50% 18%,rgba(214,168,79,.16),transparent 34%),radial-gradient(circle at 50% 80%,rgba(125,249,255,.1),transparent 32%),rgba(2,6,14,.78)}",
      ".vx-lab-modal--confirm{background:radial-gradient(circle at 50% 20%,rgba(125,249,255,.15),transparent 34%),rgba(2,6,14,.78)}",
      ".vx-lab-modal--success{background:radial-gradient(circle at 50% 20%,rgba(125,249,255,.17),transparent 34%),radial-gradient(circle at 50% 82%,rgba(214,168,79,.09),transparent 30%),rgba(2,6,14,.76)}",
      ".vx-lab-modal--warning,.vx-lab-modal--error{background:radial-gradient(circle at 50% 20%,rgba(255,111,97,.14),transparent 34%),rgba(2,6,14,.8)}",
      ".vx-lab-modal[hidden]{display:none!important}",
      ".vx-lab-modal__card{width:min(440px,100%);max-height:calc(100dvh - 40px);border:1px solid rgba(255,255,255,.14);border-radius:12px;background:linear-gradient(135deg,rgba(125,249,255,.11),rgba(214,168,79,.07)),rgba(4,8,18,.96);box-shadow:0 30px 90px rgba(0,0,0,.46);color:#fff;overflow:auto;overscroll-behavior:contain;animation:vx-modal-enter .24s ease-out both}",
      ".vx-lab-modal--login .vx-lab-modal__card{width:min(500px,100%);border-color:rgba(125,249,255,.24);background:linear-gradient(180deg,rgba(125,249,255,.13),rgba(214,168,79,.06) 58%,rgba(4,8,18,.98));box-shadow:0 34px 110px rgba(0,0,0,.56),0 0 70px rgba(125,249,255,.12)}",
      ".vx-lab-modal--experience .vx-lab-modal__card{width:min(500px,100%);box-shadow:0 34px 110px rgba(0,0,0,.58),0 0 64px rgba(125,249,255,.08)}",
      ".vx-lab-modal--upgrade .vx-lab-modal__card{border-color:rgba(214,168,79,.26);background:linear-gradient(180deg,rgba(214,168,79,.12),rgba(125,249,255,.055) 58%,rgba(4,8,18,.98))}",
      ".vx-lab-modal--confirm .vx-lab-modal__card,.vx-lab-modal--success .vx-lab-modal__card{border-color:rgba(125,249,255,.22);background:linear-gradient(180deg,rgba(125,249,255,.11),rgba(214,168,79,.045) 58%,rgba(4,8,18,.98))}",
      ".vx-lab-modal--warning .vx-lab-modal__card,.vx-lab-modal--error .vx-lab-modal__card{border-color:rgba(255,145,117,.24);background:linear-gradient(180deg,rgba(255,111,97,.1),rgba(214,168,79,.035) 58%,rgba(4,8,18,.98))}",
      ".vx-lab-modal__top{display:flex;align-items:center;gap:12px;padding:18px 18px 12px}",
      ".vx-lab-modal--login .vx-lab-modal__top{flex-direction:column;justify-content:center;text-align:center;gap:14px;padding:28px 28px 12px}",
      ".vx-lab-modal--experience .vx-lab-modal__top{flex-direction:column;justify-content:center;text-align:center;gap:14px;padding:28px 28px 12px}",
      ".vx-lab-modal__icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(125,249,255,.2);border-radius:10px;background:rgba(125,249,255,.09);color:#7df9ff;font-size:20px;font-weight:900;flex:0 0 auto}",
      ".vx-lab-modal__icon--image{width:54px;height:54px;border:0;background:transparent;box-shadow:0 12px 32px rgba(125,249,255,.12)}",
      ".vx-lab-modal__icon--image img{width:100%;height:100%;display:block;object-fit:contain}",
      ".vx-lab-modal--login .vx-lab-modal__icon--image{width:150px;height:150px;border-radius:999px;background:radial-gradient(circle,rgba(125,249,255,.12),rgba(125,249,255,.02) 62%,transparent 70%);box-shadow:0 24px 70px rgba(125,249,255,.16);position:relative}",
      ".vx-lab-modal--login .vx-lab-modal__icon--image::before{content:\"\";position:absolute;inset:-14px;border-radius:999px;background:radial-gradient(circle,rgba(125,249,255,.28),rgba(214,168,79,.12) 42%,transparent 70%);filter:blur(10px);opacity:.58;animation:vx-login-portal-pulse 2.8s ease-in-out infinite;pointer-events:none}",
      ".vx-lab-modal--login .vx-lab-modal__icon--image::after{content:\"\";position:absolute;inset:14px;border:1px solid rgba(255,255,255,.12);border-radius:999px;pointer-events:none}",
      ".vx-lab-modal--login .vx-lab-modal__icon--image img{position:relative;z-index:1}",
      ".vx-lab-modal--experience:not(.vx-lab-modal--login) .vx-lab-modal__icon--image{width:146px;height:146px;position:relative;box-shadow:none}",
      ".vx-lab-modal--experience:not(.vx-lab-modal--login) .vx-lab-modal__icon--image::before{content:\"\";position:absolute;inset:5px;border-radius:999px;background:radial-gradient(circle,rgba(125,249,255,.2),transparent 68%);filter:blur(12px);opacity:.58;animation:vx-modal-aura 3.2s ease-in-out infinite;pointer-events:none}",
      ".vx-lab-modal--upgrade .vx-lab-modal__icon--image::before{background:radial-gradient(circle,rgba(214,168,79,.22),rgba(125,249,255,.1) 45%,transparent 70%)}",
      ".vx-lab-modal--warning .vx-lab-modal__icon--image::before,.vx-lab-modal--error .vx-lab-modal__icon--image::before{background:radial-gradient(circle,rgba(255,111,97,.2),rgba(214,168,79,.08) 45%,transparent 70%)}",
      ".vx-lab-modal--experience:not(.vx-lab-modal--login) .vx-lab-modal__icon--image img{position:absolute;inset:0;z-index:1;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 16px 26px rgba(0,0,0,.32));animation:vx-modal-float 4.4s ease-in-out infinite}",
      "@keyframes vx-modal-enter{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}",
      "@keyframes vx-login-portal-pulse{0%,100%{opacity:.34;transform:scale(.94)}45%{opacity:.8;transform:scale(1.08)}70%{opacity:.48;transform:scale(1.02)}}",
      "@keyframes vx-modal-aura{0%,100%{opacity:.34;transform:scale(.94)}50%{opacity:.72;transform:scale(1.08)}}",
      "@keyframes vx-modal-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}",
      ".vx-lab-modal__title{margin:0;color:#fff;font:900 18px/1.15 Manrope,ui-sans-serif,system-ui,sans-serif;letter-spacing:0}",
      ".vx-lab-modal--login .vx-lab-modal__title{max-width:360px;font-size:24px;line-height:1.12}",
      ".vx-lab-modal--experience .vx-lab-modal__title{max-width:380px;font-size:24px;line-height:1.12}",
      ".vx-lab-modal__body{padding:0 18px 16px;color:rgba(255,255,255,.68);font:500 14px/1.55 Manrope,ui-sans-serif,system-ui,sans-serif}",
      ".vx-lab-modal--login .vx-lab-modal__body{padding:0 32px 22px;text-align:center;color:rgba(255,255,255,.72)}",
      ".vx-lab-modal--experience .vx-lab-modal__body{padding:0 32px 22px;text-align:center;color:rgba(255,255,255,.72)}",
      ".vx-lab-modal__body p{margin:0 0 10px}.vx-lab-modal__body p:last-child{margin-bottom:0}",
      ".vx-lab-modal__actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;padding:14px 18px 18px;border-top:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025)}",
      ".vx-lab-modal--login .vx-lab-modal__actions{justify-content:center;padding:18px 28px 28px;background:rgba(255,255,255,.018)}",
      ".vx-lab-modal--experience .vx-lab-modal__actions{justify-content:center;padding:18px 28px 28px;background:rgba(255,255,255,.018)}",
      ".vx-lab-modal__actions--single{display:grid;grid-template-columns:minmax(130px,220px);justify-content:center}",
      ".vx-lab-modal__btn{min-height:40px;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:0 14px;background:rgba(255,255,255,.055);color:rgba(255,255,255,.86);font:900 13px/1 Manrope,ui-sans-serif,system-ui,sans-serif;cursor:pointer}",
      ".vx-lab-modal--login .vx-lab-modal__btn{min-width:130px;min-height:44px}",
      ".vx-lab-modal--experience .vx-lab-modal__btn{min-width:130px;min-height:44px}",
      ".vx-lab-modal__btn:hover{border-color:rgba(125,249,255,.42);color:#fff}",
      ".vx-lab-modal__btn:focus-visible{outline:2px solid #7df9ff;outline-offset:3px}",
      ".vx-lab-modal__btn--primary{border-color:rgba(214,168,79,.42);background:linear-gradient(135deg,#d6a84f,#f8e9c1);color:#06142e}",
      ".vx-lab-modal--warning .vx-lab-modal__btn--primary,.vx-lab-modal--error .vx-lab-modal__btn--primary{border-color:rgba(255,145,117,.52);background:linear-gradient(135deg,#d65f58,#ff9d82);color:#190807}",
      "@media(max-width:520px){.vx-lab-modal{align-items:end;padding:12px}.vx-lab-modal__card{max-height:calc(100dvh - 24px)}.vx-lab-modal__actions{display:grid;grid-template-columns:1fr}.vx-lab-modal__btn{width:100%}.vx-lab-modal--experience .vx-lab-modal__top{padding:22px 22px 10px}.vx-lab-modal--login .vx-lab-modal__icon--image,.vx-lab-modal--experience:not(.vx-lab-modal--login) .vx-lab-modal__icon--image{width:124px;height:124px}.vx-lab-modal--experience .vx-lab-modal__title{font-size:22px}.vx-lab-modal--experience .vx-lab-modal__body{padding:0 22px 20px}.vx-lab-modal--experience .vx-lab-modal__actions{padding:16px 22px 22px}}",
      "@media(prefers-reduced-motion:reduce){.vx-lab-modal__card,.vx-lab-modal__icon--image::before,.vx-lab-modal__icon--image img{animation:none!important}}"
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

  function closeModal(root, restoreFocus) {
    if (!root) return;
    root.setAttribute("hidden", "");
    root.remove();
    document.removeEventListener("keydown", root._vxKeyHandler);
    if (restoreFocus !== false && root._vxPreviousFocus && typeof root._vxPreviousFocus.focus === "function") {
      try { root._vxPreviousFocus.focus({ preventScroll: true }); } catch (_) {}
    }
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

    var previousModal = document.querySelector(".vx-lab-modal");
    if (previousModal) closeModal(previousModal, false);

    var allowedExperiences = { login: true, upgrade: true, confirm: true, success: true, warning: true, error: true };
    var requestedExperience = options.experience || (options.loginExperience ? "login" : "");
    var experience = allowedExperiences[requestedExperience] ? requestedExperience : "";
    var modalId = "vxLabModal" + Date.now().toString(36);

    var root = document.createElement("div");
    root.className = "vx-lab-modal";
    if (experience) root.className += " vx-lab-modal--experience vx-lab-modal--" + experience;
    root.setAttribute("role", experience === "error" || experience === "warning" ? "alertdialog" : "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", modalId + "Title");
    root._vxPreviousFocus = document.activeElement;

    var card = document.createElement("div");
    card.className = "vx-lab-modal__card";

    var top = document.createElement("div");
    top.className = "vx-lab-modal__top";

    var icon = document.createElement("div");
    icon.className = "vx-lab-modal__icon";
    if (options.iconSrc) {
      icon.className += " vx-lab-modal__icon--image";
      var iconImg = document.createElement("img");
      iconImg.src = options.iconSrc;
      iconImg.alt = "";
      iconImg.setAttribute("aria-hidden", "true");
      iconImg.loading = "eager";
      iconImg.decoding = "async";
      icon.appendChild(iconImg);
    } else {
      icon.textContent = options.icon || "V";
    }

    var title = document.createElement("h2");
    title.id = modalId + "Title";
    title.className = "vx-lab-modal__title";
    title.textContent = options.title || "VOLYNX Lab";

    var body = document.createElement("div");
    body.id = modalId + "Body";
    body.className = "vx-lab-modal__body";
    modalParagraphs(options.message || "").forEach(function (part) {
      var p = document.createElement("p");
      p.textContent = part;
      body.appendChild(p);
    });
    if (body.childNodes.length) root.setAttribute("aria-describedby", body.id);

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

    var showCancel = options.showCancel !== false && !options.hideCancel;
    if (showCancel) {
      actions.appendChild(cancel);
    } else {
      actions.className += " vx-lab-modal__actions--single";
    }
    actions.appendChild(primary);
    top.appendChild(icon);
    top.appendChild(title);
    card.appendChild(top);
    card.appendChild(body);
    card.appendChild(actions);
    root.appendChild(card);
    root.addEventListener("click", function (event) {
      if (event.target !== root) return;
      if (showCancel) cancel.click();
      else {
        track("lab", "modal_dismiss", { title: options.title || "VOLYNX Lab" });
        closeModal(root);
      }
    });
    root._vxKeyHandler = function (event) {
      if (event.key === "Escape") {
        if (showCancel) cancel.click();
        else closeModal(root);
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = showCancel ? [cancel, primary] : [primary];
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", root._vxKeyHandler);
    document.body.appendChild(root);
    primary.focus({ preventScroll: true });
    return true;
  }

  function confirmLogin(nextPath, message) {
    var text = localizedModalOption(message, "modal.login.message");
    track("lab", "login_modal_open", { next: nextPath || currentReturnPath() });
    if (!openModal({
      iconSrc: "/assets/login-portal.webp",
      experience: "login",
      title: modalText("modal.login.title"),
      message: text,
      primaryLabel: modalText("modal.action.sign_in"),
      cancelLabel: modalText("modal.action.stay_here"),
      onConfirm: function () { goLogin(nextPath); },
    }) && window.confirm(text)) {
      goLogin(nextPath);
    }
  }

  function confirmUpgrade(message, href) {
    var text = localizedModalOption(message, "modal.upgrade.message");
    var target = href || "/pricing/";
    track("lab", "upgrade_modal_open", { href: target });
    if (!openModal({
      iconSrc: "/assets/modal-upgrade.webp",
      experience: "upgrade",
      title: modalText("modal.upgrade.title"),
      message: text,
      primaryLabel: modalText("modal.action.upgrade"),
      cancelLabel: modalText("modal.action.not_now"),
      onConfirm: function () { window.location.href = target; },
    }) && window.confirm(text)) {
      window.location.href = target;
    }
  }

  function confirmVxSpend(options) {
    var config = options || {};
    var cost = Number(config.cost || config.tokens || 0);
    var text = localizedModalOption(config.message, "modal.vx.message", { cost: cost });
    var title = localizedModalOption(config.title, "modal.vx.title");
    track(config.tool || "lab", "vx_confirm_open", {
      action: config.action || "premium_action",
      cost: cost,
    });
    return new Promise(function (resolve) {
      if (!openModal({
        iconSrc: "/assets/modal-confirm.webp",
        experience: "confirm",
        title: title,
        message: text + "\n\n" + modalText("modal.vx.cost", { cost: cost }),
        primaryLabel: modalLanguage() === "pt" ? modalText("modal.vx.primary", { cost: cost }) : (config.primaryLabel || modalText("modal.vx.primary", { cost: cost })),
        cancelLabel: modalLanguage() === "pt" ? modalText("modal.action.not_now") : (config.cancelLabel || modalText("modal.action.not_now")),
        onConfirm: function () { resolve(true); },
        onCancel: function () { resolve(false); },
      })) {
        resolve(window.confirm(text + "\n\n" + modalText("modal.vx.cost", { cost: cost })));
      }
    });
  }

  async function spendVxAction(options) {
    var config = options || {};
    var cost = Number(config.tokens || config.cost || 0);
    var tool = config.tool || "lab";
    var actionClass = config.actionClass || "pro";
    if (!hasAccessToken()) {
      confirmLogin(
        config.nextPath || currentReturnPath(),
        config.loginMessage || ("Sign in to use " + cost + " VX for this action. You will return here after login.")
      );
      return { ok: false, error: "not_authenticated" };
    }
    if (!window.VxTokens || typeof window.VxTokens.spend !== "function") {
      return { ok: false, error: "vx_not_ready" };
    }
    var accepted = await confirmVxSpend({
      tool: tool,
      action: config.action || actionClass,
      cost: cost,
      title: config.title,
      message: config.message,
      primaryLabel: config.primaryLabel,
      cancelLabel: config.cancelLabel,
    });
    if (!accepted) return { ok: false, error: "cancelled" };
    var result = await window.VxTokens.spend(tool, actionClass, {
      tokens: cost,
      description: config.description,
    });
    if (result && result.ok) {
      try {
        window.dispatchEvent(new CustomEvent("vx:balance-changed", { detail: { balance: result.balance } }));
      } catch (_) {}
      track(tool, "vx_spend_success", {
        action: config.action || actionClass,
        cost: result.spent || cost,
        balance: result.balance,
      });
    } else {
      track(tool, "vx_spend_failed", {
        action: config.action || actionClass,
        cost: cost,
        error: result && result.error ? result.error : "unknown",
      });
    }
    return result || { ok: false, error: "unknown" };
  }

  function notify(options) {
    var config = typeof options === "string" ? { message: options } : (options || {});
    var noticeText = [config.tone, config.event, config.icon, config.title].join(" ").toLowerCase();
    var experience = config.experience || (/success|complete|done|ready|saved/.test(noticeText) ? "success" : (/error|fail|invalid|unavailable/.test(noticeText) ? "error" : "warning"));
    var iconSrc = config.iconSrc || (experience === "success" ? "/assets/modal-success.webp" : "/assets/modal-warning.webp");
    var defaultTitle = experience === "error" ? modalText("modal.error.title") : (experience === "warning" ? modalText("modal.warning.title") : modalText("modal.notice.title"));
    track(config.tool || "lab", config.event || "notice_open", { title: config.title || "VOLYNX Lab" });
    return openModal({
      iconSrc: iconSrc,
      experience: experience,
      title: config.title || defaultTitle,
      message: config.message || "",
      primaryLabel: config.primaryLabel || modalText("modal.action.close"),
      cancelLabel: config.cancelLabel || modalText("modal.action.close"),
      hideCancel: config.showCancel !== true,
      onConfirm: config.onConfirm,
      onCancel: config.onCancel,
    });
  }

  function notifySuccess(options) {
    var config = options || {};
    var kind = /^(download|export|save)$/.test(config.kind || "") ? config.kind : "download";
    return notify(Object.assign({}, config, {
      tone: "success",
      experience: "success",
      event: config.event || kind + "_success",
      title: config.title || modalText("modal.success." + kind + "_title"),
      message: config.message || modalText("modal.success." + kind + "_message"),
      primaryLabel: config.primaryLabel || modalText("modal.action.done")
    }));
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
      "image-suite": "iMage Suite",
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

  function qrProjectSummary(project) {
    var state = project && project.state ? project.state : {};
    var mode = state.type === "dynamic" ? "Dynamic" : "Static";
    var target = state.type === "dynamic" ? state.dynamicTarget : state.content;
    var style = state.colorMode ? String(state.colorMode).replace(/-/g, " ") : "";
    return [mode, target || "", style].filter(Boolean).join(" · ");
  }

  function luminaSummary(item) {
    return [item && item.mode, item && item.language, item && item.source].filter(Boolean).join(" · ") || "Saved Lumina response";
  }

  function memoryItems() {
    var rows = [];
    readJson(PRESETS_KEY, []).forEach(function (item) {
      if (!item || !item.id) return;
      rows.push({
        id: item.id,
        key: "preset:" + item.id,
        kind: "preset",
        group: "presets",
        title: item.label || toolLabel(item.tool) + " preset",
        detail: presetSummary(item.tool, item.values) || "Reusable settings",
        meta: toolLabel(item.tool),
        path: presetRestorePath(item),
        pinned: Boolean(item.pinned),
        ts: item.ts,
      });
    });
    readJson(QRGEN_PROJECTS_KEY, []).forEach(function (item) {
      if (!item || !item.id) return;
      rows.push({
        id: item.id,
        key: "qr-project:" + item.id,
        kind: "qr-project",
        group: "projects",
        title: item.name || "QR project",
        detail: qrProjectSummary(item) || "Saved QRGen draft",
        meta: "QRGen",
        path: qrProjectRestorePath(item),
        pinned: Boolean(item.pinned),
        ts: item.updated_at || item.created_at,
      });
    });
    readJson(LUMINA_HISTORY_KEY, []).forEach(function (item) {
      if (!item || !item.id) return;
      rows.push({
        id: item.id,
        key: "lumina-response:" + item.id,
        kind: "lumina-response",
        group: "responses",
        title: item.title || "Lumina response",
        detail: luminaSummary(item),
        meta: "Lumina",
        path: luminaHistoryRestorePath(item),
        pinned: Boolean(item.pinned),
        ts: item.ts || item.updated_at || item.created_at,
      });
    });
    return rows.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return timestampValue(b.ts) - timestampValue(a.ts);
    });
  }

  function memoryStorage(kind) {
    if (kind === "preset") return { key: PRESETS_KEY, cloudKind: "", table: "lab_presets" };
    if (kind === "qr-project") return { key: QRGEN_PROJECTS_KEY, cloudKind: "qr-project", table: "" };
    return { key: LUMINA_HISTORY_KEY, cloudKind: "lumina-response", table: "" };
  }

  function updateMemoryItem(kind, id, changes) {
    var storage = memoryStorage(kind);
    var rows = readJson(storage.key, []);
    var updated = null;
    rows = rows.map(function (item) {
      if (!item || String(item.id) !== String(id)) return item;
      var now = new Date().toISOString();
      updated = Object.assign({}, item, changes || {});
      if (kind === "qr-project") {
        updated.updated_at = now;
        if (updated.state && updated.name) updated.state = Object.assign({}, updated.state, { projectName: updated.name });
      } else {
        updated.ts = now;
        updated.updated_at = now;
      }
      return updated;
    });
    if (!updated) return false;
    writeJson(storage.key, rows);
    if (storage.table) upsertRows(storage.table, [toPresetRow(updated)]);
    else syncArtifact(storage.cloudKind, updated);
    return true;
  }

  function removeMemoryItem(kind, id) {
    var storage = memoryStorage(kind);
    var rows = readJson(storage.key, []);
    var filtered = rows.filter(function (item) { return !item || String(item.id) !== String(id); });
    if (filtered.length === rows.length) return false;
    writeJson(storage.key, filtered);
    if (storage.table) deleteCloudRow(storage.table, id);
    else deleteArtifact(storage.cloudKind, id);
    return true;
  }

  function setMemoryStatus(root, text) {
    var status = root.querySelector("[data-lab-memory-status]");
    if (!status) return;
    status.textContent = text || "";
    if (text) window.setTimeout(function () {
      if (status.textContent === text) status.textContent = "";
    }, 3200);
  }

  function memoryNameInput(root, key) {
    var inputs = root.querySelectorAll("[data-lab-memory-name]");
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].getAttribute("data-lab-memory-name") === key) return inputs[i];
    }
    return null;
  }

  function memoryActionButton(root, actionName, key) {
    var buttons = root.querySelectorAll("[data-lab-memory-action]");
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute("data-lab-memory-action") === actionName
        && buttons[i].getAttribute("data-memory-key") === key) return buttons[i];
    }
    return null;
  }

  function renderMemoryManager(root) {
    var list = root.querySelector("[data-lab-memory-list]");
    if (!list) return;
    var query = memoryManagerState.query.toLowerCase();
    var rows = memoryItems().filter(function (item) {
      var matchesFilter = memoryManagerState.filter === "all"
        || (memoryManagerState.filter === "pinned" && item.pinned)
        || memoryManagerState.filter === item.group;
      var haystack = [item.title, item.detail, item.meta].join(" ").toLowerCase();
      return matchesFilter && (!query || haystack.indexOf(query) !== -1);
    });
    list.innerHTML = rows.length ? rows.map(function (item) {
      var editing = memoryManagerState.editing === item.key;
      var title = editing
        ? '<span class="lab-memory-row__editor"><input data-lab-memory-name="' + escapeHtml(item.key) + '" value="' + escapeHtml(item.title) + '" maxlength="80"><button type="button" class="lab-memory-row__action" data-lab-memory-action="save" data-memory-key="' + escapeHtml(item.key) + '">Save</button><button type="button" class="lab-memory-row__action" data-lab-memory-action="cancel">Cancel</button></span>'
        : '<a class="lab-memory-row__main" href="' + escapeHtml(item.path) + '"><span class="lab-memory-row__title">' + escapeHtml(item.title) + '</span><span class="lab-memory-row__detail">' + escapeHtml(item.detail) + '</span><span class="lab-memory-row__meta">' + escapeHtml(item.meta + " · " + formatTime(item.ts)) + '</span></a>';
      return '<div class="lab-memory-row" data-memory-key="' + escapeHtml(item.key) + '">'
        + '<button type="button" class="lab-memory-row__pin' + (item.pinned ? " is-active" : "") + '" data-lab-memory-action="pin" data-memory-key="' + escapeHtml(item.key) + '" aria-label="' + (item.pinned ? "Unpin " : "Pin ") + escapeHtml(item.title) + '" title="' + (item.pinned ? "Unpin" : "Pin") + '">★</button>'
        + title
        + '<span class="lab-memory-row__actions"><button type="button" class="lab-memory-row__action" data-lab-memory-action="rename" data-memory-key="' + escapeHtml(item.key) + '">Rename</button><button type="button" class="lab-memory-row__action" data-lab-memory-action="delete" data-memory-key="' + escapeHtml(item.key) + '">Delete</button></span>'
        + '</div>';
    }).join("") : '<p class="lab-memory-empty">No saved work matches this view.</p>';

    root.querySelectorAll("[data-lab-memory-filter]").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-lab-memory-filter") === memoryManagerState.filter);
    });
    if (memoryManagerState.editing) {
      var input = memoryNameInput(root, memoryManagerState.editing);
      if (input) {
        input.focus({ preventScroll: true });
        input.select();
      }
    }
  }

  function bindMemoryManager(root) {
    if (root._vxMemoryBound) return;
    root._vxMemoryBound = true;
    var search = root.querySelector("[data-lab-memory-search]");
    if (search) search.addEventListener("input", function () {
      memoryManagerState.query = String(search.value || "").trim();
      renderMemoryManager(root);
    });
    root.addEventListener("click", function (event) {
      var filter = event.target.closest("[data-lab-memory-filter]");
      if (filter) {
        memoryManagerState.filter = filter.getAttribute("data-lab-memory-filter") || "all";
        renderMemoryManager(root);
        return;
      }
      var action = event.target.closest("[data-lab-memory-action]");
      if (!action) return;
      var actionName = action.getAttribute("data-lab-memory-action");
      var key = action.getAttribute("data-memory-key") || memoryManagerState.editing;
      if (actionName === "cancel") {
        memoryManagerState.editing = "";
        renderMemoryManager(root);
        return;
      }
      if (!key) return;
      var separator = key.indexOf(":");
      var kind = key.slice(0, separator);
      var id = key.slice(separator + 1);
      var item = memoryItems().find(function (row) { return row.key === key; });
      if (!item) return;
      if (actionName === "rename") {
        memoryManagerState.editing = key;
        renderMemoryManager(root);
      } else if (actionName === "save") {
        var input = memoryNameInput(root, key);
        var name = input ? String(input.value || "").trim() : "";
        if (!name) return setMemoryStatus(root, "Add a name before saving.");
        updateMemoryItem(kind, id, kind === "preset" ? { label: name } : (kind === "qr-project" ? { name: name } : { title: name }));
        memoryManagerState.editing = "";
        renderProfilePanel(root, { skipCloud: true });
        setMemoryStatus(root, "Name updated.");
      } else if (actionName === "pin") {
        updateMemoryItem(kind, id, { pinned: !item.pinned });
        renderProfilePanel(root, { skipCloud: true });
        setMemoryStatus(root, item.pinned ? "Removed from pinned." : "Pinned for quick access.");
      } else if (actionName === "delete") {
        openModal({
          iconSrc: "/assets/modal-warning.webp",
          experience: "warning",
          title: modalText("modal.delete.title"),
          message: modalText("modal.delete.message", { name: item.title }),
          primaryLabel: modalText("modal.action.delete"),
          cancelLabel: modalText("modal.action.keep"),
          onConfirm: function () {
            removeMemoryItem(kind, id);
            renderProfilePanel(root, { skipCloud: true });
            setMemoryStatus(root, "Saved work deleted.");
          },
        });
      }
    });
    root.addEventListener("keydown", function (event) {
      if (!event.target || !event.target.hasAttribute("data-lab-memory-name")) return;
      if (event.key === "Escape") {
        memoryManagerState.editing = "";
        renderMemoryManager(root);
      } else if (event.key === "Enter") {
        event.preventDefault();
        var key = event.target.getAttribute("data-lab-memory-name");
        var save = memoryActionButton(root, "save", key);
        if (save) save.click();
      }
    });
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

    var candidates = [];
    var history = readJson(HISTORY_KEY, []);
    for (var i = 0; i < history.length; i++) {
      var item = history[i] || {};
      var path = safePath(item.path);
      if (!isSafeRelativePath(path) || !isUsefulLabPath(path) || isPassiveAction(item.action)) continue;
      candidates.push({
        path: path,
        label: "Continue " + toolLabel(item.tool),
        source: "history",
        item: item,
        ts: timestampValue(item.ts),
        specificity: 0,
      });
    }

    var presets = readJson(PRESETS_KEY, []);
    var qrProjects = readJson(QRGEN_PROJECTS_KEY, []);
    for (var q = 0; q < qrProjects.length; q++) {
      var project = qrProjects[q] || {};
      candidates.push({
        path: qrProjectRestorePath(project),
        label: "Continue QRGen",
        source: "qr-project",
        item: project,
        ts: timestampValue(project.updated_at || project.created_at),
        specificity: 2,
      });
    }

    var luminaHistory = readJson(LUMINA_HISTORY_KEY, []);
    for (var l = 0; l < luminaHistory.length; l++) {
      var response = luminaHistory[l] || {};
      candidates.push({
        path: luminaHistoryRestorePath(response),
        label: "Continue Lumina response",
        source: "lumina-history",
        item: response,
        ts: timestampValue(response.ts),
        specificity: 2,
      });
    }

    for (var j = 0; j < presets.length; j++) {
      var preset = presets[j] || {};
      var presetPath = safePath(preset.path);
      if (!isSafeRelativePath(presetPath) || !isUsefulLabPath(presetPath)) continue;
      candidates.push({
        path: presetRestorePath(preset),
        label: "Continue " + toolLabel(preset.tool),
        source: "preset",
        item: preset,
        ts: timestampValue(preset.ts),
        specificity: 1,
      });
    }

    if (candidates.length) {
      candidates.sort(function (a, b) {
        var distance = Math.abs(b.ts - a.ts);
        if (distance < 10000 && b.specificity !== a.specificity) return b.specificity - a.specificity;
        return b.ts - a.ts;
      });
      return candidates[0];
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
    var qrProjects = readJson(QRGEN_PROJECTS_KEY, []);
    var luminaHistory = readJson(LUMINA_HISTORY_KEY, []);
    var summaryEl = root.querySelector("[data-lab-summary]");
    var historyEl = root.querySelector("[data-lab-history]");
    var presetsEl = root.querySelector("[data-lab-presets]");
    var qrProjectsEl = root.querySelector("[data-qr-projects]");
    var luminaResponsesEl = root.querySelector("[data-lumina-responses]");
    var continueTarget = getContinueTarget({ allowPending: false });

    if (summaryEl) {
      var usefulHistory = history.filter(function (item) {
        return item && !isPassiveAction(item.action) && isUsefulLabPath(safePath(item.path));
      });
      var qrProjectActivity = qrProjects.map(function (item) {
        return { tool: "qr-gen", ts: item.updated_at || item.created_at || "", path: "/qrgen/" };
      });
      var latest = usefulHistory[0] || history[0] || presets[0] || qrProjectActivity[0] || null;
      var latestLabel = latest ? toolLabel(latest.tool) : "Lab";
      var latestDetail = latest && latest.ts ? formatTime(latest.ts) : "Ready when you are";
      var continuePath = isSafeRelativePath(continueTarget.path) ? continueTarget.path : "/volynx-lab/";
      summaryEl.innerHTML = [
        renderSummaryCard("Last workspace", latestLabel, latestDetail),
        renderSummaryCard("Recent actions", String(history.length), plural(history.length, "recorded action", "recorded actions")),
        renderSummaryCard("Saved presets", String(presets.length), plural(presets.length, "reusable recipe", "reusable recipes")),
        renderSummaryCard("QR projects", String(qrProjects.length), plural(qrProjects.length, "saved draft", "saved drafts")),
        renderSummaryCard("Lumina responses", String(luminaHistory.length), plural(luminaHistory.length, "saved response", "saved responses")),
        renderSummaryCard("Tools touched", String(uniqueToolCount(history.concat(presets).concat(qrProjectActivity))), "across VOLYNX Lab"),
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
            return '<a class="lab-profile-row" href="' + escapeHtml(presetRestorePath(item)) + '"><strong>' + escapeHtml(toolLabel(item.tool)) + '</strong><span>' + escapeHtml(summary) + '</span><em>' + escapeHtml(formatTime(item.ts)) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No saved presets yet.</p>';
    }

    if (qrProjectsEl) {
      qrProjectsEl.innerHTML = qrProjects.length
        ? qrProjects.slice(0, 5).map(function (item) {
            return '<a class="lab-profile-row" href="' + escapeHtml(qrProjectRestorePath(item)) + '"><strong>' + escapeHtml(item.name || "QR project") + '</strong><span>' + escapeHtml(qrProjectSummary(item) || "Saved QRGen draft") + '</span><em>' + escapeHtml(formatTime(item.updated_at || item.created_at)) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No saved QRGen projects yet.</p>';
    }

    if (luminaResponsesEl) {
      luminaResponsesEl.innerHTML = luminaHistory.length
        ? luminaHistory.slice(0, 5).map(function (item) {
            return '<a class="lab-profile-row" href="' + escapeHtml(luminaHistoryRestorePath(item)) + '"><strong>' + escapeHtml(item.title || "Lumina response") + '</strong><span>' + escapeHtml(luminaSummary(item)) + '</span><em>' + escapeHtml(formatTime(item.ts || item.updated_at || item.created_at)) + '</em></a>';
          }).join("")
        : '<p class="lab-profile-empty">No saved Lumina responses yet.</p>';
    }

    bindMemoryManager(root);
    renderMemoryManager(root);

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
    confirmVxSpend: confirmVxSpend,
    spendVxAction: spendVxAction,
    notify: notify,
    notifySuccess: notifySuccess,
    modalText: modalText,
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
    syncArtifact: syncArtifact,
    deleteArtifact: deleteArtifact,
    clearQueryParam: clearQueryParam,
    restorePresetFromUrl: restorePresetFromUrl,
  };
  if (document.documentElement) {
    document.documentElement.dataset.vxLab = "ready";
    document.documentElement.dataset.vxLabModalSystem = "20260621";
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
