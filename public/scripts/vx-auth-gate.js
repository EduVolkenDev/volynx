/**
 * vx-auth-gate.js
 * Runs on Studio pages. Checks auth + plan, then exposes window.vxPlan.
 * Redirects to /login if not authenticated.
 *
 * Depends on: /js/vx-plan.js (must be loaded first)
 */
(async function vxAuthGate() {
  var LOGIN_PATH = '/login/';
  var PRICING_PATH = '/pricing/';
  var LAB_PATH = '/volynx-lab/';
  var API_TIMEOUT = 5000; // 5s — standardized across the platform

  // ── 0. Fetch config once and cache ─────────────────────────────────────────
  var cfg;
  try {
    cfg = await fetch('/config.json', { cache: 'no-store' }).then(function(r) { return r.json(); });
  } catch (_) {
    cfg = {};
  }

  // ── 1. Check token + auto-refresh if expired ─────────────────────────────
  var token = localStorage.getItem('volynx_access_token') || '';
  var refreshToken = localStorage.getItem('volynx_refresh_token') || '';

  if (!token) {
    var next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(LOGIN_PATH + '?next=' + next);
    return;
  }

  // Try to refresh the session to get a fresh token
  try {
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && refreshToken) {
      var refreshRes = await fetch(cfg.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshRes.ok) {
        var sess = await refreshRes.json();
        if (sess.access_token) {
          token = sess.access_token;
          localStorage.setItem('volynx_access_token', sess.access_token);
          if (sess.refresh_token) localStorage.setItem('volynx_refresh_token', sess.refresh_token);
        }
      }
    }
  } catch (_) {}

  // ── 2. Resolve plan — cache-first, then backend ─────────────────────────
  var plan = 'free';
  var proFeatures = [];

  // Check plan cache first (avoids redundant API call on every page load)
  var cached = window.VxPlan ? window.VxPlan.getCached() : null;
  if (cached) {
    plan = cached.plan;
  }

  try {
    var apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');

    if (apiBase) {
      var tool = window.__vxTool || 'qr-gen';
      var ctrl = new AbortController();
      var t = setTimeout(function() { ctrl.abort(); }, API_TIMEOUT);
      var res = await fetch(apiBase + '/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ tool: tool }),
        signal: ctrl.signal,
      });
      clearTimeout(t);

      if (res.ok) {
        var data = await res.json();
        // Use effective_tier for accurate hierarchy (studio, teams, etc.)
        // Fall back to plan field for backward compat
        plan = window.VxPlan
          ? window.VxPlan.normalize(data.effective_tier || data.builder_plan || data.plan)
          : (data.effective_tier || data.builder_plan || data.plan || 'free');
        proFeatures = data.pro_features || [];
        // Update plan cache with actual tier, not the binary plan flag
        if (window.VxPlan) window.VxPlan.cache(plan);
      }
    }
  } catch (_) {
    // Network error or timeout — use cached plan or 'free', don't block user
  }

  // ── 3. Expose plan globally ────────────────────────────────────────────────
  plan = window.VxPlan ? window.VxPlan.normalize(plan) : plan;
  window.vxPlan = plan;
  window.vxProFeatures = proFeatures;
  window.vxAuthenticated = true;

  // ── 4. Apply plan-based UI ─────────────────────────────────────────────────
  document.body.dataset.plan = plan;

  // Show/hide elements with data-require-plan="pro"
  document.querySelectorAll('[data-require-plan]').forEach(function(el) {
    var required = el.dataset.requirePlan;
    var hasAccess = window.VxPlan
      ? window.VxPlan.canAccess(plan, required)
      : (plan !== 'free');
    if (!hasAccess) {
      el.style.display = 'none';
    }
  });

  // Show upgrade banner if on free plan
  var isFree = window.VxPlan ? !window.VxPlan.isPaid(plan) : (plan === 'free');
  if (isFree) {
    var banner = document.getElementById('vx-upgrade-banner');
    if (banner) banner.style.display = '';
  }

  // Block access to pro-only tools for free users
  // ALL Studio tools require at least a paid plan
  var proOnlyTools = ['converter', 'image-scaler', 'image-suite', 'qr-gen'];
  var currentTool = window.__vxTool || '';

  if (isFree && proOnlyTools.indexOf(currentTool) !== -1) {
    var toolLabel = currentTool.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    var main = document.querySelector('main');
    if (main) {
      main.innerHTML = '<div style="text-align:center;padding:80px 24px;max-width:480px;margin:0 auto;">'
        + '<div style="font-size:48px;margin-bottom:16px;">&#128274;</div>'
        + '<h2 style="font-size:24px;font-weight:800;margin-bottom:10px;">Pro feature</h2>'
        + '<p style="opacity:.6;line-height:1.6;margin-bottom:24px;">' + toolLabel + ' Studio is available on paid plans. Upgrade to unlock unlimited processing, batch mode, and commercial rights.</p>'
        + '<a href="' + PRICING_PATH + '" style="display:inline-flex;padding:12px 28px;border-radius:12px;background:rgba(109,94,252,.2);border:1px solid rgba(109,94,252,.5);color:rgba(200,185,255,.95);font-weight:600;text-decoration:none;">See pricing</a>'
        + ' <a href="' + LAB_PATH + '" style="display:inline-flex;padding:12px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);text-decoration:none;margin-left:8px;">Back to Lab</a>'
        + '</div>';
    }
    return; // Don't dispatch plan-ready, blocking the tool scripts
  }

  // ── 5. Inject Pro visual layer for paid users ────────────────────────────
  var isPaidUser = window.VxPlan ? window.VxPlan.isPaid(plan) : (plan !== 'free');
  if (isPaidUser) {
    // Load Pro CSS
    var proCSS = document.createElement('link');
    proCSS.rel = 'stylesheet';
    proCSS.href = '/styles/studio-pro.css';
    document.head.appendChild(proCSS);

    // Inject Pro top bar
    var toolName = (window.__vxTool || '').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    var planLabel = window.VxPlan ? window.VxPlan.label(plan) : plan;
    var proBar = document.createElement('div');
    proBar.className = 'studio-pro-bar';
    proBar.innerHTML = ''
      + '<div class="studio-pro-bar__left">'
      + '  <span class="studio-pro-bar__badge">Studio ' + planLabel + '</span>'
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
        var apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');
        if (!apiBase) return;
        var res = await fetch(apiBase + '/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ tool: window.__vxTool || 'converter' }),
        });
        if (!res.ok) return;
        var perm = await res.json();
        var el = document.getElementById('proBarUsage');
        if (el) {
          var used = perm.used || 0;
          var limit = perm.limit === -1 ? '\u221E' : perm.limit;
          el.innerHTML = 'Today: <strong>' + used + '</strong> / ' + limit;
        }
      } catch (_) {}
    })();
  }

  // Dispatch event so other scripts can react
  window.dispatchEvent(new CustomEvent('vx:plan-ready', { detail: { plan: plan, proFeatures: proFeatures } }));
})();
