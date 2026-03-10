(function initDevJourneyModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  function openModal() {
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('modal--open');
    document.body.classList.add('vx-modal-open');
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('modal--open');
    document.body.classList.remove('vx-modal-open');
  }

  ['openLogin3', 'openLogin4'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', openModal);
  });

  document.getElementById('closeModal')?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
})();
