/* VOLYNX — Kit Checkout
 * Wires any `.vx-checkout-btn[data-lookup]` element to the Stripe Checkout flow.
 * Picks the current currency from localStorage (set by vx-currency.js), appends it
 * to the lookup_key, and calls /create-checkout-session.
 *
 * Usage:
 *   <a class="btn vx-checkout-btn" data-lookup="kit_portfolio_personal" data-label="Buy Starter">Buy Starter — £39</a>
 *
 * Requirements:
 *   - /config.json must expose functionsUrl (or apiBaseUrl)
 *   - User must be logged in (redirects to /login/ if not)
 *   - Stripe catalog must have price with lookup_key `kit_portfolio_personal_gbp` (etc.)
 */
(function () {
  'use strict';

  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('.vx-checkout-btn[data-lookup]');
    if (!btn) return;
    e.preventDefault();

    var lookupBase = btn.dataset.lookup;
    if (!lookupBase) return;

    var token = localStorage.getItem('volynx_access_token');
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
      var cfg = await fetch('/config.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
      var apiBase = ((cfg && (cfg.functionsUrl || cfg.apiBaseUrl)) || '').replace(/\/$/, '');
      if (!apiBase) { reset('Checkout not configured'); return; }

      var currency = (localStorage.getItem('volynx_currency') || 'gbp').toLowerCase();
      if (!/^(gbp|eur|brl)$/.test(currency)) currency = 'gbp';
      var lookupKey = lookupBase + '_' + currency;

      var res = await fetch(apiBase + '/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          lookup_key: lookupKey,
          success_url: window.location.origin + '/delivery/?payment=success',
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
