(function initLandingExpress() {
  var STRIPE_LINK = 'LINK_STRIPE_AQUI';
  var FORMSPREE_ACTION = 'FORMSPREE_ENDPOINT_AQUI';
  var FALLBACK_URL = '/contact/?product=landing-express';

  var ctas = ['topCta', 'heroCta', 'midCta', 'finalCta']
    .map(function(id) { return document.getElementById(id); })
    .filter(Boolean);

  if (STRIPE_LINK !== 'LINK_STRIPE_AQUI') {
    ctas.forEach(function(el) { el.setAttribute('href', STRIPE_LINK); });
  } else {
    ctas.forEach(function(el) { el.setAttribute('href', FALLBACK_URL); });
  }

  var form = document.getElementById('briefForm');
  if (!form) return;

  if (FORMSPREE_ACTION !== 'FORMSPREE_ENDPOINT_AQUI') {
    form.setAttribute('action', FORMSPREE_ACTION);
  } else {
    form.setAttribute('action', 'mailto:hello@volynx.world?subject=Landing%20Express%20Brief');
    form.setAttribute('method', 'post');
    form.setAttribute('enctype', 'text/plain');
  }
})();
