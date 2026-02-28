(() => {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    }
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();
