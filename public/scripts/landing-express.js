(function initLandingExpress() {
  const STRIPE_LINK = 'LINK_STRIPE_AQUI';
  const FORMSPREE_ACTION = 'FORMSPREE_ENDPOINT_AQUI';

  const ctas = ['topCta', 'heroCta', 'midCta', 'finalCta']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (STRIPE_LINK !== 'LINK_STRIPE_AQUI') {
    ctas.forEach((el) => el.setAttribute('href', STRIPE_LINK));
  } else {
    ctas.forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        alert('Defina seu link do Stripe em public/scripts/landing-express.js antes do deploy.');
      });
    });
  }

  const form = document.getElementById('briefForm');
  if (!form) return;

  if (FORMSPREE_ACTION !== 'FORMSPREE_ENDPOINT_AQUI') {
    form.setAttribute('action', FORMSPREE_ACTION);
  } else {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Defina seu endpoint do Formspree em public/scripts/landing-express.js antes do deploy.');
    });
  }
})();
