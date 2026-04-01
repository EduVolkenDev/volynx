/**
 * plan-aware-ui.js
 * Runs on all pages. Detects user plan and adjusts upgrade CTAs.
 * Reads plan from: 1) VxPlan cache, 2) Supabase profile row direct
 */
(function () {
  'use strict';

  var token = localStorage.getItem('volynx_access_token') || '';
  if (!token) return;

  // 1. Check cached plan first (instant)
  var cached = window.VxPlan ? window.VxPlan.getCached() : null;
  if (cached && cached.plan && cached.plan !== 'free') {
    console.log('[plan-ui] from cache:', cached.plan);
    applyPlanUI(cached.plan);
    return;
  }

  // 2. Fetch plan from Supabase profile row directly
  fetch('/config.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

      // Decode user ID from JWT
      var userId = null;
      try {
        var parts = token.split('.');
        if (parts.length === 3) {
          var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          userId = payload.sub;
        }
      } catch (_) {}
      if (!userId) { console.log('[plan-ui] could not decode JWT'); return; }

      return fetch(cfg.supabaseUrl + '/rest/v1/profiles?id=eq.' + userId + '&select=plan,builder_plan', {
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
      }).then(function (res) {
        console.log('[plan-ui] supabase response:', res.status);
        if (!res.ok) return;
        return res.json();
      }).then(function (rows) {
        if (!rows || !rows[0]) { console.log('[plan-ui] no profile row'); return; }
        var plan = (rows[0].builder_plan || rows[0].plan || 'free').toLowerCase().trim();
        console.log('[plan-ui] plan from DB:', plan);
        if (window.VxPlan) window.VxPlan.cache(plan);
        applyPlanUI(plan);
      });
    })
    .catch(function (err) { console.log('[plan-ui] error:', err); });

  function applyPlanUI(plan) {
    var isPaid = window.VxPlan ? window.VxPlan.isPaid(plan) : (plan !== 'free');
    if (!isPaid) return;

    var planLabel = window.VxPlan ? window.VxPlan.label(plan) : (plan.charAt(0).toUpperCase() + plan.slice(1));
    console.log('[plan-ui] applying UI for plan:', planLabel);

    // Update header CTA buttons — match common upgrade labels
    var upgradeTexts = ['go pro', 'start pro', 'unlock studio pro', 'builder pro', 'open builder', 'start building', 'ir de pro', 'desbloquear studio pro'];
    document.querySelectorAll('.button--gold').forEach(function (btn) {
      var text = (btn.textContent || '').trim().toLowerCase();
      if (upgradeTexts.indexOf(text) !== -1) {
        btn.textContent = planLabel + ' \u2713';
        btn.href = '/profile/';
      }
    });

    // Update "Upgrade plan" links
    document.querySelectorAll('.plan-cta, [data-i18n="profile.btn_upgrade"]').forEach(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      if (t.includes('upgrade') || t.includes('fazer upgrade')) {
        el.textContent = 'Manage plan';
      }
    });

    // Add plan badge to body
    document.body.dataset.userPlan = plan;

    // Update login buttons to show profile link
    document.querySelectorAll('.header-link, .vx-login-btn').forEach(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      if (t === 'login' || t === 'entrar') {
        el.textContent = planLabel;
        el.href = '/profile/';
        el.classList.add('vx--logged-in');
      }
    });
  }
})();
