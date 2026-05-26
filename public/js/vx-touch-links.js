/* VOLYNX — touch link guard
 * iOS Safari can treat the first tap on links with hover-driven visual states
 * as a hover activation. On coarse pointers, route normal anchors on touchend
 * so navigation happens on the first deliberate tap.
 */
(function () {
  "use strict";

  var isTouchLike = false;
  try {
    isTouchLike = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  } catch (_) {
    isTouchLike = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }
  if (!isTouchLike) return;

  var startX = 0;
  var startY = 0;
  var moved = false;

  function closestAnchor(target) {
    return target && target.closest ? target.closest("a[href]") : null;
  }

  function shouldUseNative(anchor) {
    if (!anchor || anchor.dataset.touchNative === "true") return true;
    if (anchor.hasAttribute("download")) return true;
    if (anchor.target && anchor.target !== "_self") return true;

    var rawHref = anchor.getAttribute("href") || "";
    if (!rawHref || rawHref.charAt(0) === "#") return true;
    if (/^(javascript:|mailto:|tel:|sms:)/i.test(rawHref)) return true;

    return false;
  }

  document.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    moved = false;
  }, { passive: true });

  document.addEventListener("touchmove", function (event) {
    if (!event.touches || event.touches.length !== 1) return;
    if (Math.abs(event.touches[0].clientX - startX) > 10 || Math.abs(event.touches[0].clientY - startY) > 10) {
      moved = true;
    }
  }, { passive: true });

  document.addEventListener("touchend", function (event) {
    if (moved || event.defaultPrevented) return;

    var anchor = closestAnchor(event.target);
    if (shouldUseNative(anchor)) return;

    var url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (_) {
      return;
    }

    if (url.href === window.location.href) return;

    event.preventDefault();
    window.location.assign(url.href);
  }, { capture: true, passive: false });
})();
