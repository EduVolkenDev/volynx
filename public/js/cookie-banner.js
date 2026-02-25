(function () {
  var KEY = "volynx_consent_v1";
  var el = document.getElementById("vxCookie");
  var panel = document.getElementById("vxCookiePanel");
  var btnAccept = document.getElementById("vxCookieAccept");
  var btnReject = document.getElementById("vxCookieReject");
  var btnPrefs = document.getElementById("vxCookiePrefs");
  var btnSave = document.getElementById("vxCookieSave");
  var chkAnalytics = document.getElementById("vxConsentAnalytics");

  if (!el || !btnAccept || !btnReject || !btnPrefs || !btnSave || !chkAnalytics || !panel) return;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function write(c) {
    localStorage.setItem(KEY, JSON.stringify(c));
    try { window.dispatchEvent(new CustomEvent("volynx:consent", { detail: c })); } catch (e) {}
  }
  function show() {
    requestAnimationFrame(function () { el.classList.add("vx-cookie--show"); });
  }
  function hide() {
    el.classList.remove("vx-cookie--show");
  }

  if (!read()) show();

  btnAccept.addEventListener("click", function () {
    write({ essential: true, analytics: true, ts: Date.now() });
    hide();
  });
  btnReject.addEventListener("click", function () {
    write({ essential: true, analytics: false, ts: Date.now() });
    hide();
  });
  btnPrefs.addEventListener("click", function () {
    var isHidden = panel.style.display === "none" || panel.style.display === "";
    panel.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      var s = read();
      chkAnalytics.checked = !!(s && s.analytics);
    }
  });
  btnSave.addEventListener("click", function () {
    write({ essential: true, analytics: chkAnalytics.checked, ts: Date.now() });
    hide();
  });
})();
