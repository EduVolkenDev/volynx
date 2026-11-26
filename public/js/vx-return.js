/*! vx-return.js — preserves the user's exact task across authentication. */
(function () {
  'use strict';

  var STORAGE_KEY = 'volynx_post_login_next';
  var settings = document.currentScript && document.currentScript.dataset || {};
  var DEFAULT_RETURN = settings.defaultReturn || '/volynx-lab/';
  var RECOVER_PATH = settings.recoverPath || '/auth/recover/';

  function isAuthPath(path) {
    try { path = decodeURIComponent(path); } catch (_) { return true; }
    return /^\/(login|signup|logout|recover|reset-password|auth)(\/|$)/i.test(path.replace(/\\/g, '/'));
  }

  function safePath(value) {
    if (typeof value !== 'string') return '';
    var path = value.trim();
    if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(path)) return '';
    try {
      var url = new URL(path, window.location.origin);
      if (url.origin !== window.location.origin || isAuthPath(url.pathname)) return '';
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return '';
    }
  }

  function currentPath() {
    return safePath(window.location.pathname + window.location.search + window.location.hash) || '/';
  }

  function storedPath() {
    try {
      return safePath(localStorage.getItem(STORAGE_KEY) || '');
    } catch (_) {
      return '';
    }
  }

  function paramPath() {
    try {
      var params = new URLSearchParams(window.location.search);
      return safePath(
        params.get('next')
        || params.get('return')
        || params.get('redirect')
        || ''
      );
    } catch (_) {
      return '';
    }
  }

  function authContextPath() {
    return isAuthPath(window.location.pathname)
      ? (paramPath() || storedPath() || DEFAULT_RETURN)
      : currentPath();
  }

  function remember(value) {
    var path = safePath(value) || authContextPath();
    try {
      localStorage.setItem(STORAGE_KEY, path);
    } catch (_) {}
    return path;
  }

  function consume(fallback) {
    var path = paramPath() || storedPath() || safePath(fallback) || DEFAULT_RETURN;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    return path;
  }

  function authUrl(kind, value) {
    var path = remember(value || authContextPath());
    return '/' + kind + '/?next=' + encodeURIComponent(path);
  }

  function loginUrl(value) {
    return authUrl('login', value);
  }

  function signupUrl(value) {
    return authUrl('signup', value);
  }

  function recoverUrl(value) {
    return RECOVER_PATH + '?next=' + encodeURIComponent(remember(value || authContextPath()));
  }

  function decorateLink(link) {
    try {
      var url = new URL(link.getAttribute('href') || '', window.location.origin);
      if (url.origin !== window.location.origin || !/^\/(login|signup|recover|auth\/recover)\/?$/.test(url.pathname)) return;
      var next = safePath(url.searchParams.get('next') || '') || authContextPath();
      url.searchParams.set('next', next);
      var href = url.pathname + url.search + url.hash;
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
      return next;
    } catch (_) {}
  }

  function redirectToLogin(value, replace) {
    var url = loginUrl(value);
    if (replace) window.location.replace(url);
    else window.location.href = url;
  }

  function decorateAuthLinks(root) {
    var scope = root || document;
    scope.querySelectorAll('a[href]').forEach(decorateLink);
  }

  window.VxReturn = {
    safePath: safePath,
    currentPath: currentPath,
    storedPath: storedPath,
    paramPath: paramPath,
    authContextPath: authContextPath,
    remember: remember,
    consume: consume,
    loginUrl: loginUrl,
    signupUrl: signupUrl,
    recoverUrl: recoverUrl,
    redirectToLogin: redirectToLogin,
    decorateAuthLinks: decorateAuthLinks,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { decorateAuthLinks(document); });
  } else {
    decorateAuthLinks(document);
  }

  // Translations and account widgets can replace links after DOMContentLoaded.
  // Decorate new links too, including links opened via keyboard/context menu.
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'attributes') decorateLink(record.target);
        else record.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches('a[href]')) decorateLink(node);
          decorateAuthLinks(node);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var next = decorateLink(link);
    if (next) remember(next);
  }, true);

  // Keep confirmation links useful even when opened in a different tab/browser.
  if (isAuthPath(window.location.pathname) && paramPath()) remember(paramPath());
  // Older emails targeted login. Forward recovery fragments without persisting
  // their credentials in storage or treating them as a regular login session.
  var fragment = new URLSearchParams(window.location.hash.slice(1));
  var query = new URLSearchParams(window.location.search);
  if (window.location.pathname.replace(/\/$/, '') !== RECOVER_PATH.replace(/\/$/, '')
      && (fragment.get('type') === 'recovery' || query.get('type') === 'recovery')) {
    window.VxReturn.redirectingRecovery = true;
    var recovery = new URL(recoverUrl(), window.location.origin);
    if (query.get('token_hash')) {
      recovery.searchParams.set('token_hash', query.get('token_hash'));
      recovery.searchParams.set('type', 'recovery');
    }
    window.location.replace(recovery.pathname + recovery.search + window.location.hash);
  }
})();
