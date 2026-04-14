/**
 * vx-token-bar.js
 * Animated token progress bar with color transitions.
 *
 * Usage:
 *   <div data-vx-token-bar data-max="100"></div>
 *   <script src="/js/vx-token-bar.js"></script>
 *
 * Colors shift: green (>50%) → yellow (20-50%) → red (<20%)
 * Auto-updates on 'vx:balance-changed' events.
 */
(function () {
  'use strict';

  var bars = [];

  function colorForPct(pct) {
    if (pct > 60) return { fill: '#34D399', glow: 'rgba(52,211,153,.35)', bg: 'rgba(52,211,153,.08)' };
    if (pct > 30) return { fill: '#f5c542', glow: 'rgba(245,197,66,.35)', bg: 'rgba(245,197,66,.08)' };
    if (pct > 10) return { fill: '#ff8c42', glow: 'rgba(255,140,66,.35)', bg: 'rgba(255,140,66,.08)' };
    return             { fill: '#ff4d6a', glow: 'rgba(255,77,106,.35)',  bg: 'rgba(255,77,106,.08)' };
  }

  function init(el) {
    var max = parseFloat(el.getAttribute('data-max')) || 100;

    if (!el.querySelector('.vx-tb__track')) {
      el.innerHTML =
        '<div class="vx-tb__header">' +
          '<span class="vx-tb__label"></span>' +
          '<span class="vx-tb__count"></span>' +
        '</div>' +
        '<div class="vx-tb__track"><div class="vx-tb__fill"></div></div>';

      // Scoped styles (inject once)
      if (!document.getElementById('vx-tb-style')) {
        var style = document.createElement('style');
        style.id = 'vx-tb-style';
        style.textContent = [
          '[data-vx-token-bar]{display:flex;flex-direction:column;gap:8px;width:100%;}',
          '.vx-tb__header{display:flex;justify-content:space-between;align-items:center;font-family:Manrope,sans-serif;font-size:.82rem;}',
          '.vx-tb__label{font-weight:600;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.06em;font-size:.72rem;}',
          '.vx-tb__count{font-weight:800;font-size:.95rem;color:rgba(255,255,255,.95);font-variant-numeric:tabular-nums;}',
          '.vx-tb__track{position:relative;width:100%;height:10px;border-radius:999px;background:rgba(255,255,255,.05);overflow:hidden;}',
          '.vx-tb__fill{height:100%;border-radius:999px;transition:width .6s cubic-bezier(.34,1.56,.64,1),background-color .4s;}',
        ].join('');
        document.head.appendChild(style);
      }
    }

    bars.push({ el: el, max: max });
  }

  function update(bar, value) {
    var pct = Math.max(0, Math.min(100, (value / bar.max) * 100));
    var c = colorForPct(pct);

    var fill = bar.el.querySelector('.vx-tb__fill');
    var count = bar.el.querySelector('.vx-tb__count');
    var label = bar.el.querySelector('.vx-tb__label');

    if (fill) {
      fill.style.width = pct + '%';
      fill.style.background = 'linear-gradient(90deg, ' + c.fill + ', ' + c.fill + 'dd)';
      fill.style.boxShadow = '0 0 16px ' + c.glow;
    }
    if (count) count.textContent = value + ' / ' + bar.max;
    if (label) {
      var lang = localStorage.getItem('volynx_lang') || 'en';
      label.textContent = bar.el.getAttribute('data-label') || (lang === 'pt' ? 'Saldo de tokens' : 'Token balance');
    }
  }

  function refreshAll(balance) {
    bars.forEach(function(bar){ update(bar, balance); });
  }

  // Initialize on DOM ready
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function() {
    document.querySelectorAll('[data-vx-token-bar]').forEach(init);

    // Initial balance from cache or fetch
    if (window.VxTokens) {
      var cached = window.VxTokens.getCachedBalance();
      if (cached !== null) refreshAll(cached);
      window.VxTokens.getBalance().then(refreshAll).catch(function(){});
    }
  });

  // Live updates from realtime or local events
  window.addEventListener('vx:balance-changed', function(e) {
    if (e.detail && typeof e.detail.balance === 'number') {
      refreshAll(e.detail.balance);
    }
  });

  // Expose for manual updates
  window.VxTokenBar = { refresh: refreshAll };
})();
