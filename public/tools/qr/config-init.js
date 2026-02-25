(function () {
  var el = document.getElementById("app");
  if (!el) return;
  window.VOLYNX_CORE_URL = el.dataset.coreUrl || "https://simple-qr-generator-z12a.onrender.com";
  window.VOLYNX_QR_BASE = el.dataset.basePath || "/tools/qr";
})();
