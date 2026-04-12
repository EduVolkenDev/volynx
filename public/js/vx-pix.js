/**
 * vx-pix.js
 * Pix checkout modal — generates QR code via Mercado Pago, polls for confirmation.
 *
 * Usage:
 *   <script src="/js/vx-pix.js"></script>
 *   VxPix.checkout('tokens_starter_brl');
 */
window.VxPix = (function () {
  'use strict';

  var POLL_INTERVAL = 4000; // 4s
  var MAX_POLLS = 120; // 8 minutes max (4s * 120)
  var pollTimer = null;
  var pollCount = 0;

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
      scan: 'Scan the QR code or copy the code below',
      copy: 'Copy Pix code',
      copied: 'Copied!',
      waiting: 'Waiting for payment...',
      success: 'Payment confirmed! Tokens credited.',
      expired: 'QR code expired. Try again.',
      error: 'Error generating Pix. Try again.',
      close: 'Close',
      amount: 'Amount',
      tokens: 'tokens',
      expires: 'Expires in',
      minutes: 'minutes',
    },
    pt: {
      title: 'Pagar com Pix',
      scan: 'Escaneie o QR code ou copie o código abaixo',
      copy: 'Copiar código Pix',
      copied: 'Copiado!',
      waiting: 'Aguardando pagamento...',
      success: 'Pagamento confirmado! Tokens creditados.',
      expired: 'QR code expirado. Tente novamente.',
      error: 'Erro ao gerar Pix. Tente novamente.',
      close: 'Fechar',
      amount: 'Valor',
      tokens: 'tokens',
      expires: 'Expira em',
      minutes: 'minutos',
    },
  };

  function t(key) {
    var lang = getLang();
    return (T[lang] || T.en)[key] || T.en[key] || key;
  }

  /**
   * Start Pix checkout flow.
   * @param {string} lookupKey - e.g. 'tokens_starter_brl'
   * @param {object} [opts] - { onSuccess?: (data) => void }
   */
  async function checkout(lookupKey, opts) {
    opts = opts || {};
    var token = getAccessToken();
    if (!token) {
      window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
      return;
    }

    var apiBase = await getApiBase();
    if (!apiBase) { alert('API not configured'); return; }

    // Show loading modal
    showModal({ loading: true });

    try {
      var res = await fetch(apiBase + '/create-pix-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ lookup_key: lookupKey }),
      });

      var data = await res.json();

      if (!data.ok) {
        showModal({ error: data.error || t('error') });
        return;
      }

      // Show QR code modal
      showModal({
        qrBase64: data.pix_qr_code_base64,
        copyPaste: data.pix_copy_paste,
        amount: data.amount,
        tokens: data.tokens,
        label: data.label,
        expiresAt: data.expires_at,
        externalRef: data.external_reference,
      });

      // Start polling
      startPolling(data.external_reference, data.expires_at, opts.onSuccess);

    } catch (_) {
      showModal({ error: t('error') });
    }
  }

  function startPolling(externalRef, expiresAt, onSuccess) {
    stopPolling();
    pollCount = 0;

    pollTimer = setInterval(async function () {
      pollCount++;

      // Check expiration
      if (new Date(expiresAt) < new Date()) {
        stopPolling();
        updateModalStatus('expired');
        return;
      }

      if (pollCount > MAX_POLLS) {
        stopPolling();
        updateModalStatus('expired');
        return;
      }

      try {
        var token = getAccessToken();
        var apiBase = await getApiBase();
        var res = await fetch(apiBase + '/check-pix-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ external_reference: externalRef }),
        });

        if (!res.ok) return;
        var data = await res.json();

        if (data.status === 'approved') {
          stopPolling();
          updateModalStatus('success', data);

          // Update cached balance
          if (window.VxTokens && data.balance !== undefined) {
            window.VxTokens.setCachedBalance(data.balance);
            try {
              window.dispatchEvent(new CustomEvent('vx:balance-changed', {
                detail: { balance: data.balance },
              }));
            } catch (_) {}
          }

          if (typeof onSuccess === 'function') {
            onSuccess(data);
          }
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          stopPolling();
          updateModalStatus('error');
        } else if (data.status === 'expired') {
          stopPolling();
          updateModalStatus('expired');
        }
      } catch (_) {
        // Network blip — keep polling
      }
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // ── Modal UI ──

  function removeModal() {
    stopPolling();
    var el = document.getElementById('vxPixModal');
    if (el) el.remove();
  }

  function showModal(opts) {
    removeModal();

    var overlay = document.createElement('div');
    overlay.id = 'vxPixModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);';

    var box = document.createElement('div');
    box.style.cssText = 'background:rgba(12,14,22,.97);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px;max-width:420px;width:calc(100% - 32px);text-align:center;font-family:Manrope,system-ui,sans-serif;color:#f2f4f8;';

    if (opts.loading) {
      box.innerHTML =
        '<div style="font-size:2rem;margin-bottom:12px;">&#9881;</div>' +
        '<p style="color:rgba(242,244,248,.6);font-size:.9rem;">' + t('waiting') + '</p>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) removeModal(); });
      return;
    }

    if (opts.error) {
      box.innerHTML =
        '<div style="font-size:2rem;margin-bottom:12px;">&#10060;</div>' +
        '<p style="color:#ff4d6a;font-size:.9rem;margin:0 0 16px;">' + escapeHtml(opts.error) + '</p>' +
        '<button type="button" id="vxPixClose" style="padding:10px 24px;border-radius:999px;font-size:.88rem;font-weight:700;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(242,244,248,.7);cursor:pointer;">' + t('close') + '</button>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      document.getElementById('vxPixClose').addEventListener('click', removeModal);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) removeModal(); });
      return;
    }

    // QR code modal
    var expiresIn = Math.max(0, Math.round((new Date(opts.expiresAt) - Date.now()) / 60000));

    var qrHtml = opts.qrBase64
      ? '<img src="data:image/png;base64,' + opts.qrBase64 + '" alt="Pix QR Code" style="width:220px;height:220px;border-radius:12px;margin:0 auto 12px;display:block;background:#fff;padding:8px;" />'
      : '<div style="width:220px;height:220px;border-radius:12px;margin:0 auto 12px;background:rgba(255,255,255,.05);display:grid;place-items:center;color:var(--muted);font-size:.8rem;">QR indisponivel</div>';

    box.innerHTML =
      '<h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:700;">' + t('title') + '</h3>' +
      '<p style="color:rgba(242,244,248,.5);font-size:.82rem;margin:0 0 16px;">' + t('scan') + '</p>' +
      qrHtml +
      '<div style="margin:0 0 12px;">' +
        '<span style="font-size:.8rem;color:rgba(242,244,248,.5);">' + t('amount') + ': </span>' +
        '<strong style="color:#34D399;">R$ ' + (opts.amount || 0).toFixed(2) + '</strong>' +
        '<span style="font-size:.8rem;color:rgba(242,244,248,.5);margin-left:12px;">' + (opts.tokens || 0) + ' ' + t('tokens') + '</span>' +
      '</div>' +
      (opts.copyPaste
        ? '<div style="margin:0 0 12px;">' +
            '<input type="text" readonly value="' + escapeAttr(opts.copyPaste) + '" id="vxPixCopyInput" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#f2f4f8;font-size:.78rem;font-family:monospace;text-align:center;" />' +
            '<button type="button" id="vxPixCopyBtn" style="margin-top:8px;padding:8px 20px;border-radius:999px;font-size:.82rem;font-weight:700;border:1px solid rgba(52,211,153,.25);background:rgba(52,211,153,.08);color:#34D399;cursor:pointer;">' + t('copy') + '</button>' +
          '</div>'
        : '') +
      '<div id="vxPixStatus" style="display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0;font-size:.85rem;color:rgba(242,244,248,.5);">' +
        '<span class="vx-pix-spinner"></span> ' + t('waiting') +
      '</div>' +
      '<p style="font-size:.72rem;color:rgba(242,244,248,.3);margin:8px 0 0;">' + t('expires') + ' ~' + expiresIn + ' ' + t('minutes') + '</p>' +
      '<style>.vx-pix-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.15);border-top-color:#34D399;border-radius:50%;animation:vxPixSpin .8s linear infinite;}@keyframes vxPixSpin{to{transform:rotate(360deg);}}</style>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Copy button
    var copyBtn = document.getElementById('vxPixCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var input = document.getElementById('vxPixCopyInput');
        if (input) {
          navigator.clipboard.writeText(input.value).then(function () {
            copyBtn.textContent = t('copied');
            setTimeout(function () { copyBtn.textContent = t('copy'); }, 2000);
          }).catch(function () {
            input.select();
            document.execCommand('copy');
            copyBtn.textContent = t('copied');
            setTimeout(function () { copyBtn.textContent = t('copy'); }, 2000);
          });
        }
      });
    }

    // Click outside to close (but warn about pending payment)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) removeModal();
    });
  }

  function updateModalStatus(status, data) {
    var el = document.getElementById('vxPixStatus');
    if (!el) return;

    if (status === 'success') {
      el.innerHTML = '<span style="color:#34D399;font-size:1.2rem;">&#10003;</span> <span style="color:#34D399;font-weight:700;">' + t('success') + '</span>';
      if (data && data.balance !== undefined) {
        el.innerHTML += '<br/><span style="font-size:.82rem;color:rgba(242,244,248,.5);margin-top:4px;display:block;">' + (getLang() === 'pt' ? 'Saldo atual: ' : 'Current balance: ') + data.balance + ' tokens</span>';
      }
      // Auto-close after 4 seconds
      setTimeout(function () { removeModal(); }, 4000);
    } else if (status === 'expired') {
      el.innerHTML = '<span style="color:#f5c542;">&#9888;</span> <span style="color:#f5c542;">' + t('expired') + '</span>';
    } else if (status === 'error') {
      el.innerHTML = '<span style="color:#ff4d6a;">&#10060;</span> <span style="color:#ff4d6a;">' + t('error') + '</span>';
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    checkout: checkout,
    removeModal: removeModal,
  };
})();
