/**
 * vx-currency.js — VOLYNX Multi-Currency Switcher
 *
 * Drop-in currency toggle for any page with prices.
 *
 * Usage:
 *   1. Include this script on the page.
 *   2. Add a container with class "vx-currency-bar" — buttons auto-generated.
 *      OR add buttons manually: <button class="vx-cur-btn" data-cur="GBP">£ GBP</button>
 *   3. Mark price elements: <span data-price-gbp="£187" data-price-eur="€219" data-price-brl="R$1.290">£187</span>
 *
 * The active currency is stored in localStorage as volynx_currency.
 * If there is no saved choice, the first suggestion follows browser language
 * and timezone. The user can always override it manually.
 */
(function () {
  "use strict";

  var CURRENCIES = [
    { code: "GBP", symbol: "£", label: "GBP" },
    { code: "EUR", symbol: "€", label: "EUR" },
    { code: "BRL", symbol: "R$", label: "BRL" },
  ];

  var STORAGE_KEY = "volynx_currency";

  function normalize(code) {
    code = String(code || "").toUpperCase();
    return /^(GBP|EUR|BRL)$/.test(code) ? code : "";
  }

  function getUrlCurrency() {
    try {
      return normalize(new URLSearchParams(window.location.search).get("currency"));
    } catch (_) {
      return "";
    }
  }

  function getStored() {
    var urlCurrency = getUrlCurrency();
    if (urlCurrency) {
      try { localStorage.setItem(STORAGE_KEY, urlCurrency); } catch (_) { /* noop */ }
      return urlCurrency;
    }
    try { return normalize(localStorage.getItem(STORAGE_KEY)) || detectFromRegion(); } catch (_) { return detectFromRegion(); }
  }

  function detectFromRegion() {
    var language = String(navigator.language || navigator.userLanguage || "").toLowerCase();
    var timezone = "";
    try { timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone || ""); } catch (_) { /* noop */ }

    var brazilTimezones = ["America/Sao_Paulo", "America/Fortaleza", "America/Recife", "America/Bahia", "America/Belem", "America/Manaus", "America/Cuiaba", "America/Porto_Velho", "America/Boa_Vista", "America/Rio_Branco", "America/Noronha"];
    if (/^pt-br/.test(language) || brazilTimezones.indexOf(timezone) !== -1) return "BRL";
    if (/^(de|fr|es|it|nl|el|fi|sv|da|no|pl|cs|sk|sl|et|lv|lt|ga|mt|cy|hr|hu|ro|bg|pt)(-|$)/.test(language) && timezone.indexOf("Europe/") === 0) return "EUR";
    if (timezone.indexOf("Europe/London") === 0 || /^(en-gb|cy-gb|gd-gb)(-|$)/.test(language)) return "GBP";
    if (timezone.indexOf("Europe/") === 0) return "EUR";
    if (/^pt(-|$)/.test(language)) return "BRL";
    return "GBP";
  }

  function setStored(code) {
    code = normalize(code) || "GBP";
    try { localStorage.setItem(STORAGE_KEY, code); } catch (_) { /* noop */ }
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("currency", code);
      history.replaceState(null, "", url.toString());
    } catch (_) { /* noop */ }
  }

  function apply(code) {
    code = normalize(code) || "GBP";
    // Update all price elements
    var els = document.querySelectorAll("[data-price-gbp], [data-price-eur], [data-price-brl]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var val = el.getAttribute("data-price-" + code.toLowerCase());
      if (val) el.textContent = val;
    }

    // Update active button state
    var btns = document.querySelectorAll(".vx-cur-btn, [data-switch-currency]");
    for (var j = 0; j < btns.length; j++) {
      var btn = btns[j];
      var buttonCode = btn.getAttribute("data-cur") || btn.getAttribute("data-switch-currency");
      if (buttonCode === code) {
        btn.classList.add("vx-cur-btn--active");
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("vx-cur-btn--active");
        btn.classList.remove("is-active");
        btn.setAttribute("aria-pressed", "false");
      }
    }

    // Notify dynamic surfaces (e.g. JS-rendered price cards) so they can
    // re-render with the new currency. Without this event, pages that
    // build prices at runtime (icons store, etc.) render GBP once and
    // never refresh when the user switches currency — creating a
    // display/checkout mismatch where the card shows £ but the checkout
    // goes to the selected currency.
    try {
      window.dispatchEvent(new CustomEvent("vx:currency-changed", {
        detail: { code: code, currency: code.toLowerCase() }
      }));
    } catch (_) { /* ancient browsers */ }
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
    var allBtns = document.querySelectorAll(".vx-cur-btn, [data-switch-currency]");
    for (var k = 0; k < allBtns.length; k++) {
      allBtns[k].addEventListener("click", function () {
        var code = this.getAttribute("data-cur") || this.getAttribute("data-switch-currency");
        setStored(code);
        apply(code);
      });
    }

    // Apply stored currency
    apply(getStored());
  }

  window.VxCurrency = {
    get: getStored,
    detect: detectFromRegion,
    set: function (code) {
      var next = normalize(code) || detectFromRegion();
      setStored(next);
      apply(next);
    }
  };

  // Inject styles once
  var style = document.createElement("style");
  style.textContent = ".vx-currency-bar{display:flex;gap:6px;justify-content:center;margin-bottom:24px;flex-wrap:wrap}" +
    ".vx-cur-btn{padding:10px 16px;min-height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}" +
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
