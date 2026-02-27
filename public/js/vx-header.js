(function () {
  var btn = document.getElementById("menuBtn");
  var menu = document.getElementById("mobileMenu");
  if (!btn || !menu) return;

  function setOpen(open) {
    btn.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    if (open) menu.classList.add("vx--open");
    else menu.classList.remove("vx--open");
  }

  setOpen(false);

  btn.addEventListener("click", function () {
    var isOpen = btn.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  // Close when clicking a link
  menu.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.tagName === "A") setOpen(false);
  });

  // Close on Escape
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();