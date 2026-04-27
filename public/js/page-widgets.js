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

(function initSessionWidget() {
  const loginBtn = document.getElementById('vxLoginBtn');
  if (!loginBtn) return;

  const token = localStorage.getItem('volynx_access_token');
  if (!token) return;

  // Try to get name from session metadata first
  let displayName = '';
  try {
    const sessionRaw = localStorage.getItem('volynx_session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      const meta = session?.user?.user_metadata || {};
      displayName = meta.full_name || meta.username || meta.name || '';
    }
  } catch (e) {}

  const email = localStorage.getItem('volynx_user_email') || '';
  // Show first name, or email prefix as fallback
  const label = displayName
    ? displayName.split(' ')[0]
    : (email ? email.split('@')[0] : '??');
  const initials = label.slice(0, 2).toUpperCase();

  loginBtn.href = '/profile/';
  loginBtn.textContent = initials;
  loginBtn.setAttribute('aria-label', 'Open profile');
  loginBtn.setAttribute('title', displayName || email || 'My profile');
  loginBtn.classList.add('vx--logged-in');
  loginBtn.removeAttribute('data-i18n');
})();

(function initLangToggle() {
  if (window.VxI18n && typeof window.VxI18n.bindLangToggles === 'function') {
    window.VxI18n.bindLangToggles(document);
  }
})();
