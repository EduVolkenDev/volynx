(function () {
  var btn = document.getElementById("vxBackTop");
  if (!btn) return;

  function onScroll() {
    if (window.scrollY > 300) {
      btn.classList.add("vx--visible");
    } else {
      btn.classList.remove("vx--visible");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
