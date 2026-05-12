/**
 * vx-admin.js — VOLYNX Platform Admin Mode
 *
 * Activates when the logged-in user is a platform admin. Detection (fast→slow):
 *   1) JWT email matches an allowlist (founder accounts) — zero round-trips
 *   2) JWT app_metadata.is_admin — zero round-trips
 *   3) Supabase REST: profiles?select=is_admin — one fetch, cached 5 min
 *
 * Effects:
 *   • window.VX_IS_ADMIN = true, <html>/<body>.classList += 'vx-admin'
 *   • Topbar pill renders "∞" (MutationObserver)
 *   • Injects a red "ADMIN" badge near the pill (or fixed top-right fallback)
 *   • VxTokens.spend / canAfford → no-op success
 *   • VxGate.require / requireAuth → always allow
 *   • Console banner so you can confirm activation in DevTools
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  // ── Founder allowlist (email-based, defensive) ─────────────────────
  // Any account here is treated as admin even if the JWT hasn't been
  // refreshed since the DB sync. Backend RLS / edge fns are still the
  // real source of truth — this is a UX hint only.
  var ADMIN_EMAIL_ALLOWLIST = [
    'edupelomundo13@gmail.com',
  ];

  var ADMIN_CACHE_KEY = 'volynx_is_admin';
  var ADMIN_CACHE_TS_KEY = 'volynx_is_admin_ts';
  var ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;
  var INF = '∞';
  var LOG_PREFIX = '[vx-admin]';

  function log() {
    try { console.log.apply(console, [LOG_PREFIX].concat([].slice.call(arguments))); } catch (_) {}
  }

  log('script loaded');

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
      if (!res.ok) {
        log('REST fetch failed', res.status);
        return false;
      }
      var rows = await res.json();
      var row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      var isAdmin = !!(row && row.is_admin);
      log('REST result', { isAdmin: isAdmin, row: row });
      return isAdmin;
    } catch (e) {
      log('REST error', e);
      return false;
    }
  }

  function activateAdminMode() {
    if (window.VX_IS_ADMIN) return;
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
      console.log('%c VOLYNX ADMIN ', 'color:#fff;background:#dc2626;padding:4px 10px;border-radius:4px;font-weight:bold;letter-spacing:1px;', 'mode active — gates bypassed, purchases simulated');
    } catch (_) {}
  }

  // ── Force "∞" in #vxTokenCount ──
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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  // ── Inject ADMIN badge — Syne display, gold shimmer, ◆ Black-Diamond glyph ──
  function ensureBadgeStyles() {
    if (document.getElementById('vxAdminBadgeStyles')) return;
    var fontLink = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap';
    if (!document.querySelector('link[data-vx-admin-font]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = fontLink;
      l.setAttribute('data-vx-admin-font', '1');
      document.head.appendChild(l);
    }
    var css = [
      '#vxAdminBadge{',
        'display:inline-flex;align-items:center;gap:6px;',
        'padding:6px 13px 6px 11px;',
        "font-family:'Syne',-apple-system,'Helvetica Neue',sans-serif;",
        'font-weight:800;font-size:10.5px;line-height:1;',
        'letter-spacing:.22em;text-transform:uppercase;',
        'color:transparent;-webkit-background-clip:text;background-clip:text;',
        'background-image:linear-gradient(110deg,#c9a85c 0%,#f3e1a0 30%,#fff7df 50%,#f3e1a0 70%,#c9a85c 100%);',
        'background-size:220% 100%;background-position:0 0;',
        'animation:vxAdminShimmer 4.2s ease-in-out infinite;',
        'border-radius:999px;border:1px solid rgba(201,168,92,.35);',
        // Layered glass + inner gold sheen
        'box-shadow:',
          '0 0 0 1px rgba(0,0,0,.4) inset,',
          '0 1px 0 rgba(255,255,255,.06) inset,',
          '0 8px 24px rgba(201,168,92,.18),',
          '0 0 18px rgba(201,168,92,.22);',
        'cursor:default;user-select:none;flex-shrink:0;',
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
        'background-color:rgba(8,8,12,.72);',
      '}',
      // The ◆ symbol — separate gradient + slow rotate-shimmer
      '#vxAdminBadge::before{',
        'content:"\\25C6";',
        '-webkit-text-fill-color:#f3e1a0;',
        'color:#f3e1a0;',
        'font-size:9px;letter-spacing:0;',
        'text-shadow:0 0 8px rgba(243,225,160,.7),0 0 14px rgba(201,168,92,.45);',
        'animation:vxAdminDiamondPulse 2.6s ease-in-out infinite;',
        'transform-origin:center;',
      '}',
      '#vxAdminBadge.vx-admin-fixed{',
        'position:fixed;top:14px;right:14px;z-index:99999;pointer-events:auto;',
      '}',
      '#vxAdminBadge:not(.vx-admin-fixed){',
        'margin-right:8px;vertical-align:middle;',
      '}',
      '@keyframes vxAdminShimmer{',
        '0%{background-position:0% 0;}',
        '50%{background-position:100% 0;}',
        '100%{background-position:0% 0;}',
      '}',
      '@keyframes vxAdminDiamondPulse{',
        '0%,100%{opacity:.7;transform:scale(1) rotate(0deg);}',
        '50%{opacity:1;transform:scale(1.18) rotate(45deg);}',
      '}',
      '@media (prefers-reduced-motion:reduce){',
        '#vxAdminBadge{animation:none;background-position:50% 0;}',
        '#vxAdminBadge::before{animation:none;opacity:.9;}',
      '}',
    ].join('');
    var style = document.createElement('style');
    style.id = 'vxAdminBadgeStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectAdminBadge() {
    function buildBadge(fixed) {
      var badge = document.createElement('span');
      badge.id = 'vxAdminBadge';
      if (fixed) badge.classList.add('vx-admin-fixed');
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-label', 'Platform admin mode active');
      badge.title = 'Platform admin — all gates bypassed, purchases simulated';
      badge.textContent = 'Admin';
      return badge;
    }

    function inject() {
      ensureBadgeStyles();
      if (document.getElementById('vxAdminBadge')) return;

      var pill = document.getElementById('vxTokenPill') || document.querySelector('.vx-token-pill');
      if (pill && pill.parentNode) {
        pill.parentNode.insertBefore(buildBadge(false), pill);
        log('badge injected next to token pill');
        return;
      }

      if (document.body) {
        document.body.appendChild(buildBadge(true));
        log('badge injected fixed top-right (no pill found)');
      } else {
        setTimeout(inject, 200);
      }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
  }

  function overrideVxTokens() {
    var attempts = 0;
    function patch() {
      if (!window.VxTokens) {
        if (++attempts > 60) return;
        setTimeout(patch, 100);
        return;
      }
      window.VxTokens.spend = function (tool, actionClass) {
        log('spend bypassed', tool, actionClass);
        return Promise.resolve({ ok: true, balance: Infinity, spent: 0, admin_bypass: true });
      };
      window.VxTokens.canAfford = function () {
        return Promise.resolve({ enough: true, balance: Infinity, cost: 0, admin_bypass: true });
      };
      window.VxTokens._adminBypassActive = true;
      log('VxTokens patched');
    }
    patch();
  }

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
      log('VxGate patched');
    }
    patch();
  }

  window.VxAdmin = {
    isAdmin: function () { return !!window.VX_IS_ADMIN; },
    refresh: function () { clearAdminCache(); window.VX_IS_ADMIN = false; return detectAndActivate(); },
    forceOn: function () { activateAdminMode(); writeCachedAdmin(true); },
    forceOff: function () {
      writeCachedAdmin(false);
      window.VX_IS_ADMIN = false;
      var b = document.getElementById('vxAdminBadge');
      if (b && b.parentNode) b.parentNode.removeChild(b);
    },
  };

  async function detectAndActivate() {
    var jwt = getJwt();
    if (!jwt) {
      log('no JWT — user not logged in, admin mode requires auth');
      return false;
    }

    var payload = decodeJwtPayload(jwt);
    var email = payload && payload.email ? String(payload.email).toLowerCase() : '';

    // Path 1 — email allowlist (fastest, JWT-only)
    if (email && ADMIN_EMAIL_ALLOWLIST.indexOf(email) !== -1) {
      log('detected via email allowlist:', email);
      writeCachedAdmin(true);
      activateAdminMode();
      return true;
    }

    // Path 2 — JWT app_metadata.is_admin
    if (payload && payload.app_metadata && payload.app_metadata.is_admin === true) {
      log('detected via JWT app_metadata.is_admin');
      writeCachedAdmin(true);
      activateAdminMode();
      return true;
    }

    // Path 3 — cached
    var cached = readCachedAdmin();
    if (cached === true) {
      log('detected via cache');
      activateAdminMode();
      fetchAdminViaRest(jwt).then(function (fresh) {
        writeCachedAdmin(!!fresh);
        if (!fresh) log('cache stale — admin status revoked, will deactivate next reload');
      });
      return true;
    }
    if (cached === false) {
      log('cached non-admin — re-checking REST anyway since DB may have changed');
    }

    // Path 4 — REST fetch
    var fresh = await fetchAdminViaRest(jwt);
    writeCachedAdmin(!!fresh);
    if (fresh) {
      activateAdminMode();
      return true;
    }
    log('not admin');
    return false;
  }

  detectAndActivate().catch(function (e) { log('detect failed', e); });

  window.addEventListener('storage', function (e) {
    if (e.key === 'volynx_access_token') {
      log('access token changed — re-detecting');
      clearAdminCache();
      window.VX_IS_ADMIN = false;
      var b = document.getElementById('vxAdminBadge');
      if (b && b.parentNode) b.parentNode.removeChild(b);
      detectAndActivate().catch(function () {});
    }
  });
})();
