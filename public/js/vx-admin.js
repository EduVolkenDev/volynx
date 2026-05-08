/**
 * vx-admin.js — VOLYNX Platform Admin Mode
 *
 * For founder/staff with profiles.is_admin=true:
 *   • Sets window.VX_IS_ADMIN = true
 *   • Renders "∞" instead of the real token balance in the topbar pill
 *   • Injects a red "ADMIN" badge into the topbar so the mode is always visible
 *   • Overrides VxTokens.spend / canAfford → no-op success
 *   • Overrides VxGate.require / requireAuth → always allow
 *
 * Detection order (fail-open is safe; backend still enforces is_admin):
 *   1) JWT app_metadata.is_admin (zero round-trips)
 *   2) Supabase REST: profiles?select=is_admin (one fetch, cached for 5min)
 *
 * Load via PageWidgets.astro on every page that includes the topbar.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var ADMIN_CACHE_KEY = 'volynx_is_admin';
  var ADMIN_CACHE_TS_KEY = 'volynx_is_admin_ts';
  var ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;
  var INF = '∞';

  function getJwt() {
    try { return localStorage.getItem('volynx_access_token') || ''; } catch (_) { return ''; }
  }

  function decodeJwtPayload(jwt) {
    try {
      var part = jwt.split('.')[1];
      if (!part) return null;
      var norm = part.replace(/-/g, '+').replace(/_/g, '/');
      norm = norm.padEnd(norm.length + (4 - norm.length % 4) % 4, '=');
      return JSON.parse(atob(norm));
    } catch (_) { return null; }
  }

  function readCachedAdmin() {
    try {
      var ts = parseInt(localStorage.getItem(ADMIN_CACHE_TS_KEY) || '0', 10);
      if (Date.now() - ts > ADMIN_CACHE_TTL_MS) return null;
      var v = localStorage.getItem(ADMIN_CACHE_KEY);
      if (v === null) return null;
      return v === '1';
    } catch (_) { return null; }
  }

  function writeCachedAdmin(isAdmin) {
    try {
      localStorage.setItem(ADMIN_CACHE_KEY, isAdmin ? '1' : '0');
      localStorage.setItem(ADMIN_CACHE_TS_KEY, String(Date.now()));
    } catch (_) {}
  }

  function clearAdminCache() {
    try {
      localStorage.removeItem(ADMIN_CACHE_KEY);
      localStorage.removeItem(ADMIN_CACHE_TS_KEY);
    } catch (_) {}
  }

  // Fallback: fetch profiles.is_admin via Supabase REST.
  async function fetchAdminViaRest(jwt) {
    try {
      var payload = decodeJwtPayload(jwt);
      var uid = payload && payload.sub ? payload.sub : null;
      if (!uid) return false;

      var cfg = await fetch('/config.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; });
      if (!cfg) return false;
      var supaUrl = (cfg.supabaseUrl || cfg.supabase_url || '').replace(/\/$/, '');
      var anonKey = cfg.supabaseAnonKey || cfg.anonKey || '';
      if (!supaUrl || !anonKey) return false;

      var res = await fetch(
        supaUrl + '/rest/v1/profiles?select=is_admin&id=eq.' + encodeURIComponent(uid),
        {
          headers: {
            apikey: anonKey,
            Authorization: 'Bearer ' + jwt,
            Accept: 'application/json',
          },
        }
      );
      if (!res.ok) return false;
      var rows = await res.json();
      var row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      return !!(row && row.is_admin);
    } catch (_) { return false; }
  }

  function activateAdminMode() {
    if (window.VX_IS_ADMIN) return; // already activated
    window.VX_IS_ADMIN = true;

    var html = document.documentElement;
    if (html) html.classList.add('vx-admin');
    function tagBody() {
      if (document.body) document.body.classList.add('vx-admin');
      else setTimeout(tagBody, 50);
    }
    tagBody();

    forceInfinityInPill();
    injectAdminBadge();
    overrideVxTokens();
    overrideVxGate();

    try {
      window.dispatchEvent(new CustomEvent('vx:admin-detected', { detail: { is_admin: true } }));
    } catch (_) {}

    try {
      console.log('%c[VOLYNX] ADMIN MODE ACTIVE — all gates bypassed', 'color:#fff;background:#dc2626;padding:4px 8px;border-radius:4px;font-weight:bold;');
    } catch (_) {}
  }

  // ── Force "∞" inside #vxTokenCount via MutationObserver ──
  function forceInfinityInPill() {
    var observer = null;
    function patch() {
      var el = document.getElementById('vxTokenCount');
      if (!el) return false;
      if (el.textContent !== INF) {
        if (observer) observer.disconnect();
        el.textContent = INF;
        if (observer) observer.observe(el, { childList: true, characterData: true, subtree: true });
      }
      return true;
    }
    function start() {
      var el = document.getElementById('vxTokenCount');
      if (!el) { setTimeout(start, 250); return; }
      observer = new MutationObserver(patch);
      observer.observe(el, { childList: true, characterData: true, subtree: true });
      patch();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  // ── Inject ADMIN badge near the token pill ──
  function injectAdminBadge() {
    function inject() {
      if (document.getElementById('vxAdminBadge')) return;
      var anchor = document.getElementById('vxTokenPill') || document.querySelector('.vx-token-pill') || document.querySelector('header');
      if (!anchor) { setTimeout(inject, 300); return; }

      var badge = document.createElement('span');
      badge.id = 'vxAdminBadge';
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-label', 'Platform admin mode active');
      badge.title = 'Platform admin — all gates bypassed, purchases simulated';
      badge.textContent = 'ADMIN';
      badge.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'padding:4px 9px',
        'margin-right:8px',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-weight:700',
        'font-size:10px',
        'line-height:1',
        'letter-spacing:.1em',
        'color:#fff',
        'background:linear-gradient(135deg,#dc2626 0%,#7f1d1d 100%)',
        'border-radius:999px',
        'border:1px solid rgba(255,255,255,.18)',
        'box-shadow:0 2px 10px rgba(220,38,38,.35),inset 0 1px 0 rgba(255,255,255,.15)',
        'cursor:default',
        'user-select:none',
        'flex-shrink:0',
        'vertical-align:middle',
      ].join(';');

      if (anchor.id === 'vxTokenPill' || anchor.classList.contains('vx-token-pill')) {
        anchor.parentNode && anchor.parentNode.insertBefore(badge, anchor);
      } else {
        anchor.appendChild(badge);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  }

  // ── Override VxTokens — never deduct, never block ──
  function overrideVxTokens() {
    var attempts = 0;
    function patch() {
      if (!window.VxTokens) {
        if (++attempts > 60) return;
        setTimeout(patch, 100);
        return;
      }
      var origSpend = window.VxTokens.spend;
      window.VxTokens.spend = function (tool, actionClass) {
        try { console.debug('[vx-admin] spend bypassed', tool, actionClass); } catch (_) {}
        return Promise.resolve({ ok: true, balance: Infinity, spent: 0, admin_bypass: true });
      };
      window.VxTokens.canAfford = function () {
        return Promise.resolve({ enough: true, balance: Infinity, cost: 0, admin_bypass: true });
      };
      // keep getBalance/cached working so the realtime channel doesn't blow up;
      // the pill is already overridden at the DOM level.
      window.VxTokens._adminBypassActive = true;
      window.VxTokens._origSpend = origSpend;
    }
    patch();
  }

  // ── Override VxGate — every plan check passes ──
  function overrideVxGate() {
    var attempts = 0;
    function patch() {
      if (!window.VxGate) {
        if (++attempts > 60) return;
        setTimeout(patch, 100);
        return;
      }
      window.VxGate.require = function () { return Promise.resolve(true); };
      window.VxGate.requireAuth = function () { return Promise.resolve(true); };
      window.VxGate._adminBypassActive = true;
    }
    patch();
  }

  // ── Public API: explicit re-detect (e.g., after fresh login) ──
  window.VxAdmin = {
    isAdmin: function () { return !!window.VX_IS_ADMIN; },
    refresh: function () {
      clearAdminCache();
      return detectAndActivate();
    },
  };

  async function detectAndActivate() {
    var jwt = getJwt();
    if (!jwt) return false;

    // Path 1: JWT app_metadata
    var payload = decodeJwtPayload(jwt);
    if (payload && payload.app_metadata && payload.app_metadata.is_admin === true) {
      writeCachedAdmin(true);
      activateAdminMode();
      return true;
    }

    // Path 2: cached
    var cached = readCachedAdmin();
    if (cached === true) {
      activateAdminMode();
      // still verify in background to catch revoked admin
      fetchAdminViaRest(jwt).then(function (fresh) { writeCachedAdmin(!!fresh); });
      return true;
    }
    if (cached === false) return false;

    // Path 3: REST fetch
    var fresh = await fetchAdminViaRest(jwt);
    writeCachedAdmin(!!fresh);
    if (fresh) {
      activateAdminMode();
      return true;
    }
    return false;
  }

  // Run as soon as possible
  detectAndActivate().catch(function () {});

  // Re-detect on storage changes (cross-tab login/logout)
  window.addEventListener('storage', function (e) {
    if (e.key === 'volynx_access_token') {
      clearAdminCache();
      window.VX_IS_ADMIN = false;
      detectAndActivate().catch(function () {});
    }
  });
})();
