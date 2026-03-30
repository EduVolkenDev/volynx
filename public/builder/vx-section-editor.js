/**
 * vx-section-editor.js — VOLYNX Builder Section Editor
 *
 * Renders structured edit forms for each section type.
 * Replaces raw JSON as the primary editing surface.
 *
 * Usage:
 *   VxSectionEditor.render(container, builderData, onChange)
 */
window.VxSectionEditor = (function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Section type metadata ──
  var SECTION_META = {
    hero:             { label: 'Hero',            icon: '🏠', desc: 'Main headline and call to action' },
    logoCloud:        { label: 'Logo Cloud',      icon: '🏢', desc: 'Trusted-by company logos' },
    metrics:          { label: 'Metrics',         icon: '📊', desc: 'Key numbers and stats' },
    valueGrid:        { label: 'Value Grid',      icon: '✦',  desc: 'Feature cards in a grid' },
    featureSplit:     { label: 'Feature List',    icon: '📋', desc: 'Features with optional CTA' },
    pricing:          { label: 'Pricing',         icon: '💰', desc: 'Plan comparison cards' },
    faq:              { label: 'FAQ',             icon: '❓', desc: 'Questions and answers' },
    workflow:         { label: 'Process',         icon: '⚙️', desc: 'Step-by-step workflow' },
    cta:              { label: 'Call to Action',  icon: '🎯', desc: 'Final conversion block' },
    contactForm:      { label: 'Contact Form',   icon: '✉️', desc: 'Inline contact form' },
    problemStatement: { label: 'Problem',         icon: '⚠️', desc: 'Pain points and challenges' },
    scopeGrid:        { label: 'Scope',           icon: '📦', desc: 'Deliverables overview' },
    testimonial:      { label: 'Testimonial',     icon: '💬', desc: 'Client quote' },
  };

  // ── Field Builders ──

  function fieldText(label, value, path, onChange, opts) {
    opts = opts || {};
    var id = 'vxf_' + path.replace(/\./g, '_');
    var ph = opts.placeholder || '';
    return '<div class="se-field">' +
      '<label class="se-label" for="' + id + '">' + esc(label) + '</label>' +
      '<input class="se-input" id="' + id + '" type="text" value="' + esc(value) + '" placeholder="' + esc(ph) + '" data-path="' + esc(path) + '" />' +
    '</div>';
  }

  function fieldTextarea(label, value, path, opts) {
    opts = opts || {};
    var id = 'vxf_' + path.replace(/\./g, '_');
    return '<div class="se-field se-field--full">' +
      '<label class="se-label" for="' + id + '">' + esc(label) + '</label>' +
      '<textarea class="se-textarea" id="' + id + '" rows="' + (opts.rows || 3) + '" data-path="' + esc(path) + '">' + esc(value) + '</textarea>' +
    '</div>';
  }

  function fieldSelect(label, value, options, path) {
    var id = 'vxf_' + path.replace(/\./g, '_');
    var opts = options.map(function (o) {
      var val = typeof o === 'string' ? o : o.value;
      var lbl = typeof o === 'string' ? o : o.label;
      return '<option value="' + esc(val) + '"' + (val === value ? ' selected' : '') + '>' + esc(lbl) + '</option>';
    }).join('');
    return '<div class="se-field">' +
      '<label class="se-label" for="' + id + '">' + esc(label) + '</label>' +
      '<select class="se-select" id="' + id + '" data-path="' + esc(path) + '">' + opts + '</select>' +
    '</div>';
  }

  // ── Section Form Renderers ──

  function formHero(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = '<div class="se-row">';
    h += fieldText('Badge', c.badge, p + 'badge', null, { placeholder: 'e.g. Now in beta' });
    h += fieldSelect('Variant', s.variant || 'centered', [
      { value: 'centered', label: 'Centered' },
      { value: 'split', label: 'Split' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'product', label: 'Product' },
    ], idx + '.variant');
    h += '</div>';
    h += fieldText('Headline', c.title, p + 'title', null, { placeholder: 'Your main headline' });
    h += fieldTextarea('Subtitle', c.subtitle, p + 'subtitle');
    h += '<div class="se-row">';
    h += fieldText('Button label', (c.primaryCta || {}).label, p + 'primaryCta.label', null, { placeholder: 'Get started' });
    h += fieldText('Button link', (c.primaryCta || {}).href, p + 'primaryCta.href', null, { placeholder: '#pricing' });
    h += '</div>';
    h += '<div class="se-row">';
    h += fieldText('Secondary label', (c.secondaryCta || {}).label, p + 'secondaryCta.label', null, { placeholder: 'Learn more' });
    h += fieldText('Secondary link', (c.secondaryCta || {}).href, p + 'secondaryCta.href', null, { placeholder: '#' });
    h += '</div>';
    return h;
  }

  function formLogoCloud(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Section title', c.title, p + 'title', null, { placeholder: 'Trusted by' });
    h += fieldTextarea('Company names', (c.items || []).join(', '), p + 'items', { rows: 2 });
    h += '<p class="se-hint">Separate names with commas</p>';
    return h;
  }

  function formMetrics(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Section title', c.title, p + 'title', null, { placeholder: 'By the numbers' });
    var items = c.items || [];
    h += '<div class="se-items-label">Metrics</div>';
    items.forEach(function (item, i) {
      h += '<div class="se-row se-row--tight">';
      h += fieldText('Value', item.value, p + 'items.' + i + '.value', null, { placeholder: '99.9%' });
      h += fieldText('Label', item.label, p + 'items.' + i + '.label', null, { placeholder: 'Uptime' });
      h += '</div>';
    });
    return h;
  }

  function formValueGrid(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Section title', c.title, p + 'title');
    h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    var cards = c.cards || [];
    h += '<div class="se-items-label">Cards (' + cards.length + ')</div>';
    cards.forEach(function (card, i) {
      h += '<div class="se-card-group">';
      h += fieldText('Title', card.title, p + 'cards.' + i + '.title');
      h += fieldTextarea('Description', card.description, p + 'cards.' + i + '.description', { rows: 2 });
      h += '</div>';
    });
    return h;
  }

  function formFeatureSplit(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Title', c.title, p + 'title');
    h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    var feats = (c.features || []).map(function (f) { return f.text || f; }).join('\n');
    h += fieldTextarea('Features', feats, p + 'features', { rows: 5 });
    h += '<p class="se-hint">One feature per line</p>';
    if (c.primaryCta) {
      h += '<div class="se-row">';
      h += fieldText('CTA label', c.primaryCta.label, p + 'primaryCta.label');
      h += fieldText('CTA link', c.primaryCta.href, p + 'primaryCta.href');
      h += '</div>';
    }
    return h;
  }

  function formPricing(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Title', c.title, p + 'title');
    h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    h += fieldSelect('Layout', s.variant || 'tiered', [
      { value: 'tiered', label: 'Tiered' },
      { value: 'single', label: 'Single' },
      { value: 'comparison', label: 'Table' },
    ], idx + '.variant');
    var tiers = c.tiers || [];
    tiers.forEach(function (t, i) {
      var tp = p + 'tiers.' + i + '.';
      h += '<div class="se-card-group">';
      h += '<div class="se-tier-header">' + esc(t.name || 'Tier ' + (i + 1)) + (t.highlight ? ' <span class="se-tag">Featured</span>' : '') + '</div>';
      h += '<div class="se-row">';
      h += fieldText('Name', t.name, tp + 'name');
      h += fieldText('Price', t.price, tp + 'price');
      h += fieldText('Period', t.period, tp + 'period', null, { placeholder: '/month' });
      h += '</div>';
      h += fieldText('Description', t.description, tp + 'description');
      h += fieldTextarea('Features', (t.features || []).join('\n'), tp + 'features', { rows: 3 });
      h += '<p class="se-hint">One feature per line</p>';
      h += '<div class="se-row">';
      h += fieldText('CTA label', (t.cta || {}).label, tp + 'cta.label');
      h += fieldText('CTA link', (t.cta || {}).href, tp + 'cta.href');
      h += '</div>';
      h += '</div>';
    });
    return h;
  }

  function formFaq(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Section title', c.title, p + 'title');
    var items = c.items || [];
    items.forEach(function (item, i) {
      h += '<div class="se-card-group">';
      h += fieldText('Question', item.question, p + 'items.' + i + '.question');
      h += fieldTextarea('Answer', item.answer, p + 'items.' + i + '.answer', { rows: 2 });
      h += '</div>';
    });
    return h;
  }

  function formWorkflow(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Title', c.title, p + 'title');
    h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    var steps = c.steps || [];
    steps.forEach(function (step, i) {
      h += '<div class="se-card-group">';
      h += '<div class="se-tier-header">Step ' + esc(step.step || (i + 1)) + '</div>';
      h += fieldText('Title', step.title, p + 'steps.' + i + '.title');
      h += fieldTextarea('Description', step.description, p + 'steps.' + i + '.description', { rows: 2 });
      h += '</div>';
    });
    return h;
  }

  function formCta(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Headline', c.title, p + 'title');
    h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    h += '<div class="se-row">';
    h += fieldText('Button label', (c.primaryCta || {}).label, p + 'primaryCta.label');
    h += fieldText('Button link', (c.primaryCta || {}).href, p + 'primaryCta.href');
    h += '</div>';
    h += '<div class="se-row">';
    h += fieldText('Secondary label', (c.secondaryCta || {}).label, p + 'secondaryCta.label');
    h += fieldText('Secondary link', (c.secondaryCta || {}).href, p + 'secondaryCta.href');
    h += '</div>';
    return h;
  }

  function formContactForm(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Title', c.title, p + 'title');
    h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    h += fieldText('Submit button text', c.submitLabel || 'Send message', p + 'submitLabel');
    return h;
  }

  function formGeneric(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText('Title', c.title, p + 'title');
    if (c.subtitle !== undefined) h += fieldText('Subtitle', c.subtitle, p + 'subtitle');
    if (c.description !== undefined) h += fieldTextarea('Description', c.description, p + 'description');
    return h;
  }

  var FORM_RENDERERS = {
    hero: formHero,
    logoCloud: formLogoCloud,
    metrics: formMetrics,
    valueGrid: formValueGrid,
    featureSplit: formFeatureSplit,
    pricing: formPricing,
    faq: formFaq,
    workflow: formWorkflow,
    cta: formCta,
    contactForm: formContactForm,
    problemStatement: formGeneric,
    scopeGrid: formGeneric,
    testimonial: formGeneric,
  };

  // ── Main Render ──

  function render(container, data, onChange) {
    if (!container || !data) return;
    var sections = data.sections || [];
    var brand = data.brand || {};
    var h = '';

    // Brand header
    h += '<div class="se-brand-header">';
    h += '<div class="se-brand-icon" style="background:' + esc(brand.colors && brand.colors.primary || '#7DD3FC') + '"></div>';
    h += '<div>';
    h += '<div class="se-brand-name">' + esc(brand.name || 'Untitled') + '</div>';
    h += '<div class="se-brand-tagline">' + esc(brand.tagline || '') + '</div>';
    h += '</div>';
    h += '</div>';

    // Section list
    sections.forEach(function (s, i) {
      var meta = SECTION_META[s.type] || { label: s.type, icon: '📄', desc: '' };
      var formFn = FORM_RENDERERS[s.type] || formGeneric;

      h += '<div class="se-section" data-section-index="' + i + '">';
      h += '<button class="se-section-header" type="button" data-toggle="' + i + '">';
      h += '<span class="se-section-icon">' + meta.icon + '</span>';
      h += '<span class="se-section-title">' + esc(meta.label) + '</span>';
      h += '<span class="se-section-desc">' + esc(meta.desc) + '</span>';
      h += '<span class="se-section-chevron">›</span>';
      h += '</button>';
      h += '<div class="se-section-body" id="seBody_' + i + '" hidden>';
      h += formFn(s, i);
      h += '</div>';
      h += '</div>';
    });

    container.innerHTML = h;

    // Accordion behavior
    container.querySelectorAll('.se-section-header').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = btn.getAttribute('data-toggle');
        var body = container.querySelector('#seBody_' + idx);
        var section = btn.closest('.se-section');
        if (!body) return;
        var isOpen = !body.hidden;
        // Close all
        container.querySelectorAll('.se-section-body').forEach(function (b) { b.hidden = true; });
        container.querySelectorAll('.se-section').forEach(function (s) { s.classList.remove('se-section--open'); });
        // Toggle
        if (!isOpen) {
          body.hidden = false;
          section.classList.add('se-section--open');
        }
      });
    });

    // Bind change events
    container.querySelectorAll('.se-input, .se-textarea, .se-select').forEach(function (el) {
      var evts = el.tagName === 'SELECT' ? ['change'] : ['input'];
      evts.forEach(function (evt) {
        el.addEventListener(evt, function () {
          var path = el.getAttribute('data-path');
          if (!path || !onChange) return;
          onChange(path, el.value);
        });
      });
    });
  }

  // ── Apply a field change to builder_data ──

  function applyChange(data, path, value) {
    var parts = path.split('.');
    var sectionIdx = parseInt(parts[0], 10);
    if (isNaN(sectionIdx) || !data.sections || !data.sections[sectionIdx]) return data;

    var section = data.sections[sectionIdx];
    var remaining = parts.slice(1);

    // Handle special conversions
    var lastKey = remaining[remaining.length - 1];

    // variant is on section root, not content
    if (remaining[0] === 'variant') {
      section.variant = value;
      return data;
    }

    // Navigate to the right nested object
    var obj = section;
    for (var i = 0; i < remaining.length - 1; i++) {
      var key = remaining[i];
      var nextKey = remaining[i + 1];
      // Array index
      if (/^\d+$/.test(nextKey)) {
        if (!obj[key]) obj[key] = [];
        obj = obj[key];
        continue;
      }
      if (/^\d+$/.test(key)) {
        var idx = parseInt(key, 10);
        if (!obj[idx]) obj[idx] = {};
        obj = obj[idx];
        continue;
      }
      if (!obj[key]) obj[key] = {};
      obj = obj[key];
    }

    var finalKey = remaining[remaining.length - 1];

    // Special: comma-separated list → array (logoCloud items)
    if (finalKey === 'items' && typeof value === 'string' && path.indexOf('logoCloud') === -1 && path.indexOf('.items.') === -1) {
      // Check parent to see if it's logoCloud
      var parentType = data.sections[sectionIdx].type;
      if (parentType === 'logoCloud') {
        obj[finalKey] = value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        return data;
      }
    }

    // Special: features as newline-separated text → array of objects
    if (finalKey === 'features' && typeof value === 'string' && !path.match(/\.\d+\./)) {
      // Could be featureSplit features or pricing tier features
      var lines = value.split('\n').filter(function (l) { return l.trim(); });
      // If parent is a tier (has .tiers.X.), store as plain strings
      if (path.indexOf('.tiers.') !== -1) {
        obj[finalKey] = lines;
      } else {
        // featureSplit: array of { text: ... }
        obj[finalKey] = lines.map(function (l) { return { text: l.trim() }; });
      }
      return data;
    }

    // logoCloud items
    if (finalKey === 'items' && data.sections[sectionIdx].type === 'logoCloud') {
      obj[finalKey] = value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      return data;
    }

    // Normal scalar set
    if (/^\d+$/.test(finalKey)) {
      obj[parseInt(finalKey, 10)] = value;
    } else {
      obj[finalKey] = value;
    }

    return data;
  }

  return {
    render: render,
    applyChange: applyChange,
    SECTION_META: SECTION_META,
  };
})();
