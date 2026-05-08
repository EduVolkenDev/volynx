/**
 * vx-pix.js
 * Pix checkout through Stripe Checkout.
 *
 * Keeps the public VxPix API for existing pages, but the payment is created
 * by create-checkout-session and fulfilled by the Stripe webhook.
 */
window.VxPix = (function () {
  'use strict';

  function getAccessToken() {
    return localStorage.getItem('volynx_access_token') || '';
  }

  async function getApiBase() {
    try {
      var res = await fetch('/config.json', { cache: 'no-store' });
      var cfg = await res.json();
      return (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');
    } catch (_) {
      return '';
    }
  }

  function getLang() {
    return localStorage.getItem('volynx_lang') || 'en';
  }

  var T = {
    en: {
      title: 'Opening Pix checkout',
      detail: 'Stripe will show the Pix QR code and confirm the payment securely.',
      error: 'Could not start Pix checkout. Try again.',
      close: 'Close',
    },
    pt: {
      title: 'Abrindo checkout Pix',
      detail: 'A Stripe vai mostrar o QR code Pix e confirmar o pagamento com segurança.',
      error: 'Nao foi possivel iniciar o Pix. Tente novamente.',
      close: 'Fechar',
    },
  };

  function t(key) {
    var lang = getLang();
    return (T[lang] || T.en)[key] || T.en[key] || key;
  }

  function removeModal() {
    var el = document.getElementById('vxPixModal');
    if (el) el.remove();
  }

  function showModal(opts) {
    removeModal();

    var overlay = document.createElement('div');
    overlay.id = 'vxPixModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);';

    var box = document.createElement('div');
    box.style.cssText = 'background:rgba(12,14,22,.97);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:24px;max-width:420px;width:calc(100% - 32px);text-align:center;font-family:Manrope,system-ui,sans-serif;color:#f2f4f8;';

    if (opts.loading) {
      box.innerHTML =
        '<style>.vx-pix-spinner{display:inline-block;width:24px;height:24px;border:3px solid rgba(255,255,255,.15);border-top-color:#00bae4;border-radius:50%;animation:vxPixSpin .8s linear infinite;margin-bottom:14px;}@keyframes vxPixSpin{to{transform:rotate(360deg);}}</style>' +
        '<span class="vx-pix-spinner"></span>' +
        '<h3 style="margin:0 0 8px;font-size:1.1rem;font-weight:700;">' + t('title') + '</h3>' +
        '<p style="color:rgba(242,244,248,.72);font-size:.92rem;margin:0;">' + t('detail') + '</p>';
    } else {
      box.innerHTML =
        '<h3 style="margin:0 0 8px;font-size:1.1rem;font-weight:700;">' + t('title') + '</h3>' +
        '<p style="color:#ff6b7c;font-size:.9rem;margin:0 0 16px;">' + escapeHtml(opts.error || t('error')) + '</p>' +
        '<button type="button" id="vxPixClose" style="padding:10px 20px;border-radius:8px;font-size:.88rem;font-weight:700;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(242,244,248,.82);cursor:pointer;">' + t('close') + '</button>';
    }

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var closeBtn = document.getElementById('vxPixClose');
    if (closeBtn) closeBtn.addEventListener('click', removeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && !opts.loading) removeModal();
    });
  }

  /**
   * Start Stripe Checkout with Pix as the selected payment method.
   * @param {string} lookupKey - e.g. 'tokens_starter_brl'
   * @param {object} [opts] - { successUrl?: string, cancelUrl?: string }
   */
  async function checkout(lookupKey, opts) {
    opts = opts || {};

    var token = getAccessToken();
    if (!token) {
      window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
      return;
    }

    var apiBase = await getApiBase();
    if (!apiBase) {
      showModal({ error: 'API not configured' });
      return;
    }

    showModal({ loading: true });

    try {
      var res = await fetch(apiBase + '/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          lookup_key: lookupKey,
          payment_method: 'pix',
          payment_method_types: ['pix'],
          success_url: opts.successUrl || window.location.origin + '/account/?payment=pix_success',
          cancel_url: opts.cancelUrl || window.location.href,
        }),
      });

      var data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
        return;
      }

      showModal({ error: data.error || data.msg || data.message || t('error') });
    } catch (_) {
      showModal({ error: t('error') });
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch];
    });
  }

  return {
    checkout: checkout,
    close: removeModal,
  };
})();
