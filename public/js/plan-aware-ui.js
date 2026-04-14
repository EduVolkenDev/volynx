/**
 * plan-aware-ui.js
 * Runs on all pages. Detects user plan and adjusts UI:
 * - Replaces upgrade CTAs with plan badge
 * - Hides "Go Pro" buttons for paid users
 * - Shows plan label in header
 */
(function () {
  'use strict';

  var token = localStorage.getItem('volynx_access_token') || '';
  if (!token) return;

  // 1. Check cached plan first (instant, avoids flash)
  var cached = window.VxPlan ? window.VxPlan.getCached() : null;
  if (cached && cached.plan && cached.plan !== 'free') {
    applyPlanUI(cached.plan);
  }

  // 2. Always fetch fresh plan from Supabase (authoritative)
  fetch('/config.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

      var userId = null;
      try {
        var parts = token.split('.');
        if (parts.length === 3) {
          var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          userId = payload.sub;
        }
      } catch (_) {}
      if (!userId) return;

      return fetch(cfg.supabaseUrl + '/rest/v1/profiles?id=eq.' + userId + '&select=plan,builder_plan,daily_plan', {
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
      }).then(function (res) {
        if (!res.ok) return;
        return res.json();
      }).then(function (rows) {
        if (!rows || !rows[0]) return;
        var _rank = { free: 0, launch: 1, pro: 2, diamond: 2, studio: 3, teams: 4, enterprise: 5 };
        var _plans = [rows[0].plan, rows[0].builder_plan, rows[0].daily_plan]
          .map(function(p) { return (p || 'free').toLowerCase().trim(); });
        var plan = _plans.reduce(function(best, p) {
          return (_rank[p] || 0) > (_rank[best] || 0) ? p : best;
        }, 'free');
        if (window.VxPlan) window.VxPlan.cache(plan);
        applyPlanUI(plan);
      });
    })
    .catch(function () {});

  function applyPlanUI(plan) {
    var isPaid = window.VxPlan ? window.VxPlan.isPaid(plan) : (plan !== 'free');
    if (!isPaid) return;

    var planLabel = window.VxPlan ? window.VxPlan.label(plan) : (plan.charAt(0).toUpperCase() + plan.slice(1));

    // ── Replace ALL gold upgrade buttons with plan badge ──
    // Any .button--gold that links to /pricing/ or has data-vx-hide-if-plan
    document.querySelectorAll('.button--gold').forEach(function (btn) {
      var href = (btn.getAttribute('href') || '').toLowerCase();
      var hasHideAttr = btn.hasAttribute('data-vx-hide-if-plan');

      // Skip buttons that are specific product CTAs (not upgrade CTAs)
      if (href && !href.includes('pricing') && !href.includes('profile') && !hasHideAttr) return;

      btn.textContent = planLabel + ' \u2713';
      btn.href = '/profile/';
      btn.style.pointerEvents = '';
      // Restyle as a subtle badge instead of loud CTA
      btn.style.background = 'rgba(139,250,240,.08)';
      btn.style.borderColor = 'rgba(139,250,240,.2)';
      btn.style.color = 'rgba(139,250,240,.9)';
      // Remove hide attribute so gating doesn't re-hide this badge
      btn.removeAttribute('data-vx-hide-if-plan');
    });

    // ── Update "Upgrade" / "Fazer upgrade" text anywhere ──
    document.querySelectorAll('.plan-cta, [data-i18n*="upgrade"], [data-i18n*="manage_plan"]').forEach(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      if (t.includes('upgrade') || t.includes('fazer upgrade') || t.includes('go pro') || t.includes('ir de pro')) {
        el.textContent = 'Manage plan';
      }
    });

    // ── Set plan on body for CSS-based gating ──
    document.body.dataset.userPlan = plan;

    // ── Update login buttons → show plan label ──
    document.querySelectorAll('.header-link, .vx-login-link, .vx-login-btn').forEach(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      if (t === 'login' || t === 'entrar' || t === 'sign in') {
        el.textContent = planLabel;
        el.href = '/profile/';
        el.classList.add('vx--logged-in');
      }
    });

    // ── Re-run VxPlan gating (in case it ran before plan was loaded) ──
    if (window.VxPlan && window.VxPlan.applyPlanGating) {
      window.VxPlan.applyPlanGating();
    }
  }
})();
