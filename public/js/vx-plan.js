/**
 * vx-plan.js
 * Client-side plan helpers — mirrors src/data/plans.ts for browser use.
 * Single source of truth for plan IDs, hierarchy, and comparison.
 *
 * Usage:
 *   <script src="/js/vx-plan.js"></script>
 *   VxPlan.canAccess('pro', 'pro')   // true
 *   VxPlan.isPaid('launch')           // true
 *   VxPlan.normalize('Pro')           // 'pro'
 *   VxPlan.label('pro')               // 'Pro'
 *   VxPlan.getCached()                // { plan: 'pro', ts: 1711... } or null
 */
window.VxPlan = (function () {
  'use strict';

  var PLAN_IDS = ['free', 'launch', 'pro', 'studio', 'teams', 'enterprise'];

  var PLAN_RANK = {
    free: 0,
    launch: 1,
    pro: 2,
    studio: 3,
    teams: 4,
    enterprise: 5,
  };

  var PLAN_LABELS = {
    free: 'Free',
    launch: 'Launch',
    pro: 'Pro',
    studio: 'Studio',
    teams: 'Teams',
    enterprise: 'Enterprise',
  };

  var CACHE_KEY = 'volynx_plan_cache';
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /** Normalize any plan string to a valid PlanId, defaulting to 'free' */
  function normalize(raw) {
    if (!raw || typeof raw !== 'string') return 'free';
    var lower = raw.trim().toLowerCase();
    return PLAN_IDS.indexOf(lower) !== -1 ? lower : 'free';
  }

  /** Returns true if userPlan meets or exceeds requiredPlan */
  function canAccess(userPlan, requiredPlan) {
    var userRank = PLAN_RANK[normalize(userPlan)] || 0;
    var reqRank = PLAN_RANK[normalize(requiredPlan)] || 0;
    return userRank >= reqRank;
  }

  /** Returns true if the plan is any paid tier */
  function isPaid(plan) {
    var n = normalize(plan);
    return n !== 'free';
  }

  /** Returns the display label for a plan */
  function label(plan) {
    return PLAN_LABELS[normalize(plan)] || 'Free';
  }

  /** Returns numeric rank for a plan (0=free, 5=enterprise) */
  function rank(plan) {
    return PLAN_RANK[normalize(plan)] || 0;
  }

  // ── Plan caching ────────────────────────────────────────────────

  /** Cache the current plan in localStorage with a TTL */
  function cache(plan) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        plan: normalize(plan),
        ts: Date.now(),
      }));
    } catch (_) {}
  }

  /** Get cached plan if still valid, otherwise null */
  function getCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  /** Clear the plan cache (call on logout) */
  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  // ── Usage cleanup ───────────────────────────────────────────────

  /** Clear all Volynx usage data from localStorage (call on logout) */
  function clearAllUsage() {
    var keysToRemove = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && (
          key.indexOf('volynx_') === 0 &&
          key !== 'volynx_lang' // preserve language preference
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (_) {}
  }

  return {
    PLAN_IDS: PLAN_IDS,
    PLAN_RANK: PLAN_RANK,
    normalize: normalize,
    canAccess: canAccess,
    isPaid: isPaid,
    label: label,
    rank: rank,
    cache: cache,
    getCached: getCached,
    clearCache: clearCache,
    clearAllUsage: clearAllUsage,
  };
})();
