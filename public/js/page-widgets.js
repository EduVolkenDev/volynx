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
