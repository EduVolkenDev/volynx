/* VOLYNX — Kit Checkout
 * Wires any `.vx-checkout-btn[data-lookup]` element to the Stripe Checkout flow.
 * Picks the current currency from localStorage (set by vx-currency.js), appends it
 * to the lookup_key, and calls /create-checkout-session.
 *
 * Usage:
 *   <a class="btn vx-checkout-btn" data-lookup="kit_portfolio_personal" data-label="Buy Starter">Buy Starter — £47</a>
 *
 * Requirements:
 *   - /config.json must expose functionsUrl (or apiBaseUrl)
 *   - User must be logged in (redirects to /login/ if not)
 *   - Stripe catalog must have price with lookup_key `kit_portfolio_personal_gbp` (etc.)
 */
(function () {
  'use strict';

  async function loadConfig() {
    return fetch('/config.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function normalizeCurrency(value) {
    var currency = String(value || 'gbp').toLowerCase();
    return /^(gbp|eur|brl)$/.test(currency) ? currency : 'gbp';
  }

  function readStorage(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : '';
    } catch (_) {
      return '';
    }
  }

  function writeStorage(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, value);
    } catch (_) {}
  }

  function currentCurrency() {
    try {
      var fromUrl = new URLSearchParams(window.location.search).get('currency');
      if (fromUrl) return normalizeCurrency(fromUrl);
    } catch (_) {}
    return normalizeCurrency(readStorage('volynx_currency') || 'gbp');
  }

  function isPropertyFlowLookup(value) {
    return /^pf[_-]/i.test(String(value || ''));
  }

  function propertyFlowTierFromLookup(value) {
    var normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
    if (normalized.indexOf('white-label') !== -1 || normalized.indexOf('enterprise') !== -1) return 'white-label';
    if (normalized.indexOf('professional') !== -1) return 'professional';
    return 'starter';
  }

  function successUrlForLookup(lookupBase) {
    if (!isPropertyFlowLookup(lookupBase)) {
      return window.location.origin + '/delivery/?payment=success';
    }

    var tier = propertyFlowTierFromLookup(lookupBase);
    return window.location.origin + '/dashboard/purchases/propertyflow?session_id={CHECKOUT_SESSION_ID}&tier=' + encodeURIComponent(tier);
  }

  async function freshAccessToken(cfg) {
    var token = readStorage('volynx_access_token') || '';
    var refreshToken = readStorage('volynx_refresh_token') || '';
    if (!token || !refreshToken || !cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return token;

    try {
      var rr = await fetch(cfg.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!rr.ok) return token;
      var sess = await rr.json();
      if (sess.access_token) {
        token = sess.access_token;
        writeStorage('volynx_access_token', sess.access_token);
        if (sess.refresh_token) writeStorage('volynx_refresh_token', sess.refresh_token);
      }
    } catch (_) {}

    return token;
  }

  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('.vx-checkout-btn[data-lookup]');
    if (!btn) return;
    e.preventDefault();

    var lookupBase = btn.dataset.lookup;
    if (!lookupBase) return;

    var token = readStorage('volynx_access_token');
    if (!token) {
      var next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = '/login/?next=' + next;
      return;
    }

    var originalText = btn.textContent;
    btn.setAttribute('aria-busy', 'true');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
    btn.textContent = btn.dataset.processingLabel || 'Processing…';

    try {
      var cfg = await loadConfig();
      var apiBase = ((cfg && (cfg.functionsUrl || cfg.apiBaseUrl)) || '').replace(/\/$/, '');
      if (!apiBase) { reset('Checkout not configured'); return; }

      token = await freshAccessToken(cfg);
      if (!token) {
        var next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = '/login/?next=' + next;
        return;
      }

      var currency = normalizeCurrency(btn.dataset.currency || currentCurrency());
      var lookupKey = lookupBase + '_' + currency;

      var res = await fetch(apiBase + '/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          lookup_key: lookupKey,
          success_url: successUrlForLookup(lookupBase),
          cancel_url: window.location.href.split('?')[0] + '?payment=cancelled',
        }),
      });

      var data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
        return;
      }

      var errMsg = (data && (data.error || data.msg || data.message)) || 'Checkout failed. Please try again.';
      reset(errMsg);
    } catch (err) {
      reset('Connection error. Please check your network.');
    }

    function reset(msg) {
      btn.removeAttribute('aria-busy');
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.textContent = msg || originalText;
      if (msg && msg !== originalText) {
        setTimeout(function () { btn.textContent = btn.dataset.label || originalText; }, 3000);
      }
    }
  });
})();
