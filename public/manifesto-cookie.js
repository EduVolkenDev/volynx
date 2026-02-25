document.addEventListener("DOMContentLoaded", function () {
  var KEY = "volynx_consent_v1";
  var el = document.getElementById("vxCookie");
  var panel = document.getElementById("vxCookiePanel");
  var btnAccept = document.getElementById("vxCookieAccept");
  var btnReject = document.getElementById("vxCookieReject");
  var btnPrefs = document.getElementById("vxCookiePrefs");
  var btnSave = document.getElementById("vxCookieSave");
  var chkAnalytics = document.getElementById("vxConsentAnalytics");

  if (!el || !btnAccept || !btnReject || !btnPrefs || !btnSave) return;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }

  function write(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("volynx:consent", { detail: c }));
  }

  function open() {
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add("is-on"); });
  }

  function close() {
    el.classList.remove("is-on");
    setTimeout(function () { el.hidden = true; }, 180);
  }

  if (!read()) open();

  btnAccept.addEventListener("click", function () {
    write({ essential: true, analytics: true, ts: Date.now() });
    close();
  });

  btnReject.addEventListener("click", function () {
    write({ essential: true, analytics: false, ts: Date.now() });
    close();
  });

  btnPrefs.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      var s = read();
      if (chkAnalytics) chkAnalytics.checked = !!(s && s.analytics);
    }
  });

  btnSave.addEventListener("click", function () {
    write({ essential: true, analytics: chkAnalytics ? chkAnalytics.checked : false, ts: Date.now() });
    close();
  });
});
