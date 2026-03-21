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

  // Dispatch event so other scripts can react
  window.dispatchEvent(new CustomEvent('vx:plan-ready', { detail: { plan, proFeatures } }));
})();
