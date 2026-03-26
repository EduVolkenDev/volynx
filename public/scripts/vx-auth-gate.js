/**
 * vx-auth-gate.js
 * Runs on Studio pages. Checks auth + plan, then exposes window.vxPlan.
 * Redirects to /login if not authenticated.
 */
(async function vxAuthGate() {
  const LOGIN_PATH = '/login/';
  const PRICING_PATH = '/pricing/';

  // ── 1. Check token ──────────────────────────────────────────────────────────
  const token = localStorage.getItem('volynx_access_token') || '';

  if (!token) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${LOGIN_PATH}?next=${next}`);
    return;
  }

  // ── 2. Resolve plan from backend ───────────────────────────────────────────
  let plan = 'free';
  let proFeatures = [];

  try {
    const cfg = await fetch('/config.json', { cache: 'no-store' }).then((r) => r.json());
    const apiBase = (cfg.apiBaseUrl || '').replace(/\/$/, '');

    if (apiBase) {
      const tool = window.__vxTool || 'qr-gen';
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${apiBase}/api/check-permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tool }),
        signal: ctrl.signal,
      });
      clearTimeout(t);

      if (res.ok) {
        const data = await res.json();
        plan = data.plan || 'free';
        proFeatures = data.pro_features || [];
      }
    }
  } catch (_) {
    // Network error or timeout — keep plan as 'free', don't block user
  }

  // ── 3. Expose plan globally ────────────────────────────────────────────────
  window.vxPlan = plan;
  window.vxProFeatures = proFeatures;
  window.vxAuthenticated = true;

  // ── 4. Apply plan-based UI ─────────────────────────────────────────────────
  document.body.dataset.plan = plan;

  // Show/hide elements with data-require-plan="pro"
  document.querySelectorAll('[data-require-plan]').forEach((el) => {
    const required = el.dataset.requirePlan;
    const planRank = { free: 0, pro: 1, teams: 2 };
    const userRank = planRank[plan] ?? 0;
    const reqRank  = planRank[required] ?? 1;
    if (userRank < reqRank) {
      el.style.display = 'none';
    }
  });

  // Show upgrade banner if on free plan
  if (plan === 'free') {
    const banner = document.getElementById('vx-upgrade-banner');
    if (banner) banner.style.display = '';
  }

  // Block access to pro-only tools for free users
  const proOnlyTools = ['image-suite']; // tools that require pro plan
  const currentTool = window.__vxTool || '';
  if (plan === 'free' && proOnlyTools.includes(currentTool)) {
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = '<div style="text-align:center;padding:80px 24px;max-width:480px;margin:0 auto;">'
        + '<div style="font-size:48px;margin-bottom:16px;">🔒</div>'
        + '<h2 style="font-size:24px;font-weight:800;margin-bottom:10px;">Pro feature</h2>'
        + '<p style="opacity:.6;line-height:1.6;margin-bottom:24px;">Image Suite is available on the Pro plan. Upgrade to unlock unlimited processing, batch mode, and commercial rights.</p>'
        + '<a href="/pricing/" style="display:inline-flex;padding:12px 28px;border-radius:12px;background:rgba(109,94,252,.2);border:1px solid rgba(109,94,252,.5);color:rgba(200,185,255,.95);font-weight:600;text-decoration:none;">See pricing</a>'
        + ' <a href="/volynx-lab/" style="display:inline-flex;padding:12px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);text-decoration:none;margin-left:8px;">Back to Lab</a>'
        + '</div>';
    }
    return; // Don't dispatch plan-ready, blocking the tool scripts
  }

  // ── 5. Inject Pro visual layer for pro/enterprise users ────────────────────
  if (plan === 'pro' || plan === 'enterprise') {
    // Load Pro CSS
    var proCSS = document.createElement('link');
    proCSS.rel = 'stylesheet';
    proCSS.href = '/styles/studio-pro.css';
    document.head.appendChild(proCSS);

    // Inject Pro top bar
    var toolName = (window.__vxTool || '').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    var proBar = document.createElement('div');
    proBar.className = 'studio-pro-bar';
    proBar.innerHTML = ''
      + '<div class="studio-pro-bar__left">'
      + '  <span class="studio-pro-bar__badge">Studio Pro</span>'
      + '  <span class="studio-pro-bar__tool">' + (toolName || 'Tool') + '</span>'
      + '</div>'
      + '<div class="studio-pro-bar__right">'
      + '  <span class="studio-pro-bar__usage" id="proBarUsage">Loading...</span>'
      + '  <a class="studio-pro-bar__dash" href="/volynx-lab/studio/">Dashboard</a>'
      + '</div>';

    // Insert after header or at top of body
    var header = document.querySelector('header') || document.querySelector('.vx-header') || document.querySelector('nav');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(proBar, header.nextSibling);
    } else {
      document.body.insertBefore(proBar, document.body.firstChild);
    }

    // Fetch usage for this tool
    (async function() {
      try {
        var cfg = await fetch('/config.json', { cache: 'no-store' }).then(function(r) { return r.json(); });
        var apiBase = (cfg.apiBaseUrl || '').replace(/\/$/, '');
        if (!apiBase) return;
        var res = await fetch(apiBase + '/api/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ tool: window.__vxTool || 'converter' }),
        });
        if (!res.ok) return;
        var perm = await res.json();
        var el = document.getElementById('proBarUsage');
        if (el) {
          var used = perm.used || 0;
          var limit = perm.limit === -1 ? '∞' : perm.limit;
          el.innerHTML = 'Today: <strong>' + used + '</strong> / ' + limit;
        }
      } catch (_) {}
    })();
  }

  // Dispatch event so other scripts can react
  window.dispatchEvent(new CustomEvent('vx:plan-ready', { detail: { plan, proFeatures } }));
})();
