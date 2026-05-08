/**
 * vx-avatar.js (PT-2d)
 *
 * Cross-page avatar resolver. Reads cached avatar from localStorage and
 * renders into any element marked `data-vx-avatar-slot`. Falls back to
 * plan-default avatar when no explicit pick exists.
 *
 * Cache shape (set by /profile/ on save and on initial load):
 *   { id: "diamond-1" | null, src: "/assets/...webp", ts: 1731... }
 *
 * Usage:
 *   <a class="vx-avatar" data-vx-avatar-slot data-vx-avatar-fallback="ME">
 *     <span class="vx-avatar__initials"></span>
 *   </a>
 *   <script src="/js/vx-avatar.js" defer></script>
 *
 * If avatar resolves: replaces inner content with <img>.
 * Else: leaves the existing inner content alone (SVG icon, initials, etc.).
 *
 * Depends on: /js/vx-plan.js (for cache + tier lookups)
 */
(function () {
  'use strict';

  var AVATAR_CACHE_KEY = 'volynx_avatar_cache';
  var AVATAR_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — avatars rarely change

  // Catalog mirror (src/data/avatars.ts) — id → src.
  // Keep in sync with src/data/avatars.ts and supabase/functions/update-avatar.
  var CATALOG_BY_ID = {
    'free-1':    '/assets/bd-assets/avatarfree4.webp',
    'launch-1':  '/assets/bd-assets/avatarlaunch4.webp',
    'pro-1':     '/assets/bd-assets/avatarpro4.webp',
    'diamond-1': '/assets/bd-assets/avatardiamond4.webp',
    'studio-1':  '/assets/bd-assets/avatarstudio4.webp',
    'teams-1':   '/assets/bd-assets/avatarteams4.webp',
    'bd-main':   '/assets/bd-assets/bd-main-avatar.webp',
    'bd-1':      '/assets/bd-assets/avatarbd.webp',
    'bd-2':      '/assets/bd-assets/avatarbd2.webp',
    'bd-alt-1':  '/assets/bd-assets/bd-avatar1.webp',
    'bd-alt-2':  '/assets/bd-assets/bd-avatar2.webp',
    'bd-alt-3':  '/assets/bd-assets/bd-avatar3.webp',
    'bd-alt-4':  '/assets/bd-assets/bd-avatar4.webp',
    'bd-black':  '/assets/bd-assets/avatarblack.webp',
    'bd-gold':   '/assets/bd-assets/avatargold.webp',
  };

  // Plan-default avatar map. Mirrors defaultAvatarFor() from src/data/avatars.ts.
  var DEFAULT_BY_PLAN = {
    free: CATALOG_BY_ID['free-1'],
    launch: CATALOG_BY_ID['launch-1'],
    business: CATALOG_BY_ID['pro-1'],
    pro: CATALOG_BY_ID['pro-1'],
    diamond: CATALOG_BY_ID['diamond-1'],
    studio: CATALOG_BY_ID['studio-1'],
    teams: CATALOG_BY_ID['teams-1'],
    enterprise: CATALOG_BY_ID['teams-1'],
  };
  var BD_DEFAULT = CATALOG_BY_ID['bd-main'];

  function srcForId(id) {
    if (!id) return null;
    return CATALOG_BY_ID[id] || null;
  }

  function readAvatarCache() {
    try {
      var raw = localStorage.getItem(AVATAR_CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.src) return null;
      if (Date.now() - (data.ts || 0) > AVATAR_CACHE_TTL) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function defaultAvatarSrc() {
    var plan = 'free';
    var isBd = false;
    try {
      if (window.VxPlan && typeof window.VxPlan.getCachedRelaxed === 'function') {
        var view = window.VxPlan.getCachedRelaxed();
        plan = view.plan;
        isBd = view.isBlackDiamond;
      }
    } catch (_) {}
    if (isBd) return BD_DEFAULT;
    return DEFAULT_BY_PLAN[plan] || DEFAULT_BY_PLAN.free;
  }

  function resolveSrc() {
    var cached = readAvatarCache();
    if (cached && cached.src) return cached.src;
    return defaultAvatarSrc();
  }

  function isAuthed() {
    try {
      var token = localStorage.getItem('volynx_access_token') || '';
      if (!token) return false;
      // Quick JWT freshness check
      var payload = token.split('.')[1];
      if (!payload) return false;
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      var data = JSON.parse(atob(payload));
      if (!data || !data.exp) return false;
      return (data.exp * 1000) > (Date.now() + 30000);
    } catch (_) {
      return false;
    }
  }

  function applyToSlot(slot) {
    if (!slot) return;
    if (!isAuthed()) return; // leave SVG/icon for guests
    var src = resolveSrc();
    if (!src) return;

    var existingImg = slot.querySelector('.vx-avatar__img');
    if (existingImg) {
      if (existingImg.getAttribute('src') !== src) existingImg.setAttribute('src', src);
      return;
    }

    // Hide non-image content (SVG icon, initials)
    Array.prototype.forEach.call(slot.children, function (child) {
      if (!child.classList.contains('vx-avatar__img')) child.style.display = 'none';
    });

    var img = document.createElement('img');
    img.className = 'vx-avatar__img';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.src = src;
    img.loading = 'eager';
    img.decoding = 'async';
    slot.appendChild(img);
  }

  function applyAll() {
    var slots = document.querySelectorAll('[data-vx-avatar-slot]');
    Array.prototype.forEach.call(slots, applyToSlot);
  }

  // Apply on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }

  // React to plan/avatar changes
  window.addEventListener('vx:plan-ready', applyAll);
  window.addEventListener('storage', function (e) {
    if (e.key === AVATAR_CACHE_KEY || e.key === 'volynx_plan_cache') applyAll();
  });

  // Public API
  window.VxAvatar = {
    resolve: resolveSrc,
    apply: applyAll,
    srcForId: srcForId,
    /** Cache by id (resolves to src via catalog) or by explicit src. */
    cache: function (idOrPayload, srcMaybe) {
      var id = null;
      var src = '';
      if (typeof idOrPayload === 'object' && idOrPayload !== null) {
        id = idOrPayload.id || null;
        src = idOrPayload.src || (id ? srcForId(id) : '') || '';
      } else {
        id = idOrPayload || null;
        src = srcMaybe || (id ? srcForId(id) : '') || '';
      }
      try {
        localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify({ id: id, src: src, ts: Date.now() }));
      } catch (_) {}
      applyAll();
    },
    clear: function () {
      try { localStorage.removeItem(AVATAR_CACHE_KEY); } catch (_) {}
    },
  };
})();
