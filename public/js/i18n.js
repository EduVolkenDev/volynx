/* i18n engine — applies translations from window.VX_TRANS based on volynx_lang.
   Runs immediately (defer order: translations.js → i18n.js → page-widgets.js). */
(function () {
  var KEY = 'volynx_lang';

  function getLang() {
    return localStorage.getItem(KEY) || 'en';
  }

  function applyTranslations(lang) {
    if (typeof window.VX_TRANS === 'undefined') return;
    var dict = window.VX_TRANS[lang] || window.VX_TRANS['en'];
    if (!dict) return;

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

    /* textContent replacement */
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        els[i].textContent = dict[key];
      }
    }

    /* innerHTML replacement (for elements with HTML content like <strong>, <a>) */
    var hEls = document.querySelectorAll('[data-i18n-html]');
    for (var h = 0; h < hEls.length; h++) {
      var hKey = hEls[h].getAttribute('data-i18n-html');
      if (Object.prototype.hasOwnProperty.call(dict, hKey)) {
        hEls[h].innerHTML = dict[hKey];
      }
    }

    /* placeholder attribute */
    var pEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < pEls.length; j++) {
      var pKey = pEls[j].getAttribute('data-i18n-placeholder');
      if (Object.prototype.hasOwnProperty.call(dict, pKey)) {
        pEls[j].setAttribute('placeholder', dict[pKey]);
      }
    }

    /* aria-label attribute */
    var aEls = document.querySelectorAll('[data-i18n-aria]');
    for (var k = 0; k < aEls.length; k++) {
      var aKey = aEls[k].getAttribute('data-i18n-aria');
      if (Object.prototype.hasOwnProperty.call(dict, aKey)) {
        aEls[k].setAttribute('aria-label', dict[aKey]);
      }
    }
  }

  window.applyTranslations = applyTranslations;

  /* Apply immediately — defer scripts run after DOM is ready */
  applyTranslations(getLang());
})();
