/* VOLYNX — Clickable Cards
 * Makes entire card surfaces clickable by delegating clicks to the card's
 * primary CTA. Preserves native behavior when user clicks an actual link,
 * button or form element inside the card.
 *
 * Patterns supported across the ecosystem:
 *   .gallery-card  → first <a> or button in .actions
 *   .product-card  → first <a> or button in .actions, fallback to direct .button
 *   .pricing-card  → .pricing-card__cta (VOLYNX) or .pricing-cta (Daily)
 *   .token-card    → .token-card__cta (ignores Pix alt button)
 *   .hub-card      → first <a> or button in .actions
 *   .feature-card  → <a class="label"> or first <a>
 *   .spotlight-card → .button--gold or first .button
 */
(function () {
  'use strict';

  var PATTERNS = [
    { card: '.gallery-card',   ctas: ['.actions a', '.actions button'] },
    { card: '.product-card',   ctas: ['.actions a', '.actions button', 'a.button'] },
    { card: '.pricing-card',   ctas: ['.pricing-card__cta', '.pricing-cta'] },
    { card: '.token-card',     ctas: ['.token-card__cta'] },
    { card: '.hub-card',       ctas: ['.actions a', '.actions button'] },
    { card: '.feature-card',   ctas: ['a.label', 'a'] },
    { card: '.spotlight-card', ctas: ['.button--gold', 'a.button', 'button.button'] }
  ];

  function findCta(card, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var cta = card.querySelector(selectors[i]);
      if (cta) return cta;
    }
    return null;
  }

  function applyCursor() {
    for (var i = 0; i < PATTERNS.length; i++) {
      var els = document.querySelectorAll(PATTERNS[i].card);
      for (var j = 0; j < els.length; j++) {
        if (findCta(els[j], PATTERNS[i].ctas)) {
          els[j].style.cursor = 'pointer';
        }
      }
    }
  }

  function onClick(e) {
    // Let clicks on real interactive elements pass through untouched.
    var interactive = e.target.closest && e.target.closest(
      'a, button, input, textarea, select, label, summary, [role="button"]'
    );

    for (var i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      var card = e.target.closest(p.card);
      if (!card) continue;

      // Clicked a real interactive element inside this card → let the browser handle it.
      if (interactive && card.contains(interactive)) return;

      var cta = findCta(card, p.ctas);
      if (cta) {
        e.preventDefault();
        cta.click();
      }
      return;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCursor);
  } else {
    applyCursor();
  }
  document.addEventListener('click', onClick);

  // Re-apply cursor after dynamic content (e.g. Astro view transitions or JS that mutates the DOM).
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () { applyCursor(); });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
})();
