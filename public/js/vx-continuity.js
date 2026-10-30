/*! vx-continuity.js - local-first, account-backed product continuity. */
(function () {
  'use strict';

  var STORAGE_KEY = 'volynx_continuity_v1';
  var ACCESS_TOKEN_KEY = 'volynx_access_token';
  var MAX_LOCAL_ITEMS = 20;
  var TRUSTED_ORIGINS = ['https://volynx.world', 'https://cvitae.volynx.world', 'https://daily.volynx.world'];
  var ALLOWED_STATUSES = ['active', 'draft', 'in_progress', 'completed', 'published', 'paused'];
  var configPromise = null;
  var syncPromise = null;

  var ROUTES = [
    { test: /^\/builder\//, surface: 'builder', title: ['Builder workspace', 'Workspace do Builder'], detail: ['Continue editing your site project.', 'Continue editando seu projeto de site.'], action: ['Open Builder', 'Abrir Builder'] },
    { test: /^\/cvitae\//, surface: 'cvitae', title: ['CVitae', 'CVitae'], detail: ['Continue your CV workspace.', 'Continue seu curriculo.'], action: ['Open CVitae', 'Abrir CVitae'] },
    { test: /^\/qrgen\//, surface: 'qrgen', title: ['QRGen workspace', 'Workspace do QRGen'], detail: ['Continue your QR design or campaign.', 'Continue seu design ou campanha de QR.'], action: ['Open QRGen', 'Abrir QRGen'] },
    { test: /^\/volynx-lab\/converter\//, surface: 'lab-converter', title: ['Converter', 'Converter'], detail: ['Resume your conversion workflow.', 'Retome seu fluxo de conversao.'], action: ['Open tool', 'Abrir ferramenta'] },
    { test: /^\/volynx-lab\/image-scaler\//, surface: 'lab-image-scaler', title: ['Image Scaler', 'Image Scaler'], detail: ['Resume your image enhancement workflow.', 'Retome seu fluxo de aprimoramento de imagem.'], action: ['Open tool', 'Abrir ferramenta'] },
    { test: /^\/volynx-lab\/image-suite\//, surface: 'lab-image-suite', title: ['Image Suite', 'Image Suite'], detail: ['Resume your image workspace.', 'Retome seu workspace de imagens.'], action: ['Open tool', 'Abrir ferramenta'] },
    { test: /^\/volynx-lab\/lumina\//, surface: 'lab-lumina', title: ['Lumina', 'Lumina'], detail: ['Continue your visual generation workflow.', 'Continue seu fluxo de geracao visual.'], action: ['Open tool', 'Abrir ferramenta'] },
    { test: /^\/volynx-lab\//, surface: 'volynx-lab', title: ['VOLYNX Lab', 'VOLYNX Lab'], detail: ['Return to your creative tool stack.', 'Volte para seu conjunto de ferramentas criativas.'], action: ['Open Lab', 'Abrir Lab'] },
    { test: /^\/dev-journey\/checklist\//, surface: 'dev-journey', resourceKey: 'checklist', title: ['Dev Journey checklist', 'Checklist do Dev Journey'], detail: ['Continue your learning checklist.', 'Continue seu checklist de aprendizado.'], action: ['Continue checklist', 'Continuar checklist'] },
    { test: /^\/dev-journey\/submit\//, surface: 'dev-journey', resourceKey: 'submission', title: ['Dev Journey submission', 'Envio do Dev Journey'], detail: ['Finish and submit your project.', 'Finalize e envie seu projeto.'], action: ['Open submission', 'Abrir envio'] },
    { test: /^\/dev-journey\/student\//, surface: 'dev-journey', resourceKey: 'lessons', title: ['Dev Journey', 'Dev Journey'], detail: ['Continue your current learning path.', 'Continue sua trilha de aprendizado.'], action: ['Continue learning', 'Continuar aprendendo'] },
    { test: /^\/dashboard\/propertyflow\//, surface: 'propertyflow', title: ['PropertyFlow Studio', 'PropertyFlow Studio'], detail: ['Continue managing your property workspace.', 'Continue gerenciando seu workspace imobiliario.'], action: ['Open workspace', 'Abrir workspace'] },
    { test: /^\/dashboard\/purchases\//, surface: 'deliveries', title: ['Product delivery', 'Entrega de produto'], detail: ['Return to your purchased product.', 'Volte para seu produto adquirido.'], action: ['Open delivery', 'Abrir entrega'] },
    { test: /^\/delivery\//, surface: 'deliveries', title: ['My products', 'Meus produtos'], detail: ['Review access, downloads and next steps.', 'Veja acessos, downloads e proximos passos.'], action: ['Open products', 'Abrir produtos'] }
  ];

  function languageIndex() {
    try {
      return String(localStorage.getItem('volynx_lang') || document.documentElement.lang || 'en').toLowerCase().startsWith('pt') ? 1 : 0;
    } catch (_) {
      return 0;
    }
  }

  function safePath(value) {
    if (typeof value !== 'string') return '';
    var candidate = value.trim();
    if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '';
    try {
      var url = new URL(candidate, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return '';
    }
  }

  function safeText(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max);
  }

  function safeOrigin(value) {
    var origin = safeText(value || window.location.origin, 120).replace(/\/$/, '');
    if (TRUSTED_ORIGINS.indexOf(origin) >= 0) return origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    return window.location.origin;
  }

  function safeKey(value, fallback) {
    var key = safeText(value, 128).replace(/[^A-Za-z0-9_.:-]/g, '-').replace(/^-+|-+$/g, '');
    return key || fallback;
  }

  function safeMetadata(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    try {
      var json = JSON.stringify(value);
      if (json.length > 4000) return {};
      return JSON.parse(json);
    } catch (_) {
      return {};
    }
  }

  function readTokenClaims(token) {
    try {
      var encoded = token.split('.')[1];
      if (!encoded) return null;
      encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (encoded.length % 4) encoded += '=';
      return JSON.parse(atob(encoded));
    } catch (_) {
      return null;
    }
  }

  function authContext() {
    var token = '';
    try { token = localStorage.getItem(ACCESS_TOKEN_KEY) || ''; } catch (_) {}
    var claims = readTokenClaims(token);
    if (!claims || !claims.sub || !claims.exp || claims.exp * 1000 <= Date.now() + 30000) return null;
    return { token: token, userId: String(claims.sub) };
  }

  function readLocal() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocal(rows) {
    var sorted = rows.slice().sort(function (a, b) {
      return new Date(b.last_opened_at || 0).getTime() - new Date(a.last_opened_at || 0).getTime();
    }).slice(0, MAX_LOCAL_ITEMS);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted)); } catch (_) {}
    return sorted;
  }

  function normalizeEntry(input) {
    input = input || {};
    var surface = safeKey(input.surface, '').toLowerCase();
    var title = safeText(input.title, 160);
    var path = safePath(input.path || (window.location.pathname + window.location.search + window.location.hash));
    if (!surface || !title || !path) return null;
    var numericProgress = input.progress == null ? null : Number(input.progress);
    var progress = Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, Math.round(numericProgress))) : null;
    var status = ALLOWED_STATUSES.indexOf(input.status) >= 0 ? input.status : 'active';
    return {
      surface: surface,
      resource_key: safeKey(input.resourceKey || input.resource_key, 'workspace'),
      title: title,
      detail: safeText(input.detail, 320) || null,
      origin: safeOrigin(input.origin),
      path: path,
      action_label: safeText(input.actionLabel || input.action_label, 48) || 'Continue',
      status: status,
      progress: progress,
      metadata: safeMetadata(input.metadata),
      last_opened_at: input.lastOpenedAt || input.last_opened_at || new Date().toISOString(),
      owner_id: safeText(input.ownerId || input.owner_id, 64) || null,
      _dirty: true
    };
  }

  function localIdentity(row) {
    return row.surface + ':' + row.resource_key;
  }

  function record(input) {
    var entry = normalizeEntry(input);
    if (!entry) return null;
    var auth = authContext();
    if (auth) entry.owner_id = auth.userId;
    var rows = readLocal();
    var identity = localIdentity(entry);
    var index = rows.findIndex(function (row) {
      if (localIdentity(row) !== identity) return false;
      if (!entry.owner_id) return !row.owner_id;
      return !row.owner_id || row.owner_id === entry.owner_id;
    });
    if (index >= 0) rows[index] = Object.assign({}, rows[index], entry);
    else rows.unshift(entry);
    writeLocal(rows);
    window.dispatchEvent(new CustomEvent('volynx:continuity-updated', { detail: entry }));
    if (auth) sync();
    return entry;
  }

  function list() {
    var auth = authContext();
    return readLocal().filter(function (row) {
      return auth ? (!row.owner_id || row.owner_id === auth.userId) : !row.owner_id;
    });
  }

  function remove(surface, resourceKey) {
    var normalizedSurface = safeKey(surface, '').toLowerCase();
    var normalizedResource = safeKey(resourceKey, '');
    if (!normalizedSurface || !normalizedResource) return Promise.resolve(false);
    var auth = authContext();
    writeLocal(readLocal().filter(function (row) {
      if (row.surface !== normalizedSurface || row.resource_key !== normalizedResource) return true;
      return auth ? row.owner_id && row.owner_id !== auth.userId : !!row.owner_id;
    }));
    if (!auth) return Promise.resolve(true);
    return getConfig().then(function (config) {
      if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('continuity_config_incomplete');
      var query = '?surface=eq.' + encodeURIComponent(normalizedSurface) + '&resource_key=eq.' + encodeURIComponent(normalizedResource);
      return fetch(config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/user_continuity' + query, {
        method: 'DELETE',
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: 'Bearer ' + auth.token
        }
      });
    }).then(function (response) {
      return response.ok;
    }).catch(function () {
      return false;
    });
  }

  function getConfig() {
    if (!configPromise) {
      configPromise = fetch('/config.json', { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('continuity_config_unavailable');
        return response.json();
      });
    }
    return configPromise;
  }

  function sync() {
    if (syncPromise) return syncPromise;
    var auth = authContext();
    if (!auth) return Promise.resolve(false);
    var candidates = readLocal().filter(function (row) {
      return row._dirty === true && (!row.owner_id || row.owner_id === auth.userId);
    });
    var newestByIdentity = new Map();
    candidates.forEach(function (row) {
      var key = localIdentity(row);
      var current = newestByIdentity.get(key);
      if (!current || new Date(row.last_opened_at).getTime() > new Date(current.last_opened_at).getTime()) newestByIdentity.set(key, row);
    });
    var rows = Array.from(newestByIdentity.values());
    if (!rows.length) return Promise.resolve(true);

    syncPromise = getConfig().then(function (config) {
      if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('continuity_config_incomplete');
      var payload = rows.map(function (row) {
        return {
          user_id: auth.userId,
          surface: row.surface,
          resource_key: row.resource_key,
          title: row.title,
          detail: row.detail,
          origin: TRUSTED_ORIGINS.indexOf(row.origin) >= 0 ? row.origin : 'https://volynx.world',
          path: row.path,
          action_label: row.action_label,
          status: row.status,
          progress: row.progress,
          metadata: row.metadata,
          last_opened_at: row.last_opened_at
        };
      });
      return fetch(config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/user_continuity?on_conflict=user_id,surface,resource_key', {
        method: 'POST',
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: 'Bearer ' + auth.token,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
      });
    }).then(function (response) {
      if (!response.ok) throw new Error('continuity_sync_failed_' + response.status);
      var synced = new Set(rows.map(localIdentity));
      var allRows = readLocal();
      allRows.forEach(function (row) {
        if (synced.has(localIdentity(row)) && (!row.owner_id || row.owner_id === auth.userId)) {
          row.owner_id = auth.userId;
          row._dirty = false;
        }
      });
      writeLocal(allRows);
      return true;
    }).catch(function () {
      return false;
    }).finally(function () {
      syncPromise = null;
    });
    return syncPromise;
  }

  function routeEntry() {
    var path = window.location.pathname;
    if (/^cvitae\.volynx\.world$/i.test(window.location.hostname) && /^\/editor\//.test(path)) {
      var lang = languageIndex();
      return {
        surface: 'cvitae',
        resourceKey: 'workspace',
        title: 'CVitae',
        detail: lang ? 'Continue seu curriculo do ponto em que parou.' : 'Continue your CV from where you left off.',
        origin: 'https://cvitae.volynx.world',
        path: path + window.location.search + window.location.hash,
        actionLabel: lang ? 'Continuar curriculo' : 'Continue CV',
        status: 'in_progress'
      };
    }
    var match = ROUTES.find(function (route) { return route.test.test(path); });
    if (!match) return null;
    var lang = languageIndex();
    return {
      surface: match.surface,
      resourceKey: match.resourceKey || 'workspace',
      title: match.title[lang],
      detail: match.detail[lang],
      path: path + window.location.search + window.location.hash,
      actionLabel: match.action[lang],
      status: 'active'
    };
  }

  window.VxContinuity = {
    record: record,
    list: list,
    remove: remove,
    sync: sync,
    safePath: safePath
  };

  window.addEventListener('volynx:continuity', function (event) {
    if (event && event.detail) record(event.detail);
  });

  function boot() {
    var entry = routeEntry();
    if (entry) record(entry);
    else sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
