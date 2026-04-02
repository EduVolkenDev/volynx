/**
 * vx-currency.js — VOLYNX Multi-Currency Switcher
 *
 * Drop-in currency toggle for any page with prices.
 *
 * Usage:
 *   1. Include this script on the page.
 *   2. Add a container with class "vx-currency-bar" — buttons auto-generated.
 *      OR add buttons manually: <button class="vx-cur-btn" data-cur="GBP">£ GBP</button>
 *   3. Mark price elements: <span data-price-gbp="£149" data-price-eur="€179" data-price-brl="R$1.049">£149</span>
 *
 * The active currency is stored in localStorage as volynx_currency.
 * Default: GBP.
 */
(function () {
  "use strict";

  var CURRENCIES = [
    { code: "GBP", symbol: "£", label: "GBP" },
    { code: "EUR", symbol: "€", label: "EUR" },
    { code: "BRL", symbol: "R$", label: "BRL" },
  ];

  var STORAGE_KEY = "volynx_currency";

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY) || "GBP"; } catch (_) { return "GBP"; }
  }

  function setStored(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (_) { /* noop */ }
  }

  function apply(code) {
    // Update all price elements
    var els = document.querySelectorAll("[data-price-gbp], [data-price-eur], [data-price-brl]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var val = el.getAttribute("data-price-" + code.toLowerCase());
      if (val) el.textContent = val;
    }

    // Update active button state
    var btns = document.querySelectorAll(".vx-cur-btn");
    for (var j = 0; j < btns.length; j++) {
      var btn = btns[j];
      if (btn.getAttribute("data-cur") === code) {
        btn.classList.add("vx-cur-btn--active");
      } else {
        btn.classList.remove("vx-cur-btn--active");
      }
    }
  }

  function init() {
    // Auto-generate buttons in .vx-currency-bar containers
    var bars = document.querySelectorAll(".vx-currency-bar");
    for (var b = 0; b < bars.length; b++) {
      var bar = bars[b];
      if (bar.children.length > 0) continue; // already populated
      for (var c = 0; c < CURRENCIES.length; c++) {
        var cur = CURRENCIES[c];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vx-cur-btn";
        btn.setAttribute("data-cur", cur.code);
        btn.textContent = cur.symbol + " " + cur.label;
        bar.appendChild(btn);
      }
    }

    // Bind click handlers
    var allBtns = document.querySelectorAll(".vx-cur-btn");
    for (var k = 0; k < allBtns.length; k++) {
      allBtns[k].addEventListener("click", function () {
        var code = this.getAttribute("data-cur");
        setStored(code);
        apply(code);
      });
    }

    // Apply stored currency
    apply(getStored());
  }

  // Inject styles once
  var style = document.createElement("style");
  style.textContent = ".vx-currency-bar{display:flex;gap:4px;justify-content:center;margin-bottom:24px}" +
    ".vx-cur-btn{padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}" +
    ".vx-cur-btn:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.8)}" +
    ".vx-cur-btn--active{background:rgba(125,211,252,.12);border-color:rgba(125,211,252,.3);color:#7DD3FC}";
  document.head.appendChild(style);

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
