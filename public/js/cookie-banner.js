(function () {
  var STORAGE_KEY = 'volynx_consent_v1';
  var banner = document.getElementById('vxCookie');
  if (!banner) return;

  if (localStorage.getItem(STORAGE_KEY)) return;

  setTimeout(function () {
    banner.classList.add('vx-cookie--show');
  }, 800);

  function saveConsent(analytics) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      essential: true,
      analytics: !!analytics,
      timestamp: Date.now()
    }));
    banner.classList.remove('vx-cookie--show');
    window.dispatchEvent(new CustomEvent('volynx:consent', { detail: { analytics: !!analytics } }));
  }

  var acceptBtn = document.getElementById('vxCookieAccept');
  var rejectBtn = document.getElementById('vxCookieReject');
  var prefsBtn  = document.getElementById('vxCookiePrefs');
  var saveBtn   = document.getElementById('vxCookieSave');
  var panel     = document.getElementById('vxCookiePanel');
  var analyticsCheck = document.getElementById('vxConsentAnalytics');

  if (acceptBtn) acceptBtn.addEventListener('click', function () { saveConsent(true); });
  if (rejectBtn) rejectBtn.addEventListener('click', function () { saveConsent(false); });
  if (prefsBtn)  prefsBtn.addEventListener('click', function () {
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  if (saveBtn) saveBtn.addEventListener('click', function () {
    saveConsent(analyticsCheck ? analyticsCheck.checked : false);
  });
})();
