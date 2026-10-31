(function () {
  if (window.__vxI18nLoaded) return;
  window.__vxI18nLoaded = true;

  var KEY = 'volynx_lang';

  function normalizeLang(value) {
    return String(value || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  }

  function browserLang() {
    try {
      return normalizeLang(navigator.language || navigator.userLanguage || 'en');
    } catch (_) {
      return 'en';
    }
  }

  function getStoredLang() {
    try {
      return localStorage.getItem(KEY);
    } catch (_) {
      return null;
    }
  }

  function persistLang(lang) {
    try {
      localStorage.setItem(KEY, normalizeLang(lang));
    } catch (_) {}
  }

  function getLang() {
    return normalizeLang(getStoredLang() || browserLang());
  }

  function getDict(lang) {
    if (typeof window.VX_TRANS === 'undefined') return null;
    return window.VX_TRANS[normalizeLang(lang)] || window.VX_TRANS.en || null;
  }

  function t(key, fallback, lang) {
    var dict = getDict(lang || getLang()) || {};
    return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : fallback;
  }

  function syncLangUI(lang) {
    var next = normalizeLang(lang);

    document.querySelectorAll('[data-vx-lang-label]').forEach(function (el) {
      el.textContent = next.toUpperCase();
    });

    document.querySelectorAll('[data-vx-lang-title]').forEach(function (el) {
      el.setAttribute('aria-label', t('aria.toggle_lang', 'Toggle language', next));
      el.setAttribute('title', next === 'pt' ? 'Mudar idioma / Switch language' : 'Switch language / Mudar idioma');
    });
  }

  function bindLangToggles(root) {
    var scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-vx-lang-toggle]').forEach(function (el) {
      if (el.dataset.vxLangBound === '1') return;
      el.dataset.vxLangBound = '1';
      el.addEventListener('click', function () {
        setLang(getLang() === 'pt' ? 'en' : 'pt');
      });
    });
  }

  function matchingElements(root, selector) {
    var elements = [];
    if (root && root.nodeType === 1 && typeof root.matches === 'function' && root.matches(selector)) {
      elements.push(root);
    }
    if (root && typeof root.querySelectorAll === 'function') {
      elements = elements.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
    }
    return elements;
  }

  function translateScope(root, dict) {
    matchingElements(root, '[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.textContent = dict[key];
    });

    matchingElements(root, '[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.innerHTML = dict[key];
    });

    matchingElements(root, '[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.setAttribute('placeholder', dict[key]);
    });

    matchingElements(root, '[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.setAttribute('aria-label', dict[key]);
    });

    matchingElements(root, '[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.setAttribute('title', dict[key]);
    });
  }

  function applyTranslations(lang) {
    var next = normalizeLang(lang);
    var dict = getDict(next);
    if (!dict) return;

    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';

    translateScope(document, dict);

    syncLangUI(next);

    try {
      window.dispatchEvent(new CustomEvent('vx:lang-changed', { detail: { lang: next } }));
    } catch (_) {}
  }

  function setLang(lang) {
    var next = normalizeLang(lang);
    persistLang(next);
    applyTranslations(next);
  }

  function init() {
    if (!getStoredLang()) {
      persistLang(browserLang());
    }
    bindLangToggles(document);
    applyTranslations(getLang());

    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function (mutations) {
        var dict = getDict(getLang());
        if (!dict) return;
        mutations.forEach(function (mutation) {
          Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
            if (node.nodeType !== 1) return;
            bindLangToggles(node);
            translateScope(node, dict);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.VxI18n = {
    applyTranslations: applyTranslations,
    bindLangToggles: bindLangToggles,
    getLang: getLang,
    setLang: setLang,
    t: t,
    toggle: function () {
      setLang(getLang() === 'pt' ? 'en' : 'pt');
    }
  };
  window.applyTranslations = applyTranslations;

  window.addEventListener('storage', function (event) {
    if (event.key === KEY) {
      applyTranslations(getLang());
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
