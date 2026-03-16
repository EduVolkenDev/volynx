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
  const btn = document.getElementById('vxLangToggle');
  if (!btn) return;

  const KEY = 'volynx_lang';

  btn.addEventListener('click', () => {
    const current = localStorage.getItem(KEY) || 'en';
    const next = current === 'en' ? 'pt' : 'en';
    localStorage.setItem(KEY, next);
    if (window.applyTranslations) window.applyTranslations(next);
  });
})();
