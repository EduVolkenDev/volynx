/*! vx-auth-bridge.js — shares VOLYNX session across volynx.world subdomains.
 * Writes access_token / refresh_token / email to cookies scoped to ".volynx.world"
 * so localStorage state logged on daily.volynx.world is honored on volynx.world,
 * cvitae.volynx.world, etc. On load: if cookies exist and localStorage is empty,
 * restore localStorage from cookies. On login/logout: call VxAuthBridge.sync()
 * or VxAuthBridge.clear().
 *
 * This script MUST load before any other auth-dependent script.
 */
(function () {
  var KEYS = ['volynx_access_token', 'volynx_refresh_token', 'volynx_user_email'];
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
  var host = (typeof location !== 'undefined' && location.hostname) || '';
  var isProd = /(^|\.)volynx\.world$/.test(host);
  var DOMAIN = isProd ? '; Domain=.volynx.world' : '';
  var SECURE = (typeof location !== 'undefined' && location.protocol === 'https:') ? '; Secure' : '';
  var SAMESITE = '; SameSite=Lax';

  function writeCookie(name, value) {
    if (value == null) return;
    try {
      document.cookie = name + '=' + encodeURIComponent(String(value)) +
        '; Path=/' + DOMAIN + '; Max-Age=' + COOKIE_MAX_AGE + SECURE + SAMESITE;
    } catch (_) {}
  }

  function deleteCookie(name) {
    try {
      document.cookie = name + '=; Path=/' + DOMAIN + '; Max-Age=0' + SECURE + SAMESITE;
    } catch (_) {}
  }

  function readCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (_) { return ''; }
  }

  function sync() {
    KEYS.forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v) writeCookie(k, v);
    });
  }

  function clear() {
    KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (_) {}
      deleteCookie(k);
    });
    try { localStorage.removeItem('volynx_session'); } catch (_) {}
  }

  // Hydrate localStorage from cookies if missing (cross-subdomain restore)
  function hydrate() {
    var hydrated = false;
    KEYS.forEach(function (k) {
      if (localStorage.getItem(k)) return;
      var c = readCookie(k);
      if (c) { try { localStorage.setItem(k, c); hydrated = true; } catch (_) {} }
    });
    // Rebuild minimal volynx_session if we hydrated tokens but session is missing
    if (hydrated && !localStorage.getItem('volynx_session')) {
      var at = localStorage.getItem('volynx_access_token') || '';
      var rt = localStorage.getItem('volynx_refresh_token') || '';
      var em = localStorage.getItem('volynx_user_email') || '';
      if (at || rt) {
        try {
          localStorage.setItem('volynx_session', JSON.stringify({
            access_token: at, refresh_token: rt, user: em ? { email: em } : null
          }));
        } catch (_) {}
      }
    }
    return hydrated;
  }

  hydrate();
  // Mirror any localStorage writes that happened before this script loaded
  sync();

  // Cross-tab sync within the same origin (storage event)
  try {
    window.addEventListener('storage', function (e) {
      if (!e || !e.key || KEYS.indexOf(e.key) === -1) return;
      if (e.newValue) writeCookie(e.key, e.newValue);
      else deleteCookie(e.key);
    });
  } catch (_) {}

  window.VxAuthBridge = { sync: sync, clear: clear, hydrate: hydrate };
})();
