document.addEventListener("DOMContentLoaded", function () {
  var LANG_KEY = "volynx_lang_v1";
  var dict = {
    en: {
      heroLabel: "Manifesto",
      titleLine1: "Why", titleLine2: "VOLYNX?",
      lead: "VOLYNX exists to democratize intelligent technology with a premium aesthetic and a real commitment to social impact. We build products and experiences that help people and organizations take action \u2014 with clarity, ethics and scale.",
      pillImpact: "Real impact", pillEthics: "Ethics & privacy", pillSust: "Sustainability", pillAccess: "Accessible", pillNetwork: "Network effects",
      sectionTitle: "Our principles",
      purposeTitle: "Purpose", purposeText: "Make advanced technology accessible so more people can create, collaborate and solve real problems \u2014 with a focus on social causes, support, well-being and sustainability.",
      whatTitle: "What we build", whatText: "Tools, kits and experiences that combine impeccable design and applied intelligence \u2014 built for creators, devs and organizations that need speed, quality and trust.",
      forTitle: "Who it's for",
      for1: "NGOs and social projects that need clarity and less operational friction.",
      for2: "Creators and professionals building useful things without becoming hostage to complexity.",
      for3: "Teams that value privacy, accessibility and solid engineering.",
      impactTitle: "How impact happens",
      impact1: "Simple tools that reduce repetitive work and free energy for the mission.",
      impact2: "Fast, responsive experiences that reach more people on any device.",
      impact3: "Products that connect people and resources, strengthening communities.",
      principlesTitle: "Principles",
      p1: "Clarity over noise.", p2: "Consent-first privacy and minimal data by default.", p3: "Accessibility as a standard, not an extra.", p4: "Performance and stability: trust is built in milliseconds.", p5: "Sustainability: efficiency is responsibility.",
      transparencyTitle: "Transparency", transparencyText: "VOLYNX prioritizes privacy and clear choices. If analytics are used, it will only be with consent \u2014 to improve the experience and measure impact responsibly.",
      ctaTools: "Explore tools", ctaServices: "Services", ctaMain: "Back to main",
      closing: "We start impeccable and simple. We iterate fast with rigor. We measure impact. Every pixel, every millisecond and every word carries the VOLYNX standard: useful, beautiful and inevitable.",
      cookieTitle: "Cookies & Privacy", cookieText: "We use essential cookies for the platform to work. With your permission, we use analytics cookies to improve the experience and track impact responsibly. You are in control.",
      cookiePrefs: "Preferences", cookieReject: "Reject", cookieAccept: "Accept", cookieLink: "Privacy policy",
      cookiePrefsTitle: "Preferences", cookieEssential: "Essential", cookieEssentialSub: "Always on", cookieAnalytics: "Analytics", cookieAnalyticsSub: "Helps improve the experience", cookieSave: "Save"
    },
    pt: {
      heroLabel: "Manifesto",
      titleLine1: "Por que", titleLine2: "VOLYNX?",
      lead: "A VOLYNX existe para democratizar tecnologia inteligente com uma est\u00e9tica premium e um compromisso real com impacto social. Criamos produtos e experi\u00eancias que ajudam pessoas e organiza\u00e7\u00f5es a agir \u2014 com clareza, \u00e9tica e escala.",
      pillImpact: "Impacto real", pillEthics: "\u00c9tica & privacidade", pillSust: "Sustentabilidade", pillAccess: "Acess\u00edvel", pillNetwork: "Efeito de rede",
      sectionTitle: "Nossos princ\u00edpios",
      purposeTitle: "Prop\u00f3sito", purposeText: "Tornar tecnologia avan\u00e7ada acess\u00edvel para que mais pessoas possam criar, colaborar e resolver problemas reais \u2014 com foco em causas sociais, suporte, bem-estar e sustentabilidade.",
      whatTitle: "O que criamos", whatText: "Ferramentas, kits e experi\u00eancias que unem design impec\u00e1vel e intelig\u00eancia aplicada \u2014 pensadas para criadores, devs e organiza\u00e7\u00f5es que precisam de velocidade, qualidade e confian\u00e7a.",
      forTitle: "Para quem \u00e9",
      for1: "ONGs e projetos sociais que precisam de clareza e menos atrito operacional.",
      for2: "Criadores e profissionais construindo coisas \u00fateis, sem virar ref\u00e9m da complexidade.",
      for3: "Times que valorizam privacidade, acessibilidade e engenharia s\u00f3lida.",
      impactTitle: "Como o impacto acontece",
      impact1: "Ferramentas simples que reduzem trabalho repetitivo e liberam energia para a miss\u00e3o.",
      impact2: "Experi\u00eancias r\u00e1pidas e responsivas para alcan\u00e7ar mais pessoas \u2014 em qualquer dispositivo.",
      impact3: "Produtos que conectam pessoas e recursos, fortalecendo comunidades.",
      principlesTitle: "Princ\u00edpios",
      p1: "Clareza antes de ru\u00eddo.", p2: "Privacidade com consentimento expl\u00edcito e dados m\u00ednimos por padr\u00e3o.", p3: "Acessibilidade como padr\u00e3o, n\u00e3o como extra.", p4: "Performance e estabilidade: confian\u00e7a \u00e9 constru\u00edda em milissegundos.", p5: "Sustentabilidade: efici\u00eancia tamb\u00e9m \u00e9 responsabilidade.",
      transparencyTitle: "Transpar\u00eancia", transparencyText: "A VOLYNX prioriza privacidade e escolhas claras. Se usarmos analytics, ser\u00e1 apenas com consentimento \u2014 para melhorar a experi\u00eancia e medir impacto de forma respons\u00e1vel.",
      ctaTools: "Explorar ferramentas", ctaServices: "Servi\u00e7os", ctaMain: "Voltar para a main",
      closing: "Come\u00e7amos impec\u00e1veis e simples. Iteramos r\u00e1pido com rigor. Medimos impacto. Cada pixel, cada milissegundo e cada palavra carregam o padr\u00e3o VOLYNX: \u00fatil, belo e inevit\u00e1vel.",
      cookieTitle: "Cookies & Privacidade", cookieText: "Usamos cookies essenciais para a plataforma funcionar. Com sua permiss\u00e3o, usamos cookies de analytics para melhorar a experi\u00eancia e acompanhar impacto de forma respons\u00e1vel. Voc\u00ea est\u00e1 no controle.",
      cookiePrefs: "Prefer\u00eancias", cookieReject: "Recusar", cookieAccept: "Aceitar", cookieLink: "Pol\u00edtica de Privacidade",
      cookiePrefsTitle: "Prefer\u00eancias", cookieEssential: "Essenciais", cookieEssentialSub: "Sempre ativos", cookieAnalytics: "Analytics", cookieAnalyticsSub: "Ajuda a melhorar a experi\u00eancia", cookieSave: "Salvar"
    }
  };

  function getSavedLang() {
    try { var s = localStorage.getItem(LANG_KEY); return (s === "en" || s === "pt") ? s : "en"; } catch (e) { return "en"; }
  }

  function applyLang(lang) {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = dict[lang] && dict[lang][el.getAttribute("data-i18n")];
      if (typeof v === "string") el.textContent = v;
    });
    document.querySelectorAll(".langBtn").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-lang") === lang);
    });
    var backLink = document.querySelector(".pill-back");
    if (backLink) backLink.textContent = lang === "pt" ? "\u2190 Voltar" : "\u2190 Back";
  }

  var lang = getSavedLang();
  applyLang(lang);

  document.querySelectorAll(".langBtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang");
      try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
      applyLang(next);
    });
  });
});
