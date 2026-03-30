/**
 * vx-renderer.js — VOLYNX Builder Section Renderer
 *
 * Converts builder_data JSON → HTML string.
 * Used by: live preview, publish pipeline, export.
 *
 * Usage:
 *   const html = VxRenderer.renderPage(builderData);
 *   iframe.srcdoc = html;
 *
 *   // Or render a single section:
 *   const sectionHtml = VxRenderer.renderSection(section, brand);
 */
window.VxRenderer = (function () {
  'use strict';

  // ── Escape HTML ──
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── CSS Variable Block from brand colors ──
  function buildCssVars(brand) {
    var c = (brand && brand.colors) || {};
    return ':root{' +
      '--vx-primary:' + (c.primary || '#7DD3FC') + ';' +
      '--vx-bg:' + (c.bg || '#070A12') + ';' +
      '--vx-fg:' + (c.fg || '#E7EEF7') + ';' +
      '--vx-accent:' + (c.accent || '#34D399') + ';' +
      '--vx-muted:rgba(231,238,247,.55);' +
      '--vx-line:rgba(231,238,247,.08);' +
      '--vx-glass:rgba(255,255,255,.03);' +
      '--vx-glass-border:rgba(255,255,255,.06);' +
    '}';
  }

  // ── Base Stylesheet ──
  var BASE_CSS = [
    '*,*::before,*::after{box-sizing:border-box;margin:0;}',
    'html{scroll-behavior:smooth;}',
    'body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:var(--vx-bg);color:var(--vx-fg);line-height:1.6;-webkit-font-smoothing:antialiased;}',
    'a{color:inherit;text-decoration:none;}',
    'img{max-width:100%;display:block;}',

    // Shell
    '.vx-shell{max-width:1120px;margin:0 auto;padding:0 24px;}',

    // Section base
    '.vx-section{padding:80px 0;}',
    '.vx-section+.vx-section{border-top:1px solid var(--vx-line);}',

    // Typography
    '.vx-badge{display:inline-block;font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--vx-primary);background:rgba(125,211,252,.08);border:1px solid rgba(125,211,252,.15);border-radius:999px;padding:4px 14px;margin-bottom:16px;}',
    '.vx-eyebrow{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--vx-primary);margin-bottom:12px;}',
    '.vx-h1{font-size:clamp(2rem,5vw,3.4rem);font-weight:800;line-height:1.1;letter-spacing:-.02em;margin-bottom:20px;}',
    '.vx-h2{font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:700;line-height:1.15;letter-spacing:-.015em;margin-bottom:12px;}',
    '.vx-h3{font-size:1.15rem;font-weight:700;line-height:1.3;margin-bottom:6px;}',
    '.vx-sub{font-size:1.05rem;color:var(--vx-muted);line-height:1.65;max-width:640px;}',
    '.vx-sub--center{margin-left:auto;margin-right:auto;text-align:center;}',
    '.vx-text-center{text-align:center;}',

    // Buttons
    '.vx-btn{display:inline-flex;align-items:center;padding:12px 28px;border-radius:999px;font-size:.9rem;font-weight:700;border:none;cursor:pointer;transition:transform .15s,box-shadow .15s;}',
    '.vx-btn--primary{background:var(--vx-primary);color:var(--vx-bg);}',
    '.vx-btn--primary:hover{transform:translateY(-2px);box-shadow:0 0 24px rgba(125,211,252,.2);}',
    '.vx-btn--ghost{background:rgba(255,255,255,.04);border:1px solid var(--vx-line);color:var(--vx-fg);}',
    '.vx-btn--ghost:hover{background:rgba(255,255,255,.08);}',
    '.vx-btn-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;}',

    // Grid helpers
    '.vx-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}',
    '.vx-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}',
    '.vx-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}',
    '@media(max-width:768px){.vx-grid-2,.vx-grid-3,.vx-grid-4{grid-template-columns:1fr;}}',

    // Cards
    '.vx-card{padding:24px;border-radius:16px;background:var(--vx-glass);border:1px solid var(--vx-glass-border);backdrop-filter:blur(8px);}',
    '.vx-card--highlight{border-color:var(--vx-primary);background:rgba(125,211,252,.04);}',

    // Hero
    '.vx-hero{padding:100px 0 80px;text-align:center;}',
    '.vx-hero--split .vx-shell{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;text-align:left;}',
    '.vx-hero--minimal{padding:120px 0 60px;}',
    '@media(max-width:768px){.vx-hero--split .vx-shell{grid-template-columns:1fr;text-align:center;}}',

    // Logo cloud
    '.vx-logos{display:flex;flex-wrap:wrap;justify-content:center;gap:28px;align-items:center;}',
    '.vx-logos span{font-size:.88rem;font-weight:600;color:var(--vx-muted);opacity:.6;letter-spacing:.04em;}',

    // Metrics
    '.vx-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center;}',
    '.vx-metric-val{font-size:2rem;font-weight:800;color:var(--vx-primary);line-height:1;}',
    '.vx-metric-lbl{font-size:.82rem;color:var(--vx-muted);margin-top:6px;}',
    '@media(max-width:600px){.vx-metrics{grid-template-columns:repeat(2,1fr);}}',

    // Workflow
    '.vx-workflow{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}',
    '.vx-step-num{font-size:2rem;font-weight:800;color:var(--vx-primary);opacity:.4;margin-bottom:8px;}',
    '@media(max-width:768px){.vx-workflow{grid-template-columns:1fr;}}',

    // FAQ
    '.vx-faq-item{padding:20px 0;border-bottom:1px solid var(--vx-line);}',
    '.vx-faq-q{font-weight:700;font-size:1rem;margin-bottom:8px;}',
    '.vx-faq-a{color:var(--vx-muted);font-size:.92rem;line-height:1.6;}',

    // Features list
    '.vx-features li{padding:8px 0;border-bottom:1px solid var(--vx-line);font-size:.92rem;}',
    '.vx-features li:last-child{border-bottom:none;}',

    // Pricing
    '.vx-price{font-size:2.2rem;font-weight:800;line-height:1;}',
    '.vx-price-period{font-size:.85rem;color:var(--vx-muted);font-weight:400;}',
    '.vx-tier-features{list-style:none;padding:0;margin:16px 0 24px;}',
    '.vx-tier-features li{padding:6px 0;font-size:.88rem;color:var(--vx-muted);}',
    '.vx-tier-features li::before{content:"\\2713 ";color:var(--vx-accent);margin-right:6px;}',

    // CTA block
    '.vx-cta-block{text-align:center;padding:100px 0;}',
  ].join('\n');

  // ── Section Renderers ──

  function renderHero(s, brand) {
    var c = s.content || {};
    var v = s.variant || 'centered';
    var cls = 'vx-hero' + (v === 'split' ? ' vx-hero--split' : '') + (v === 'minimal' ? ' vx-hero--minimal' : '');
    var h = '<section class="vx-section ' + cls + '">';
    h += '<div class="vx-shell">';
    h += '<div>';
    if (c.badge) h += '<span class="vx-badge">' + esc(c.badge) + '</span>';
    h += '<h1 class="vx-h1">' + esc(c.title) + '</h1>';
    if (c.subtitle) h += '<p class="vx-sub">' + esc(c.subtitle) + '</p>';
    h += '<div class="vx-btn-row">';
    if (c.primaryCta) h += '<a class="vx-btn vx-btn--primary" href="' + esc(c.primaryCta.href || '#') + '">' + esc(c.primaryCta.label) + '</a>';
    if (c.secondaryCta) h += '<a class="vx-btn vx-btn--ghost" href="' + esc(c.secondaryCta.href || '#') + '">' + esc(c.secondaryCta.label) + '</a>';
    h += '</div></div>';
    if (v === 'split') h += '<div class="vx-hero-visual"></div>';
    h += '</div></section>';
    return h;
  }

  function renderLogoCloud(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell vx-text-center">';
    if (c.title) h += '<p class="vx-eyebrow">' + esc(c.title) + '</p>';
    h += '<div class="vx-logos">';
    (c.items || []).forEach(function (name) {
      h += '<span>' + esc(name) + '</span>';
    });
    h += '</div></div></section>';
    return h;
  }

  function renderMetrics(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell">';
    if (c.title) h += '<h2 class="vx-h2 vx-text-center" style="margin-bottom:40px;">' + esc(c.title) + '</h2>';
    h += '<div class="vx-metrics">';
    (c.items || []).forEach(function (m) {
      h += '<div><div class="vx-metric-val">' + esc(m.value) + '</div><div class="vx-metric-lbl">' + esc(m.label) + '</div></div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function renderValueGrid(s) {
    var c = s.content || {};
    var cards = c.cards || [];
    var cols = cards.length <= 3 ? 'vx-grid-3' : 'vx-grid-4';
    if (cards.length === 2) cols = 'vx-grid-2';
    var h = '<section class="vx-section"><div class="vx-shell">';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub" style="margin-bottom:32px;">' + esc(c.subtitle) + '</p>';
    h += '<div class="' + cols + '">';
    cards.forEach(function (card) {
      h += '<div class="vx-card"><h3 class="vx-h3">' + esc(card.title) + '</h3><p style="color:var(--vx-muted);font-size:.9rem;">' + esc(card.description) + '</p></div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function renderFeatureSplit(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;">';
    h += '<div>';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub">' + esc(c.subtitle) + '</p>';
    if (c.primaryCta) {
      h += '<div class="vx-btn-row"><a class="vx-btn vx-btn--primary" href="' + esc(c.primaryCta.href || '#') + '">' + esc(c.primaryCta.label) + '</a></div>';
    }
    h += '</div><div><ul class="vx-features" style="list-style:none;padding:0;">';
    (c.features || []).forEach(function (f) {
      h += '<li>' + esc(f.text || f) + '</li>';
    });
    h += '</ul></div></div></section>';
    return h;
  }

  function renderPricing(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell vx-text-center">';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub vx-sub--center" style="margin-bottom:40px;">' + esc(c.subtitle) + '</p>';
    var tiers = c.tiers || [];
    h += '<div class="vx-grid-' + Math.min(tiers.length, 3) + '" style="text-align:left;">';
    tiers.forEach(function (t) {
      var cls = t.highlight ? 'vx-card vx-card--highlight' : 'vx-card';
      h += '<div class="' + cls + '">';
      h += '<h3 class="vx-h3">' + esc(t.name) + '</h3>';
      h += '<div style="margin:12px 0;"><span class="vx-price">' + esc(t.price) + '</span>';
      if (t.period) h += '<span class="vx-price-period">' + esc(t.period) + '</span>';
      h += '</div>';
      if (t.description) h += '<p style="color:var(--vx-muted);font-size:.88rem;margin-bottom:12px;">' + esc(t.description) + '</p>';
      if (t.features) {
        h += '<ul class="vx-tier-features">';
        t.features.forEach(function (f) { h += '<li>' + esc(f) + '</li>'; });
        h += '</ul>';
      }
      if (t.cta) h += '<a class="vx-btn ' + (t.highlight ? 'vx-btn--primary' : 'vx-btn--ghost') + '" href="' + esc(t.cta.href || '#') + '" style="width:100%;justify-content:center;">' + esc(t.cta.label) + '</a>';
      h += '</div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function renderFaq(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell" style="max-width:800px;">';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    (c.items || []).forEach(function (item) {
      h += '<div class="vx-faq-item"><div class="vx-faq-q">' + esc(item.question) + '</div><div class="vx-faq-a">' + esc(item.answer) + '</div></div>';
    });
    h += '</div></section>';
    return h;
  }

  function renderWorkflow(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell">';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub" style="margin-bottom:32px;">' + esc(c.subtitle) + '</p>';
    h += '<div class="vx-workflow">';
    (c.steps || []).forEach(function (step) {
      h += '<div class="vx-card"><div class="vx-step-num">' + esc(step.step) + '</div><h3 class="vx-h3">' + esc(step.title) + '</h3><p style="color:var(--vx-muted);font-size:.9rem;">' + esc(step.description) + '</p></div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function renderCta(s) {
    var c = s.content || {};
    var h = '<section class="vx-section vx-cta-block"><div class="vx-shell">';
    h += '<h2 class="vx-h1">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub vx-sub--center">' + esc(c.subtitle) + '</p>';
    h += '<div class="vx-btn-row" style="justify-content:center;">';
    if (c.primaryCta) h += '<a class="vx-btn vx-btn--primary" href="' + esc(c.primaryCta.href || '#') + '">' + esc(c.primaryCta.label) + '</a>';
    if (c.secondaryCta) h += '<a class="vx-btn vx-btn--ghost" href="' + esc(c.secondaryCta.href || '#') + '">' + esc(c.secondaryCta.label) + '</a>';
    h += '</div></div></section>';
    return h;
  }

  function renderContactForm(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell" style="max-width:640px;">';
    if (c.title) h += '<h2 class="vx-h2 vx-text-center">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub vx-sub--center" style="margin-bottom:32px;">' + esc(c.subtitle) + '</p>';
    h += '<form class="vx-contact-form" style="display:grid;gap:16px;" onsubmit="return false;">';
    var fields = c.fields || [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'message', label: 'Message', type: 'textarea' },
    ];
    fields.forEach(function (f) {
      h += '<label style="display:grid;gap:6px;font-size:.85rem;font-weight:600;color:var(--vx-muted);">' + esc(f.label);
      if (f.type === 'textarea') {
        h += '<textarea rows="4" style="padding:12px;border-radius:12px;border:1px solid var(--vx-line);background:var(--vx-glass);color:var(--vx-fg);font:inherit;resize:vertical;"></textarea>';
      } else {
        h += '<input type="' + esc(f.type || 'text') + '" style="padding:12px;border-radius:12px;border:1px solid var(--vx-line);background:var(--vx-glass);color:var(--vx-fg);font:inherit;" />';
      }
      h += '</label>';
    });
    h += '<button class="vx-btn vx-btn--primary" type="submit" style="justify-content:center;">' + esc(c.submitLabel || 'Send message') + '</button>';
    h += '</form></div></section>';
    return h;
  }

  function renderProblemStatement(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell" style="max-width:800px;">';
    if (c.badge) h += '<span class="vx-badge">' + esc(c.badge) + '</span>';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    if (c.description) h += '<p class="vx-sub" style="margin-bottom:24px;">' + esc(c.description) + '</p>';
    if (c.points && c.points.length) {
      h += '<ul style="list-style:none;padding:0;display:grid;gap:12px;">';
      c.points.forEach(function (p) {
        h += '<li style="padding:14px 20px;border-radius:12px;background:rgba(255,100,100,.04);border:1px solid rgba(255,100,100,.1);font-size:.92rem;color:var(--vx-muted);">' + esc(p) + '</li>';
      });
      h += '</ul>';
    }
    h += '</div></section>';
    return h;
  }

  function renderScopeGrid(s) {
    var c = s.content || {};
    var items = c.items || [];
    var h = '<section class="vx-section"><div class="vx-shell">';
    if (c.title) h += '<h2 class="vx-h2">' + esc(c.title) + '</h2>';
    if (c.subtitle) h += '<p class="vx-sub" style="margin-bottom:32px;">' + esc(c.subtitle) + '</p>';
    h += '<div class="vx-grid-2">';
    items.forEach(function (item) {
      h += '<div class="vx-card"><h3 class="vx-h3">' + esc(item.title || item) + '</h3>';
      if (item.description) h += '<p style="color:var(--vx-muted);font-size:.88rem;">' + esc(item.description) + '</p>';
      h += '</div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function renderTestimonial(s) {
    var c = s.content || {};
    var h = '<section class="vx-section"><div class="vx-shell" style="max-width:720px;text-align:center;">';
    if (c.title) h += '<p class="vx-eyebrow">' + esc(c.title) + '</p>';
    h += '<blockquote style="font-size:1.3rem;font-style:italic;line-height:1.6;margin:0 0 20px;color:var(--vx-fg);">';
    h += '&ldquo;' + esc(c.quote) + '&rdquo;';
    h += '</blockquote>';
    if (c.author) h += '<p style="color:var(--vx-muted);font-size:.9rem;font-weight:600;">' + esc(c.author);
    if (c.role) h += ' &mdash; ' + esc(c.role);
    h += '</p>';
    h += '</div></section>';
    return h;
  }

  // ── Section Router ──

  var RENDERERS = {
    hero: renderHero,
    logoCloud: renderLogoCloud,
    metrics: renderMetrics,
    valueGrid: renderValueGrid,
    featureSplit: renderFeatureSplit,
    pricing: renderPricing,
    faq: renderFaq,
    workflow: renderWorkflow,
    cta: renderCta,
    contactForm: renderContactForm,
    problemStatement: renderProblemStatement,
    scopeGrid: renderScopeGrid,
    testimonial: renderTestimonial,
  };

  function renderSection(section, brand) {
    var fn = RENDERERS[section.type];
    if (!fn) return '<!-- unknown section: ' + esc(section.type) + ' -->';
    return fn(section, brand);
  }

  // ── Full Page Render ──

  function renderPage(data) {
    var brand = data.brand || {};
    var sections = data.sections || [];

    var html = '<!DOCTYPE html><html lang="' + esc((data.meta && data.meta.language) || 'en') + '">';
    html += '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
    html += '<title>' + esc(brand.name || 'VOLYNX Site') + '</title>';
    html += '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">';
    html += '<style>' + buildCssVars(brand) + '\n' + BASE_CSS + '</style>';
    html += '</head><body>';

    sections.forEach(function (s) {
      html += renderSection(s, brand);
    });

    // Powered by badge (removed for Pro users via publish pipeline)
    html += '<footer style="text-align:center;padding:32px 0;border-top:1px solid var(--vx-line);font-size:.75rem;color:var(--vx-muted);">';
    html += 'Built with <a href="https://volynx.world" style="color:var(--vx-primary);font-weight:600;" target="_blank" rel="noopener">VOLYNX</a>';
    html += '</footer>';

    html += '</body></html>';
    return html;
  }

  // ── Public API ──

  return {
    renderPage: renderPage,
    renderSection: renderSection,
    buildCssVars: buildCssVars,
    BASE_CSS: BASE_CSS,
    RENDERERS: RENDERERS,
    esc: esc,
  };
})();
