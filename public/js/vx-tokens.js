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
    // Remove existing modal if any
    var existing = document.getElementById('vxTokenModal');
    if (existing) existing.remove();

    var shortfall = required - balance;

    var overlay = document.createElement('div');
    overlay.id = 'vxTokenModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);';

    overlay.innerHTML =
      '<div style="background:rgba(12,14,22,.96);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:32px;max-width:400px;width:calc(100% - 40px);text-align:center;font-family:Inter,system-ui,sans-serif;color:#f2f4f8;">' +
        '<div style="font-size:2rem;margin-bottom:12px;">&#9889;</div>' +
        '<h3 style="margin:0 0 8px;font-size:1.1rem;">Insufficient tokens</h3>' +
        '<p style="margin:0 0 16px;color:rgba(242,244,248,.6);font-size:.9rem;line-height:1.5;">' +
          'This action requires <strong>' + required + ' token' + (required !== 1 ? 's' : '') + '</strong>. ' +
          'You have <strong>' + balance + '</strong>. ' +
          'You need <strong>' + shortfall + ' more</strong>.' +
        '</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;">' +
          '<a href="/pricing/#tokens" style="display:inline-flex;align-items:center;padding:10px 22px;border-radius:999px;font-size:.88rem;font-weight:700;border:1px solid rgba(0,232,197,.25);background:linear-gradient(135deg,rgba(0,232,197,.15),rgba(120,0,255,.1));color:#00e8c5;text-decoration:none;">Get tokens</a>' +
          '<button type="button" id="vxTokenModalClose" style="padding:10px 22px;border-radius:999px;font-size:.88rem;font-weight:700;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(242,244,248,.7);cursor:pointer;">Cancel</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.id === 'vxTokenModalClose') {
        overlay.remove();
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
  };
})();
