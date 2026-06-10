/**
 * vx-gate.js
 * Client-side route protection for paid features.
 *
 * Usage (in any Astro page):
 *   <script src="/js/vx-plan.js"></script>
 *   <script src="/js/vx-gate.js"></script>
 *   <script>VxGate.require('pro');</script>
 *
 * Or via data attribute on <body>:
 *   <body data-vx-require-plan="pro">
 *
 * Flow:
 *   1. Check localStorage for auth token → redirect to /login/ if missing
 *   2. Check cached plan → if valid and sufficient, allow
 *   3. Fetch fresh plan from API → cache and check
 *   4. If insufficient plan → redirect to /pricing/ with upgrade message
 */
window.VxGate = (function () {
  'use strict';

  var LOGIN_URL = '/login/';
  var PRICING_URL = '/pricing/';

  function getAccessToken() {
    return localStorage.getItem('volynx_access_token') || '';
  }

  function currentPath() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  /**
   * Require a minimum plan to access the current page.
   * @param {string} minimumPlan - 'launch'|'pro'|'diamond'|'studio'|'teams'
   * @param {object} [opts] - { product?: 'daily'|'volynx', redirectUrl?: string }
   */
  async function require(minimumPlan, opts) {
    opts = opts || {};

    // Step 1: Auth check
    var token = getAccessToken();
    if (!token) {
      if (window.VxReturn) window.VxReturn.redirectToLogin();
      else window.location.href = LOGIN_URL + '?next=' + encodeURIComponent(currentPath());
      return false;
    }

    // Step 2: Check cached plan first (instant, no flash)
    if (window.VxPlan) {
      var cached = window.VxPlan.getCached();
      if (cached && window.VxPlan.canAccess(cached.plan, minimumPlan)) {
        return true; // cached plan is sufficient
      }
    }

    // Step 3: Fetch fresh plan from API
    try {
      var cfg = await fetch('/config.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
      var apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');

      if (apiBase) {
        var res = await fetch(apiBase + '/check-permission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ tool: 'gate', product: opts.product || 'volynx' }),
        });

        if (res.ok) {
          var perm = await res.json();

          // Determine the relevant plan for comparison
          var userPlan = perm.plan || 'free';
          if (opts.product === 'daily') {
            userPlan = perm.daily_plan || perm.plan || 'free';
          } else if (!opts.product || opts.product === 'volynx') {
            userPlan = perm.builder_plan || perm.plan || 'free';
          }

          // Cache the result
          if (window.VxPlan) {
            window.VxPlan.cache(userPlan);
          }

          if (window.VxPlan && window.VxPlan.canAccess(userPlan, minimumPlan)) {
            return true;
          }
        }
      }
    } catch (_) {
      // API failure — fail open for UX (features will still require tokens server-side)
      return true;
    }

    // Step 4: Insufficient plan — redirect to pricing
    var redirectUrl = opts.redirectUrl || PRICING_URL;
    var sep = redirectUrl.indexOf('?') === -1 ? '?' : '&';
    window.location.href = redirectUrl + sep + 'upgrade=' + encodeURIComponent(minimumPlan) + '&from=' + encodeURIComponent(currentPath());
    return false;
  }

  /**
   * Require authentication only (any plan, including free).
   */
  function requireAuth() {
    var token = getAccessToken();
    if (!token) {
      if (window.VxReturn) window.VxReturn.redirectToLogin();
      else window.location.href = LOGIN_URL + '?next=' + encodeURIComponent(currentPath());
      return false;
    }
    return true;
  }

  // ── Auto-gate via data attribute on <body> ──
  function autoGate() {
    var body = document.body || document.documentElement;
    var requiredPlan = body.getAttribute('data-vx-require-plan');
    var product = body.getAttribute('data-vx-gate-product') || undefined;
    if (requiredPlan) {
      require(requiredPlan, { product: product });
    }
    if (body.hasAttribute('data-vx-require-auth')) {
      requireAuth();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoGate);
  } else {
    autoGate();
  }

  return {
    require: require,
    requireAuth: requireAuth,
  };
})();
