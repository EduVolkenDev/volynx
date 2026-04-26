/**
 * vx-pix.js
 * Pix checkout through Mercado Pago + Supabase Edge Functions.
 *
 * Usage:
 *   <script src="/js/vx-pix.js"></script>
 *   VxPix.checkout('tokens_starter_brl');
 */
window.VxPix = (function () {
  'use strict';

  var pollTimer = null;
  var redirectTimer = null;
  var currentExternalReference = '';

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
      title: 'Pay with Pix',
      redirecting: 'Generating your Pix QR code...',
      detail: 'This can take a few seconds while we prepare the payment.',
      error: 'Could not start Pix checkout. Try again.',
      scan: 'Scan the QR code below or copy the Pix code to pay.',
      copy: 'Copy Pix code',
      copied: 'Copied!',
      waiting: 'Waiting for payment confirmation...',
      success: 'Payment confirmed! Tokens credited.',
      expired: 'This Pix code expired. Generate a new one.',
      rejected: 'Pix payment was not approved.',
      closeHint: 'Keep this window open until confirmation.',
      close: 'Close',
    },
    pt: {
      title: 'Pagar com Pix',
      redirecting: 'Gerando seu QR code Pix...',
      detail: 'Isso pode levar alguns segundos enquanto preparamos o pagamento.',
      error: 'Nao foi possivel iniciar o Pix. Tente novamente.',
      scan: 'Escaneie o QR code abaixo ou copie o codigo Pix para pagar.',
      copy: 'Copiar codigo Pix',
      copied: 'Copiado!',
      waiting: 'Aguardando confirmacao do pagamento...',
      success: 'Pagamento confirmado! Tokens creditados.',
      expired: 'Este codigo Pix expirou. Gere um novo.',
      rejected: 'O pagamento Pix nao foi aprovado.',
      closeHint: 'Mantenha esta janela aberta ate a confirmacao.',
      close: 'Fechar',
    },
  };

  function t(key) {
    var lang = getLang();
    return (T[lang] || T.en)[key] || T.en[key] || key;
  }

  function defaultSuccessUrl() {
    return window.location.origin + '/account/?payment=pix_success';
  }

  function defaultCancelUrl() {
    var path = window.location.pathname || '/pricing/';
    return window.location.origin + path + '?payment=cancelled';
  }

  /**
   * Start Pix checkout flow.
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
      alert('API not configured');
      return;
    }

    showModal({ loading: true });

    try {
      var res = await fetch(apiBase + '/create-pix-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          lookup_key: lookupKey,
        }),
      });

      var data = await res.json();

      if (data && data.ok && data.external_reference) {
        currentExternalReference = data.external_reference;
        showPixModal(data, opts);
        startPolling(apiBase, token, currentExternalReference, opts);
        return;
      }

      showModal({ error: data.error || t('error') });
    } catch (_) {
      showModal({ error: t('error') });
    }
  }

  function removeModal() {
    stopPolling();
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
        '<p style="color:rgba(242,244,248,.72);font-size:.92rem;margin:0 0 6px;">' + t('redirecting') + '</p>' +
        '<p style="color:rgba(242,244,248,.46);font-size:.8rem;margin:0;">' + t('detail') + '</p>';
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

  function showPixModal(data, opts) {
    removeModal();

    var overlay = document.createElement('div');
    overlay.id = 'vxPixModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);padding:16px;';

    var box = document.createElement('div');
    box.style.cssText = 'background:rgba(12,14,22,.98);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px;max-width:460px;width:100%;text-align:center;font-family:Manrope,system-ui,sans-serif;color:#f2f4f8;box-shadow:0 24px 80px rgba(0,0,0,.35);';

    var qrImage = data.pix_qr_code_base64
      ? '<img src="data:image/png;base64,' + data.pix_qr_code_base64 + '" alt="Pix QR code" style="display:block;width:min(220px,70vw);height:auto;margin:0 auto 16px;padding:12px;border-radius:16px;background:#fff;" />'
      : '';

    var metaLine = [];
    if (data.label) metaLine.push(escapeHtml(String(data.label)));
    if (typeof data.amount === 'number') metaLine.push('R$' + Number(data.amount).toFixed(2).replace('.', ','));
    if (typeof data.tokens === 'number') metaLine.push(String(data.tokens) + ' VX');

    box.innerHTML =
      '<h3 style="margin:0 0 10px;font-size:1.18rem;font-weight:700;">' + t('title') + '</h3>' +
      '<p style="color:rgba(242,244,248,.72);font-size:.92rem;line-height:1.5;margin:0 0 14px;">' + t('scan') + '</p>' +
      qrImage +
      (metaLine.length ? '<p style="margin:0 0 14px;color:rgba(242,244,248,.56);font-size:.82rem;">' + metaLine.join(' | ') + '</p>' : '') +
      '<textarea id="vxPixCode" readonly style="width:100%;min-height:92px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#f2f4f8;font-size:.78rem;line-height:1.45;resize:none;">' + escapeHtml(String(data.pix_copy_paste || '')) + '</textarea>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;">' +
        '<button type="button" id="vxPixCopy" style="padding:10px 16px;border-radius:10px;font-size:.88rem;font-weight:700;border:none;background:#00bae4;color:#081018;cursor:pointer;">' + t('copy') + '</button>' +
        '<button type="button" id="vxPixClose" style="padding:10px 16px;border-radius:10px;font-size:.88rem;font-weight:700;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(242,244,248,.82);cursor:pointer;">' + t('close') + '</button>' +
      '</div>' +
      '<p id="vxPixStatus" style="margin:16px 0 0;color:rgba(242,244,248,.7);font-size:.85rem;">' + t('waiting') + '</p>' +
      '<p style="margin:8px 0 0;color:rgba(242,244,248,.42);font-size:.76rem;">' + t('closeHint') + '</p>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var closeBtn = document.getElementById('vxPixClose');
    var copyBtn = document.getElementById('vxPixCopy');
    var codeEl = document.getElementById('vxPixCode');

    if (closeBtn) closeBtn.addEventListener('click', removeModal);
    if (copyBtn && codeEl) {
      copyBtn.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(codeEl.value);
          copyBtn.textContent = t('copied');
          setTimeout(function () { copyBtn.textContent = t('copy'); }, 1600);
        } catch (_) {}
      });
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) removeModal();
    });
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      redirectTimer = null;
    }
    currentExternalReference = '';
  }

  function stopPollingOnly() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    currentExternalReference = '';
  }

  function clearRedirectTimer() {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      redirectTimer = null;
    }
  }

  function setStatusText(message, color) {
    var statusEl = document.getElementById('vxPixStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    if (color) statusEl.style.color = color;
  }

  function startPolling(apiBase, token, externalReference, opts) {
    stopPolling();
    currentExternalReference = externalReference;

    async function poll() {
      try {
        var res = await fetch(apiBase + '/check-pix-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ external_reference: externalReference }),
        });

        var data = await res.json();
        if (!res.ok) {
          setStatusText(data.error || t('error'), '#ff8a9a');
          return;
        }

        if (data.status === 'approved') {
          setStatusText(t('success'), '#78f0c8');
          if (typeof data.balance !== 'undefined') {
            window.dispatchEvent(new CustomEvent('vx:balance-changed', { detail: { balance: data.balance } }));
          }
          stopPollingOnly();
          clearRedirectTimer();
          redirectTimer = setTimeout(function () {
            window.location.href = opts.successUrl || opts.success_url || defaultSuccessUrl();
          }, 1200);
          return;
        }

        if (data.status === 'expired') {
          setStatusText(t('expired'), '#ffcf70');
          stopPolling();
          return;
        }

        if (data.status === 'rejected' || data.status === 'cancelled') {
          setStatusText(t('rejected'), '#ff8a9a');
          stopPolling();
          return;
        }

        setStatusText(t('waiting'));
      } catch (_) {
        setStatusText(t('error'), '#ff8a9a');
      }
    }

    poll();
    pollTimer = setInterval(poll, 3000);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    checkout: checkout,
    removeModal: removeModal,
  };
})();
