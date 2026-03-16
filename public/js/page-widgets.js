(function initPageWidgets() {
  const backTop = document.getElementById('vxBackTop');
  if (!backTop) return;

  const THRESHOLD = 300;

  function onScroll() {
    backTop.classList.toggle('vx--visible', window.scrollY > THRESHOLD);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

(function initLangToggle() {
  const btn    = document.getElementById('vxLangToggle');
  const label  = btn && btn.querySelector('.vx-lang-label');
  const login  = document.getElementById('vxLoginBtn');
  if (!btn || !label) return;

  const KEY = 'volynx_lang';

  const STRINGS = {
    en: { lang: 'en', htmlLang: 'en', btnLabel: 'EN', login: 'Login' },
    pt: { lang: 'pt', htmlLang: 'pt-BR', btnLabel: 'PT', login: 'Entrar' },
  };

  function apply(lang) {
    const s = STRINGS[lang] || STRINGS.en;
    document.documentElement.lang = s.htmlLang;
    label.textContent = s.btnLabel;
    if (login) login.textContent = s.login;
    localStorage.setItem(KEY, lang);
  }

  const saved = localStorage.getItem(KEY) || 'en';
  apply(saved);

  btn.addEventListener('click', () => {
    const current = localStorage.getItem(KEY) || 'en';
    apply(current === 'en' ? 'pt' : 'en');
  });
})();
