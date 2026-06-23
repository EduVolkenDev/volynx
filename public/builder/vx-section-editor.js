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

  // Detect active language for buyer-facing labels
  function getLang() {
    try {
      var l = (localStorage.getItem('volynx_lang') || 'en').toLowerCase();
      return l.startsWith('pt') ? 'pt' : 'en';
    } catch (_) { return 'en'; }
  }

  // ── Section type metadata — bilingual EN/PT-BR ──
  var SECTION_META = {
    hero:             { label: { en: 'Top of page',       pt: 'Topo da página' },      desc: { en: 'First message people see',                 pt: 'Primeira mensagem que as pessoas veem' } },
    logoCloud:        { label: { en: 'Trusted by',         pt: 'Quem confia' },         desc: { en: 'Names or logos that build trust',          pt: 'Nomes ou logos que passam confiança' } },
    metrics:          { label: { en: 'Results',            pt: 'Resultados' },          desc: { en: 'Important numbers and proof',              pt: 'Números importantes e prova' } },
    valueGrid:        { label: { en: 'Benefits',           pt: 'Benefícios' },          desc: { en: 'Cards explaining what you offer',          pt: 'Cards explicando o que você oferece' } },
    featureSplit:     { label: { en: 'Details',            pt: 'Detalhes' },            desc: { en: 'A deeper explanation of your offer',       pt: 'Uma explicação mais completa da oferta' } },
    pricing:          { label: { en: 'Plans and prices',   pt: 'Planos e preços' },     desc: { en: 'What people can buy or choose',            pt: 'O que as pessoas podem comprar ou escolher' } },
    faq:              { label: { en: 'Common questions',   pt: 'Dúvidas comuns' },      desc: { en: 'Answers that remove hesitation',           pt: 'Respostas que removem dúvidas' } },
    workflow:         { label: { en: 'How it works',       pt: 'Como funciona' },       desc: { en: 'Steps in your process',                    pt: 'Passos do seu processo' } },
    cta:              { label: { en: 'Final invitation',   pt: 'Convite final' },       desc: { en: 'The last push to take action',             pt: 'O último convite para agir' } },
    contactForm:      { label: { en: 'Contact form',       pt: 'Formulário' },          desc: { en: 'A form for messages or leads',             pt: 'Um formulário para mensagens ou leads' } },
    problemStatement: { label: { en: 'The problem',        pt: 'O problema' },          desc: { en: 'The pain your offer solves',               pt: 'A dor que sua oferta resolve' } },
    scopeGrid:        { label: { en: 'What is included',   pt: 'O que está incluído' }, desc: { en: 'Deliverables or package details',           pt: 'Entregas ou detalhes do pacote' } },
    testimonial:      { label: { en: 'Customer quote',     pt: 'Depoimento' },          desc: { en: 'A quote from a person or client',          pt: 'Uma fala de uma pessoa ou cliente' } },
  };

  // UI strings used by the editor surface itself (intro, hints, action buttons)
  var UI = {
    en: {
      intro_kicker: 'Start here',
      intro_title: 'Your page is split into simple blocks.',
      intro_help:  'Open a block, change only what matters, and watch the preview beside it.',
      tap_hint:    'Edit',
      block:       'Block',
    },
    pt: {
      intro_kicker: 'Comece aqui',
      intro_title: 'Sua página está dividida em blocos simples.',
      intro_help:  'Abra um bloco, altere apenas o que importa e acompanhe o resultado na prévia ao lado.',
      tap_hint:    'Editar',
      block:       'Bloco',
    },
  };

  var COPY = {
    en: {
      badge: 'Small label',
      badge_help: 'Short text above the main headline, like "Now open" or "Premium service".',
      layout: 'Layout style',
      layout_help: 'Changes the shape of this block without changing the words.',
      headline: 'Main headline',
      headline_help: 'The strongest sentence on this part of the page.',
      subtitle: 'Supporting text',
      subtitle_help: 'A short explanation below the headline.',
      button_label: 'Main button text',
      button_link: 'Main button link',
      secondary_label: 'Second button text',
      secondary_link: 'Second button link',
      section_title: 'Block title',
      names_list: 'Names',
      names_help: 'Separate each name with a comma.',
      value: 'Number or result',
      label: 'Short label',
      cards: 'Cards',
      title: 'Title',
      description: 'Description',
      features: 'List items',
      features_help: 'Write one item per line.',
      price: 'Price',
      period: 'Period',
      plan_name: 'Plan name',
      answer: 'Answer',
      question: 'Question',
      step: 'Step',
      submit: 'Submit button text',
      featured: 'Featured',
    },
    pt: {
      badge: 'Etiqueta pequena',
      badge_help: 'Texto curto acima do titulo, como "Aberto agora" ou "Servico premium".',
      layout: 'Estilo do bloco',
      layout_help: 'Muda o formato deste bloco sem mudar os textos.',
      headline: 'Titulo principal',
      headline_help: 'A frase mais forte desta parte da página.',
      subtitle: 'Texto de apoio',
      subtitle_help: 'Uma explicacao curta abaixo do titulo.',
      button_label: 'Texto do botao principal',
      button_link: 'Link do botao principal',
      secondary_label: 'Texto do segundo botao',
      secondary_link: 'Link do segundo botao',
      section_title: 'Titulo do bloco',
      names_list: 'Nomes',
      names_help: 'Separe cada nome com virgula.',
      value: 'Numero ou resultado',
      label: 'Legenda curta',
      cards: 'Cards',
      title: 'Titulo',
      description: 'Descricao',
      features: 'Itens da lista',
      features_help: 'Escreva um item por linha.',
      price: 'Preco',
      period: 'Periodo',
      plan_name: 'Nome do plano',
      answer: 'Resposta',
      question: 'Pergunta',
      step: 'Passo',
      submit: 'Texto do botao de envio',
      featured: 'Destaque',
    },
  };

  function tx(key) {
    var lang = getLang();
    return (COPY[lang] && COPY[lang][key]) || COPY.en[key] || key;
  }

  // ── Field Builders ──

  function fieldText(label, value, path, onChange, opts) {
    opts = opts || {};
    var id = 'vxf_' + path.replace(/\./g, '_');
    var ph = opts.placeholder || '';
    return '<div class="se-field">' +
      '<label class="se-label" for="' + id + '">' + esc(label) + '</label>' +
      '<input class="se-input" id="' + id + '" type="text" value="' + esc(value) + '" placeholder="' + esc(ph) + '" data-path="' + esc(path) + '" />' +
      (opts.help ? '<p class="se-help">' + esc(opts.help) + '</p>' : '') +
    '</div>';
  }

  function fieldTextarea(label, value, path, opts) {
    opts = opts || {};
    var id = 'vxf_' + path.replace(/\./g, '_');
    return '<div class="se-field se-field--full">' +
      '<label class="se-label" for="' + id + '">' + esc(label) + '</label>' +
      '<textarea class="se-textarea" id="' + id + '" rows="' + (opts.rows || 3) + '" data-path="' + esc(path) + '">' + esc(value) + '</textarea>' +
      (opts.help ? '<p class="se-help">' + esc(opts.help) + '</p>' : '') +
    '</div>';
  }

  function fieldSelect(label, value, options, path, opts) {
    opts = opts || {};
    var id = 'vxf_' + path.replace(/\./g, '_');
    var selectOptions = options.map(function (o) {
      var val = typeof o === 'string' ? o : o.value;
      var lbl = typeof o === 'string' ? o : o.label;
      return '<option value="' + esc(val) + '"' + (val === value ? ' selected' : '') + '>' + esc(lbl) + '</option>';
    }).join('');
    return '<div class="se-field">' +
      '<label class="se-label" for="' + id + '">' + esc(label) + '</label>' +
      '<select class="se-select" id="' + id + '" data-path="' + esc(path) + '">' + selectOptions + '</select>' +
      (opts.help ? '<p class="se-help">' + esc(opts.help) + '</p>' : '') +
    '</div>';
  }

  // ── Section Form Renderers ──

  function formHero(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = '<div class="se-row">';
    h += fieldText(tx('badge'), c.badge, p + 'badge', null, { placeholder: 'e.g. Now in beta', help: tx('badge_help') });
    h += fieldSelect(tx('layout'), s.variant || 'centered', [
      { value: 'centered', label: 'Centered' },
      { value: 'split', label: 'Split' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'product', label: 'Product' },
    ], idx + '.variant', { help: tx('layout_help') });
    h += '</div>';
    h += fieldText(tx('headline'), c.title, p + 'title', null, { placeholder: 'Your main headline', help: tx('headline_help') });
    h += fieldTextarea(tx('subtitle'), c.subtitle, p + 'subtitle', { help: tx('subtitle_help') });
    h += '<div class="se-row">';
    h += fieldText(tx('button_label'), (c.primaryCta || {}).label, p + 'primaryCta.label', null, { placeholder: 'Get started' });
    h += fieldText(tx('button_link'), (c.primaryCta || {}).href, p + 'primaryCta.href', null, { placeholder: '#pricing' });
    h += '</div>';
    h += '<div class="se-row">';
    h += fieldText(tx('secondary_label'), (c.secondaryCta || {}).label, p + 'secondaryCta.label', null, { placeholder: 'Learn more' });
    h += fieldText(tx('secondary_link'), (c.secondaryCta || {}).href, p + 'secondaryCta.href', null, { placeholder: '#' });
    h += '</div>';
    return h;
  }

  function formLogoCloud(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('section_title'), c.title, p + 'title', null, { placeholder: 'Trusted by' });
    h += fieldTextarea(tx('names_list'), (c.items || []).join(', '), p + 'items', { rows: 2, help: tx('names_help') });
    return h;
  }

  function formMetrics(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('section_title'), c.title, p + 'title', null, { placeholder: 'By the numbers' });
    var items = c.items || [];
    h += '<div class="se-items-label">' + esc(tx('value')) + '</div>';
    items.forEach(function (item, i) {
      h += '<div class="se-row se-row--tight">';
      h += fieldText(tx('value'), item.value, p + 'items.' + i + '.value', null, { placeholder: '99.9%' });
      h += fieldText(tx('label'), item.label, p + 'items.' + i + '.label', null, { placeholder: 'Uptime' });
      h += '</div>';
    });
    return h;
  }

  function formValueGrid(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('section_title'), c.title, p + 'title');
    h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    var cards = c.cards || [];
    h += '<div class="se-items-label">' + esc(tx('cards')) + ' (' + cards.length + ')</div>';
    cards.forEach(function (card, i) {
      h += '<div class="se-card-group">';
      h += fieldText(tx('title'), card.title, p + 'cards.' + i + '.title');
      h += fieldTextarea(tx('description'), card.description, p + 'cards.' + i + '.description', { rows: 2 });
      h += '</div>';
    });
    return h;
  }

  function formFeatureSplit(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('title'), c.title, p + 'title');
    h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    var feats = (c.features || []).map(function (f) { return f.text || f; }).join('\n');
    h += fieldTextarea(tx('features'), feats, p + 'features', { rows: 5, help: tx('features_help') });
    if (c.primaryCta) {
      h += '<div class="se-row">';
      h += fieldText(tx('button_label'), c.primaryCta.label, p + 'primaryCta.label');
      h += fieldText(tx('button_link'), c.primaryCta.href, p + 'primaryCta.href');
      h += '</div>';
    }
    return h;
  }

  function formPricing(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('title'), c.title, p + 'title');
    h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    h += fieldSelect(tx('layout'), s.variant || 'tiered', [
      { value: 'tiered', label: 'Tiered' },
      { value: 'single', label: 'Single' },
      { value: 'comparison', label: 'Table' },
    ], idx + '.variant', { help: tx('layout_help') });
    var tiers = c.tiers || [];
    tiers.forEach(function (t, i) {
      var tp = p + 'tiers.' + i + '.';
      h += '<div class="se-card-group">';
      h += '<div class="se-tier-header">' + esc(t.name || 'Tier ' + (i + 1)) + (t.highlight ? ' <span class="se-tag">' + esc(tx('featured')) + '</span>' : '') + '</div>';
      h += '<div class="se-row">';
      h += fieldText(tx('plan_name'), t.name, tp + 'name');
      h += fieldText(tx('price'), t.price, tp + 'price');
      h += fieldText(tx('period'), t.period, tp + 'period', null, { placeholder: '/month' });
      h += '</div>';
      h += fieldText(tx('description'), t.description, tp + 'description');
      h += fieldTextarea(tx('features'), (t.features || []).join('\n'), tp + 'features', { rows: 3, help: tx('features_help') });
      h += '<div class="se-row">';
      h += fieldText(tx('button_label'), (t.cta || {}).label, tp + 'cta.label');
      h += fieldText(tx('button_link'), (t.cta || {}).href, tp + 'cta.href');
      h += '</div>';
      h += '</div>';
    });
    return h;
  }

  function formFaq(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('section_title'), c.title, p + 'title');
    var items = c.items || [];
    items.forEach(function (item, i) {
      h += '<div class="se-card-group">';
      h += fieldText(tx('question'), item.question, p + 'items.' + i + '.question');
      h += fieldTextarea(tx('answer'), item.answer, p + 'items.' + i + '.answer', { rows: 2 });
      h += '</div>';
    });
    return h;
  }

  function formWorkflow(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('title'), c.title, p + 'title');
    h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    var steps = c.steps || [];
    steps.forEach(function (step, i) {
      h += '<div class="se-card-group">';
      h += '<div class="se-tier-header">' + esc(tx('step')) + ' ' + esc(step.step || (i + 1)) + '</div>';
      h += fieldText(tx('title'), step.title, p + 'steps.' + i + '.title');
      h += fieldTextarea(tx('description'), step.description, p + 'steps.' + i + '.description', { rows: 2 });
      h += '</div>';
    });
    return h;
  }

  function formCta(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('headline'), c.title, p + 'title');
    h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    h += '<div class="se-row">';
    h += fieldText(tx('button_label'), (c.primaryCta || {}).label, p + 'primaryCta.label');
    h += fieldText(tx('button_link'), (c.primaryCta || {}).href, p + 'primaryCta.href');
    h += '</div>';
    h += '<div class="se-row">';
    h += fieldText(tx('secondary_label'), (c.secondaryCta || {}).label, p + 'secondaryCta.label');
    h += fieldText(tx('secondary_link'), (c.secondaryCta || {}).href, p + 'secondaryCta.href');
    h += '</div>';
    return h;
  }

  function formContactForm(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('title'), c.title, p + 'title');
    h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    h += fieldText(tx('submit'), c.submitLabel || 'Send message', p + 'submitLabel');
    return h;
  }

  function formGeneric(s, idx) {
    var c = s.content || {};
    var p = idx + '.content.';
    var h = fieldText(tx('title'), c.title, p + 'title');
    if (c.subtitle !== undefined) h += fieldText(tx('subtitle'), c.subtitle, p + 'subtitle');
    if (c.description !== undefined) h += fieldTextarea(tx('description'), c.description, p + 'description');
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
    var lang = getLang();
    var t = UI[lang];
    var h = '';

    // Brand header
    h += '<div class="se-brand-header">';
    h += '<div class="se-brand-icon" style="background:' + esc(brand.colors && brand.colors.primary || '#7DD3FC') + '"></div>';
    h += '<div>';
    h += '<div class="se-brand-name">' + esc(brand.name || 'Untitled') + '</div>';
    h += '<div class="se-brand-tagline">' + esc(brand.tagline || '') + '</div>';
    h += '</div>';
    h += '</div>';

    // Intro / how-to-use — shows up once when a project loads. Without this,
    // buyers landed on the section list and asked "what do I do with this?".
    h += '<div class="se-intro">';
    h += '<span class="se-intro__kicker">' + esc(t.intro_kicker) + '</span>';
    h += '<strong class="se-intro__title">' + esc(t.intro_title) + '</strong>';
    h += '<p class="se-intro__help">' + esc(t.intro_help) + '</p>';
    h += '</div>';

    // Section list — first section open by default so the user immediately
    // sees the editable form fields and the affordance becomes obvious.
    sections.forEach(function (s, i) {
      var rawMeta = SECTION_META[s.type] || { label: { en: s.type, pt: s.type }, desc: { en: '', pt: '' } };
      // Backward-compat: if label is a string (old data), normalize to {en,pt}
      var label = (typeof rawMeta.label === 'string') ? rawMeta.label : (rawMeta.label[lang] || rawMeta.label.en || s.type);
      var desc  = (typeof rawMeta.desc  === 'string') ? rawMeta.desc  : (rawMeta.desc[lang]  || rawMeta.desc.en  || '');
      var formFn = FORM_RENDERERS[s.type] || formGeneric;
      var isFirst = (i === 0);

      h += '<div class="se-section' + (isFirst ? ' se-section--open' : '') + '" data-section-index="' + i + '">';
      h += '<button class="se-section-header" type="button" data-toggle="' + i + '" aria-expanded="' + (isFirst ? 'true' : 'false') + '">';
      h += '<span class="se-section-number"><small>' + esc(t.block) + '</small><b>' + (i + 1) + '</b></span>';
      h += '<span class="se-section-titleblock">';
      h += '<span class="se-section-title">' + esc(label) + '</span>';
      h += '<span class="se-section-desc">' + esc(desc) + '</span>';
      h += '</span>';
      h += '<span class="se-section-edit-hint">' + esc(t.tap_hint) + '</span>';
      h += '<span class="se-section-chevron" aria-hidden="true">▾</span>';
      h += '</button>';
      h += '<div class="se-section-body" id="seBody_' + i + '"' + (isFirst ? '' : ' hidden') + '>';
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
        container.querySelectorAll('.se-section-header').forEach(function (h) { h.setAttribute('aria-expanded', 'false'); });
        // Toggle
        if (!isOpen) {
          body.hidden = false;
          section.classList.add('se-section--open');
          btn.setAttribute('aria-expanded', 'true');
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
