(function initCookieBanner() {
  const STORAGE_KEY = 'volynx_consent_v1';
  const banner = document.getElementById('vxCookie');
  if (!banner) return;

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }

  function saveConsent(analytics) {
    const value = { essential: true, analytics: !!analytics, ts: Date.now() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('volynx:consent', { detail: value }));
    hide();
  }

  function show() { banner.classList.add('vx-cookie--show'); }
  function hide() { banner.classList.remove('vx-cookie--show'); }

  if (!getConsent()) {
    setTimeout(show, 800);
  }

  document.getElementById('vxCookieAccept')?.addEventListener('click', () => saveConsent(true));
  document.getElementById('vxCookieReject')?.addEventListener('click', () => saveConsent(false));

  document.getElementById('vxCookiePrefs')?.addEventListener('click', () => {
    const panel = document.getElementById('vxCookiePanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('vxCookieSave')?.addEventListener('click', () => {
    const analytics = document.getElementById('vxConsentAnalytics')?.checked ?? false;
    saveConsent(analytics);
  });
})();
