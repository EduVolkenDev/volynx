(function () {
  var KEY = 'volynx_lang';
  function getLang() { return localStorage.getItem(KEY) || 'en'; }
  function applyTranslations(lang) {
    if (typeof window.VX_TRANS === 'undefined') return;
    var dict = window.VX_TRANS[lang] || window.VX_TRANS['en'];
    if (!dict) return;
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-html');
      if (dict[key]) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-aria');
      if (dict[key]) el.setAttribute('aria-label', dict[key]);
    });
    // Notify dynamic scripts so they can re-render their own text
    try {
      window.dispatchEvent(new CustomEvent('vx:lang-changed', { detail: { lang: lang } }));
    } catch (_) {}
  }
  window.applyTranslations = applyTranslations;
  applyTranslations(getLang());
})();
