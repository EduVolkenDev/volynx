/**
 * vx-gamification.js
 * Streaks + badges + gamified notifications.
 *
 * Auto-pings streak on page load for authenticated users.
 * Listens to 'vx:badge-unlocked' (fired by realtime) and shows notification.
 * Listens to 'vx:balance-changed' to show low-balance warnings.
 */
window.VxGame = (function () {
  'use strict';

  var PINGED_KEY = 'volynx_streak_pinged_date';

  function getAccessToken() {
    return localStorage.getItem('volynx_access_token') || '';
  }

  async function getApiBase() {
    try {
      var res = await fetch('/config.json', { cache: 'no-store' });
      var cfg = await res.json();
      return (cfg.functionsUrl || '').replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function getLang() { return localStorage.getItem('volynx_lang') || 'en'; }

  var STRINGS = {
    en: {
      streakNew:     'Streak started! Come back tomorrow to build it.',
      streakDay:     'Day {n} streak — keep it alive!',
      streakBonus:   'Streak milestone! +{tokens} tokens unlocked.',
      badgeUnlocked: 'Badge unlocked: {label}',
      lowBalance:    'Running low on tokens — {n} left. Recharge and get 20% extra.',
      zeroBalance:   'Out of tokens. Recharge now.',
      recharge:      'Recharge',
      dismiss:       'Dismiss',
    },
    pt: {
      streakNew:     'Streak iniciado! Volte amanhã pra continuar.',
      streakDay:     'Dia {n} de streak — mantenha vivo!',
      streakBonus:   'Marco de streak! +{tokens} tokens liberados.',
      badgeUnlocked: 'Badge desbloqueado: {label}',
      lowBalance:    'Poucos tokens restando — {n}. Recarregue e ganhe 20% a mais.',
      zeroBalance:   'Tokens esgotados. Recarregue agora.',
      recharge:      'Recarregar',
      dismiss:       'Fechar',
    },
  };

  function t(key, vars) {
    var s = (STRINGS[getLang()] || STRINGS.en)[key] || STRINGS.en[key] || key;
    if (vars) Object.keys(vars).forEach(function(k){ s = s.replace('{'+k+'}', vars[k]); });
    return s;
  }

  // ── Streak ──

  /**
   * Call once per day on any authenticated page.
   * Idempotent: RPC returns same result if called twice on same day.
   */
  async function pingStreak() {
    var token = getAccessToken();
    if (!token) return null;

    // Only ping once per day per browser session
    var today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(PINGED_KEY) === today) return null;

    var apiBase = await getApiBase();
    if (!apiBase) return null;

    try {
      // Call RPC directly via REST
      var cfg = await fetch('/config.json', { cache: 'no-store' }).then(function(r){ return r.json(); });
      var res = await fetch(cfg.supabaseUrl + '/rest/v1/rpc/ping_streak', {
        method: 'POST',
        headers: {
          'apikey': cfg.supabaseAnonKey,
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: _userIdFromJwt(token) }),
      });

      if (!res.ok) return null;
      var data = await res.json();

      localStorage.setItem(PINGED_KEY, today);

      if (data && data.new_day && data.streak > 0) {
        // Show streak notification
        if (data.bonus > 0) {
          showToast(t('streakBonus', { tokens: data.bonus }), 'success', 6000);
          triggerConfetti();
        } else if (data.streak >= 3) {
          showToast(t('streakDay', { n: data.streak }), 'info', 3500);
        }
      }

      return data;
    } catch (_) { return null; }
  }

  function _userIdFromJwt(jwt) {
    try {
      var payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      return payload.sub;
    } catch (_) { return null; }
  }

  // ── Badge notifications ──

  async function fetchBadgeInfo(badgeId) {
    try {
      var cfg = await fetch('/config.json', { cache: 'no-store' }).then(function(r){ return r.json(); });
      var res = await fetch(cfg.supabaseUrl + '/rest/v1/badges?id=eq.' + badgeId + '&select=label,icon,tier', {
        headers: { apikey: cfg.supabaseAnonKey },
      });
      if (!res.ok) return null;
      var rows = await res.json();
      return rows[0] || null;
    } catch (_) { return null; }
  }

  // Listen for badge unlocks (fired by vx-tokens realtime)
  window.addEventListener('vx:badge-unlocked', async function(e) {
    var badgeId = e.detail && e.detail.badge_id;
    if (!badgeId) return;
    var badge = await fetchBadgeInfo(badgeId);
    if (!badge) return;

    showBadgeToast(badge);
    triggerConfetti();
  });

  // Listen for balance changes — low balance warning
  var _lowBalanceShown = false;
  window.addEventListener('vx:balance-changed', function(e) {
    var bal = e.detail && e.detail.balance;
    if (typeof bal !== 'number') return;

    if (bal === 0 && !_lowBalanceShown) {
      _lowBalanceShown = true;
      showToast(t('zeroBalance'), 'warning', 8000, { label: t('recharge'), href: 'https://volynx.world/pricing/#tokens' });
    } else if (bal > 0 && bal <= 3 && !_lowBalanceShown) {
      _lowBalanceShown = true;
      showToast(t('lowBalance', { n: bal }), 'warning', 7000, { label: t('recharge'), href: 'https://volynx.world/pricing/#tokens' });
    } else if (bal > 5) {
      _lowBalanceShown = false;
    }
  });

  // ── Toast UI ──

  function showToast(message, type, duration, action) {
    type = type || 'info';
    duration = duration || 4000;

    var toast = document.createElement('div');
    toast.className = 'vx-game-toast vx-game-toast--' + type;
    toast.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'z-index:99998',
      'max-width:360px',
      'padding:14px 18px',
      'border-radius:14px',
      'font-family:Manrope,system-ui,sans-serif',
      'font-size:.88rem',
      'font-weight:600',
      'line-height:1.5',
      'color:#fff',
      'background:rgba(12,14,22,.95)',
      'border:1px solid rgba(255,255,255,.12)',
      'backdrop-filter:blur(14px)',
      'box-shadow:0 10px 40px rgba(0,0,0,.4)',
      'transform:translateY(20px)',
      'opacity:0',
      'transition:all .3s cubic-bezier(.34,1.56,.64,1)',
      'display:flex',
      'align-items:center',
      'gap:12px',
    ].join(';');

    var colors = {
      success: { border: 'rgba(52,211,153,.4)', glow: 'rgba(52,211,153,.15)', icon: '✨' },
      warning: { border: 'rgba(245,197,66,.4)', glow: 'rgba(245,197,66,.15)', icon: '⚡' },
      info:    { border: 'rgba(139,250,240,.35)', glow: 'rgba(139,250,240,.12)', icon: '🔥' },
    };
    var c = colors[type] || colors.info;
    toast.style.borderColor = c.border;
    toast.style.boxShadow = '0 10px 40px rgba(0,0,0,.4), 0 0 24px ' + c.glow;

    var actionHtml = action
      ? '<a href="' + action.href + '" style="display:inline-block;margin-top:6px;padding:6px 14px;border-radius:999px;background:linear-gradient(135deg,#34D399,#8bfaf0);color:#0c0e16;font-weight:700;font-size:.78rem;text-decoration:none;">' + action.label + '</a>'
      : '';

    toast.innerHTML =
      '<span style="font-size:1.3rem;flex-shrink:0;">' + c.icon + '</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div>' + escapeHtml(message) + '</div>' +
        actionHtml +
      '</div>';

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(function() {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(function() {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(function(){ toast.remove(); }, 400);
    }, duration);
  }

  function showBadgeToast(badge) {
    var tierColors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#f5c542',
      platinum: '#e5e4e2',
    };
    var color = tierColors[badge.tier] || tierColors.silver;

    var toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%) scale(.7)',
      'z-index:99999',
      'padding:28px 36px',
      'border-radius:20px',
      'font-family:Manrope,system-ui,sans-serif',
      'color:#fff',
      'background:radial-gradient(ellipse at top,' + color + '22,rgba(12,14,22,.98))',
      'border:2px solid ' + color,
      'box-shadow:0 20px 60px rgba(0,0,0,.6), 0 0 80px ' + color + '44',
      'text-align:center',
      'opacity:0',
      'transition:all .5s cubic-bezier(.34,1.56,.64,1)',
    ].join(';');

    toast.innerHTML =
      '<div style="font-size:4rem;margin-bottom:8px;">' + (badge.icon || '🏆') + '</div>' +
      '<div style="font-size:.72rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:' + color + ';margin-bottom:4px;">' + (badge.tier || 'unlocked') + '</div>' +
      '<div style="font-size:1.2rem;font-weight:800;">' + escapeHtml(badge.label) + '</div>';

    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%,-50%) scale(1)';
    });

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,-50%) scale(.7)';
      setTimeout(function(){ toast.remove(); }, 500);
    }, 3500);
  }

  // ── Confetti ──

  function triggerConfetti() {
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99997;overflow:hidden;';
    document.body.appendChild(container);

    var colors = ['#34D399', '#8bfaf0', '#b196ff', '#f5c542', '#ff6b9d'];
    var pieces = 60;

    for (var i = 0; i < pieces; i++) {
      var piece = document.createElement('div');
      var color = colors[Math.floor(Math.random() * colors.length)];
      var size = 6 + Math.random() * 8;
      var left = Math.random() * 100;
      var delay = Math.random() * 0.5;
      var duration = 2 + Math.random() * 2;
      var rotate = Math.random() * 720;

      piece.style.cssText = [
        'position:absolute',
        'top:-20px',
        'left:' + left + '%',
        'width:' + size + 'px',
        'height:' + size + 'px',
        'background:' + color,
        'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px'),
        'opacity:' + (0.7 + Math.random() * 0.3),
        'animation:vxConfettiFall ' + duration + 's cubic-bezier(.2,.8,.4,1) ' + delay + 's forwards',
        '--end-rotate:' + rotate + 'deg',
      ].join(';');

      container.appendChild(piece);
    }

    if (!document.getElementById('vx-confetti-style')) {
      var style = document.createElement('style');
      style.id = 'vx-confetti-style';
      style.textContent = '@keyframes vxConfettiFall { to { transform: translateY(105vh) rotate(var(--end-rotate)); opacity: 0; } }';
      document.head.appendChild(style);
    }

    setTimeout(function(){ container.remove(); }, 5000);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Auto-ping streak on load (authed users)
  if (typeof window !== 'undefined' && getAccessToken()) {
    setTimeout(function(){ pingStreak().catch(function(){}); }, 2500);
  }

  return {
    pingStreak: pingStreak,
    showToast: showToast,
    showBadgeToast: showBadgeToast,
    triggerConfetti: triggerConfetti,
  };
})();
