/**
 * vx-tokens.js
 * Client-side token balance & spending helpers.
 *
 * Usage:
 *   <script src="/js/vx-tokens.js"></script>
 *
 *   // Check balance before showing premium UI
 *   const bal = await VxTokens.getBalance();
 *
 *   // Gate an action — returns { ok, balance } or shows upsell
 *   const result = await VxTokens.spend('image-suite', 'pro');
 *   if (!result.ok) return; // insufficient — upsell already shown
 *
 *   // Get cached balance (sync, no fetch)
 *   const cached = VxTokens.getCachedBalance();
 */
window.VxTokens = (function () {
  'use strict';

  var BALANCE_KEY = 'volynx_token_balance';
  var BALANCE_TS_KEY = 'volynx_token_balance_ts';
  var CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  var CLASS_COSTS = {
    light: 1,
    medium: 2,
    pro: 4,
    batch: 8,
    premium: 12,
  };

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

  // ── Balance ──

  function setCachedBalance(balance) {
    try {
      localStorage.setItem(BALANCE_KEY, String(balance));
      localStorage.setItem(BALANCE_TS_KEY, String(Date.now()));
    } catch (_) {}
  }

  function getCachedBalance() {
    try {
      var ts = parseInt(localStorage.getItem(BALANCE_TS_KEY) || '0', 10);
      if (Date.now() - ts > CACHE_TTL) return null;
      var val = localStorage.getItem(BALANCE_KEY);
      return val !== null ? parseInt(val, 10) : null;
    } catch (_) {
      return null;
    }
  }

  function clearCache() {
    try {
      localStorage.removeItem(BALANCE_KEY);
      localStorage.removeItem(BALANCE_TS_KEY);
    } catch (_) {}
  }

  /** Fetch current token balance from server */
  async function getBalance() {
    var cached = getCachedBalance();
    if (cached !== null) return cached;

    var token = getAccessToken();
    if (!token) return 0;

    var apiBase = await getApiBase();
    if (!apiBase) return 0;

    try {
      var res = await fetch(apiBase + '/get-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) return 0;
      var data = await res.json();
      var balance = data.balance || 0;
      setCachedBalance(balance);
      return balance;
    } catch (_) {
      return 0;
    }
  }

  // ── Realtime subscription (cross-product balance sync) ──

  var _realtimeClient = null;
  var _realtimeChannel = null;

  /**
   * Subscribe to live balance updates via Supabase Realtime.
   * Any UPDATE to profiles.token_balance fires 'vx:balance-changed' event.
   * Works across all subdomains — open Daily + CVitae, spend on one, both update.
   */
  async function subscribeToBalance() {
    if (_realtimeChannel) return; // already subscribed

    var jwt = getAccessToken();
    if (!jwt) return;

    var cfg;
    try {
      cfg = await fetch('/config.json', { cache: 'no-store' }).then(function(r){ return r.json(); });
    } catch(_) { return; }

    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) return;

    // Extract user id from JWT
    var userId = null;
    try {
      var parts = jwt.split('.');
      var payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      userId = payload.sub;
    } catch(_) { return; }
    if (!userId) return;

    // Lazy-load supabase-js from CDN if not already loaded
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      await new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(function(){});
    }
    if (typeof window.supabase === 'undefined') return;

    _realtimeClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      global: { headers: { Authorization: 'Bearer ' + jwt } },
      realtime: { params: { apikey: cfg.supabaseAnonKey } },
    });

    _realtimeChannel = _realtimeClient
      .channel('balance-' + userId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + userId },
        function(payload) {
          var newBal = payload.new && payload.new.token_balance;
          if (typeof newBal === 'number') {
            setCachedBalance(newBal);
            try {
              window.dispatchEvent(new CustomEvent('vx:balance-changed', {
                detail: { balance: newBal, source: 'realtime' }
              }));
            } catch(_) {}
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_badges', filter: 'user_id=eq.' + userId },
        function(payload) {
          var badgeId = payload.new && payload.new.badge_id;
          if (badgeId) {
            try {
              window.dispatchEvent(new CustomEvent('vx:badge-unlocked', {
                detail: { badge_id: badgeId }
              }));
            } catch(_) {}
          }
        }
      )
      .subscribe();
  }

  function unsubscribeFromBalance() {
    if (_realtimeChannel && _realtimeClient) {
      _realtimeClient.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
  }

  // Auto-subscribe on load if user is logged in
  if (typeof window !== 'undefined' && getAccessToken()) {
    // Delay to let page load first
    setTimeout(function() { subscribeToBalance().catch(function(){}); }, 1500);
  }

  // ── Spend ──

  /** Get the token cost for an action class */
  function costFor(actionClass) {
    return CLASS_COSTS[actionClass] || 0;
  }

  /**
   * Attempt to spend tokens for a tool action.
   * On insufficient balance, shows a modal upsell.
   *
   * @param {string} tool - Tool name (e.g. 'image-suite')
   * @param {string} actionClass - 'light'|'medium'|'pro'|'batch'|'premium'
   * @param {object} [opts] - { tokens?: number, description?: string, silent?: boolean }
   * @returns {Promise<{ok: boolean, balance?: number, spent?: number, error?: string}>}
   */
  async function spend(tool, actionClass, opts) {
    opts = opts || {};
    var token = getAccessToken();
    if (!token) {
      if (!opts.silent) showLoginPrompt();
      return { ok: false, error: 'not_authenticated' };
    }

    var apiBase = await getApiBase();
    if (!apiBase) return { ok: false, error: 'no_api' };

    try {
      var body = {
        tool: tool,
        action_class: actionClass,
      };
      if (opts.tokens) body.tokens = opts.tokens;
      if (opts.description) body.description = opts.description;

      var res = await fetch(apiBase + '/deduct-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(body),
      });

      var data = await res.json();

      if (data.ok) {
        setCachedBalance(data.balance);
        return { ok: true, balance: data.balance, spent: data.spent };
      }

      if (data.error === 'insufficient_balance') {
        setCachedBalance(data.balance || 0);
        if (!opts.silent) {
          showInsufficientModal(data.balance || 0, data.required || CLASS_COSTS[actionClass] || 0, tool);
        }
        return { ok: false, error: 'insufficient_balance', balance: data.balance, required: data.required };
      }

      return { ok: false, error: data.error || 'unknown' };
    } catch (err) {
      return { ok: false, error: 'network_error' };
    }
  }

  /**
   * Check if user has enough tokens WITHOUT spending.
   * @returns {Promise<{enough: boolean, balance: number, cost: number}>}
   */
  async function canAfford(actionClass, customTokens) {
    var cost = customTokens || CLASS_COSTS[actionClass] || 0;
    var balance = await getBalance();
    return { enough: balance >= cost, balance: balance, cost: cost };
  }

  // ── UI Helpers ──

  function showInsufficientModal(balance, required, tool) {
    var existing = document.getElementById('vxTokenModal');
    if (existing) existing.remove();

    var shortfall = required - balance;
    var lang = localStorage.getItem('volynx_lang') || 'en';

    var copy = lang === 'pt' ? {
      title:    'Quase lá!',
      subtitle: 'Você precisa de mais ' + shortfall + ' token' + (shortfall !== 1 ? 's' : '') + ' pra essa ação',
      emotion:  'Profissionais sérios recarregam antes da pressa. Garanta seu ritmo agora.',
      have:     'Você tem',
      need:     'Precisa de',
      cta:      'Recarregar — a partir de R$9',
      ctaPix:   'Pagar com Pix',
      cancel:   'Agora não',
      bonus:    '🎁 Ganhe 20% extra no pacote Pro',
    } : {
      title:    'Almost there!',
      subtitle: 'You need ' + shortfall + ' more token' + (shortfall !== 1 ? 's' : '') + ' for this action',
      emotion:  'Serious pros recharge ahead of the rush. Secure your momentum now.',
      have:     'You have',
      need:     'Need',
      cta:      'Recharge — from £9',
      ctaPix:   'Pay with Pix',
      cancel:   'Not now',
      bonus:    '🎁 Get 20% extra on the Pro pack',
    };

    // Determine base URL for pricing (cross-subdomain aware)
    var pricingHref = (window.location.hostname === 'volynx.world')
      ? '/recarregar/'
      : 'https://volynx.world/recarregar/';

    var overlay = document.createElement('div');
    overlay.id = 'vxTokenModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);opacity:0;transition:opacity .2s;';

    overlay.innerHTML =
      '<div style="position:relative;background:radial-gradient(ellipse at top,rgba(139,250,240,.08),rgba(12,14,22,.98));border:1px solid rgba(139,250,240,.2);border-radius:24px;padding:36px 32px;max-width:440px;width:calc(100% - 40px);text-align:center;font-family:Manrope,system-ui,sans-serif;color:#f2f4f8;box-shadow:0 24px 80px rgba(0,0,0,.6), 0 0 80px rgba(139,250,240,.1);transform:scale(.92);transition:transform .3s cubic-bezier(.34,1.56,.64,1);">' +
        '<div style="font-size:2.8rem;margin-bottom:8px;animation:vxPulse 2s ease-in-out infinite;">⚡</div>' +
        '<h3 style="margin:0 0 6px;font-size:1.35rem;font-weight:800;letter-spacing:-.02em;">' + copy.title + '</h3>' +
        '<p style="margin:0 0 20px;color:rgba(242,244,248,.7);font-size:.9rem;line-height:1.5;">' + copy.subtitle + '</p>' +
        '<div style="display:flex;gap:12px;margin:0 0 20px;padding:16px;background:rgba(255,255,255,.04);border-radius:14px;border:1px solid rgba(255,255,255,.06);">' +
          '<div style="flex:1;"><div style="font-size:.7rem;color:rgba(242,244,248,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">' + copy.have + '</div><div style="font-size:1.4rem;font-weight:800;color:rgba(242,244,248,.8);">' + balance + '</div></div>' +
          '<div style="width:1px;background:rgba(255,255,255,.08);"></div>' +
          '<div style="flex:1;"><div style="font-size:.7rem;color:rgba(242,244,248,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">' + copy.need + '</div><div style="font-size:1.4rem;font-weight:800;color:#8bfaf0;">' + required + '</div></div>' +
        '</div>' +
        '<p style="margin:0 0 16px;color:rgba(242,244,248,.55);font-size:.82rem;font-style:italic;line-height:1.5;">' + copy.emotion + '</p>' +
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
          '<a href="' + pricingHref + '" style="display:flex;align-items:center;justify-content:center;padding:13px 22px;border-radius:999px;font-size:.9rem;font-weight:800;border:none;background:linear-gradient(135deg,#34D399,#8bfaf0);color:#0c0e16;text-decoration:none;box-shadow:0 8px 24px rgba(52,211,153,.3);">' + copy.cta + '</a>' +
          '<button type="button" id="vxTokenModalClose" style="padding:10px 22px;border-radius:999px;font-size:.82rem;font-weight:600;border:1px solid rgba(255,255,255,.06);background:transparent;color:rgba(242,244,248,.55);cursor:pointer;">' + copy.cancel + '</button>' +
        '</div>' +
        '<p style="margin:16px 0 0;color:#f5c542;font-size:.75rem;font-weight:700;">' + copy.bonus + '</p>' +
      '</div>' +
      '<style>@keyframes vxPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }</style>';

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
      var box = overlay.firstElementChild;
      if (box) box.style.transform = 'scale(1)';
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.id === 'vxTokenModalClose') {
        overlay.style.opacity = '0';
        setTimeout(function(){ overlay.remove(); }, 200);
      }
    });
  }

  function showLoginPrompt() {
    var next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = '/login/?next=' + next;
  }

  // ── Transaction History ──

  var HISTORY_KEY = 'volynx_token_history';

  function setCachedHistory(transactions) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(transactions));
    } catch (_) {}
  }

  function getCachedHistory() {
    try {
      var ts = parseInt(localStorage.getItem(BALANCE_TS_KEY) || '0', 10);
      if (Date.now() - ts > CACHE_TTL) return null;
      var raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Fetch balance + recent transactions from server.
   * Returns { balance: number, recent: Array<transaction> }
   */
  async function getBalanceWithHistory(forceRefresh) {
    if (!forceRefresh) {
      var cachedBal = getCachedBalance();
      var cachedHist = getCachedHistory();
      if (cachedBal !== null && cachedHist !== null) {
        return { balance: cachedBal, recent: cachedHist };
      }
    }

    var token = getAccessToken();
    if (!token) return { balance: 0, recent: [] };

    var apiBase = await getApiBase();
    if (!apiBase) return { balance: 0, recent: [] };

    try {
      var res = await fetch(apiBase + '/get-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) return { balance: 0, recent: [] };
      var data = await res.json();
      var balance = data.balance || 0;
      var recent = data.recent || [];
      setCachedBalance(balance);
      setCachedHistory(recent);
      return { balance: balance, recent: recent };
    } catch (_) {
      return { balance: 0, recent: [] };
    }
  }

  // ── Events ──

  /** Dispatch a custom event when balance changes (for dashboard live update) */
  function notifyBalanceChange(newBalance) {
    setCachedBalance(newBalance);
    try {
      window.dispatchEvent(new CustomEvent('vx:balance-changed', {
        detail: { balance: newBalance },
      }));
    } catch (_) {}
  }

  return {
    CLASS_COSTS: CLASS_COSTS,
    getBalance: getBalance,
    getBalanceWithHistory: getBalanceWithHistory,
    getCachedBalance: getCachedBalance,
    getCachedHistory: getCachedHistory,
    setCachedBalance: setCachedBalance,
    clearCache: function () { clearCache(); try { localStorage.removeItem(HISTORY_KEY); } catch (_) {} },
    costFor: costFor,
    spend: spend,
    canAfford: canAfford,
    notifyBalanceChange: notifyBalanceChange,
    subscribeToBalance: subscribeToBalance,
    unsubscribeFromBalance: unsubscribeFromBalance,
  };
})();
