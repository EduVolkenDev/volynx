/*! vx-return.js — preserves the user's exact task across authentication. */
(function () {
  'use strict';

  var STORAGE_KEY = 'volynx_post_login_next';
  var AUTH_PATHS = ['/login/', '/signup/', '/auth/confirm/', '/auth/recover/'];

  function safePath(value) {
    if (typeof value !== 'string') return '';
    var path = value.trim();
    if (!path || !path.startsWith('/') || path.startsWith('//')) return '';
    try {
      var url = new URL(path, window.location.origin);
      if (url.origin !== window.location.origin) return '';
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
    var current = currentPath();
    var isAuthPage = AUTH_PATHS.some(function (path) {
      return current === path || current.startsWith(path + '?') || current.startsWith(path + '#');
    });
    return isAuthPage ? (paramPath() || storedPath() || '/volynx-lab/') : current;
  }

  function remember(value) {
    var path = safePath(value) || currentPath();
    try {
      localStorage.setItem(STORAGE_KEY, path);
    } catch (_) {}
    return path;
  }

  function consume(fallback) {
    var path = paramPath() || storedPath() || safePath(fallback) || '/volynx-lab/';
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

  function redirectToLogin(value, replace) {
    var url = loginUrl(value);
    if (replace) window.location.replace(url);
    else window.location.href = url;
  }

  function decorateAuthLinks(root) {
    var scope = root || document;
    var context = authContextPath();
    scope.querySelectorAll('a[href^="/login/"], a[href^="/signup/"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      var kind = href.startsWith('/signup/') ? 'signup' : 'login';
      var explicit = '';
      try {
        explicit = safePath(new URL(href, window.location.origin).searchParams.get('next') || '');
      } catch (_) {}
      var next = explicit || context;
      link.setAttribute('href', '/' + kind + '/?next=' + encodeURIComponent(next));
      link.addEventListener('click', function () {
        remember(next);
      });
    });
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
    redirectToLogin: redirectToLogin,
    decorateAuthLinks: decorateAuthLinks,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { decorateAuthLinks(document); });
  } else {
    decorateAuthLinks(document);
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (!href.startsWith('/login/') && !href.startsWith('/signup/')) return;
    var kind = href.startsWith('/signup/') ? 'signup' : 'login';
    var explicit = '';
    try {
      explicit = safePath(new URL(href, window.location.origin).searchParams.get('next') || '');
    } catch (_) {}
    var next = remember(explicit || authContextPath());
    link.setAttribute('href', '/' + kind + '/?next=' + encodeURIComponent(next));
  }, true);
})();
