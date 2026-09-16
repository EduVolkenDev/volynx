const TEMPLATE_CATALOG = [
  ["classic-grid", "Classic Grid"],
  ["magazine", "Magazine"],
  ["compact-list", "Compact List"],
  ["gallery-hero", "Gallery Hero"],
  ["split-view", "Split View"],
  ["masonry", "Masonry"],
  ["editorial", "Editorial"],
  ["minimalist", "Minimalist"],
  ["card-stack", "Card Stack"],
  ["timeline", "Timeline"],
  ["map-first", "Map-First"],
  ["grouped", "Grouped"],
  ["story-mode", "Story Mode"],
  ["showroom", "Showroom"],
  ["catalog", "Catalog"]
];

const UI = {
  "pt-BR": {
    contact: "Contato", catalogButton: "Ver imóveis", talk: "Falar com a equipe",
    templateEyebrow: "VISUAL DO SITE", templateTitle: "Escolha um template para visualizar",
    templateHint: "A troca altera apenas o layout. Seus imóveis e fotos permanecem iguais.", templateLabel: "Template",
    catalogEyebrow: "CATÁLOGO", catalogTitle: "Imóveis disponíveis", search: "Buscar por imóvel, cidade ou bairro",
    allCategories: "Todas as categorias", allListings: "Venda e aluguel", sale: "Venda", rent: "Aluguel",
    properties: "imóveis", property: "imóvel", view: "Ver detalhes", featured: "Em destaque",
    emptyTitle: "Nenhum imóvel encontrado", emptyDescription: "Tente remover um filtro ou usar outro termo de busca.",
    contactEyebrow: "ATENDIMENTO", contactTitle: "Vamos encontrar o imóvel certo?",
    contactDescription: "Conte o que você procura e nossa equipe retorna com opções selecionadas.",
    interest: "Tenho interesse", bedrooms: "quartos", bathrooms: "banheiros", parking: "vagas", area: "área",
    mapTitle: "Descubra por região", mapDescription: "Use a busca para explorar bairros e cidades do catálogo.",
    close: "Fechar detalhes", language: "Change language"
  },
  en: {
    contact: "Contact", catalogButton: "View properties", talk: "Talk to the team",
    templateEyebrow: "SITE LAYOUT", templateTitle: "Choose a template to preview",
    templateHint: "Switching templates changes only the layout. Properties and photos stay the same.", templateLabel: "Template",
    catalogEyebrow: "CATALOGUE", catalogTitle: "Available properties", search: "Search property, city or neighbourhood",
    allCategories: "All categories", allListings: "Sale and rent", sale: "For sale", rent: "For rent",
    properties: "properties", property: "property", view: "View details", featured: "Featured",
    emptyTitle: "No properties found", emptyDescription: "Try removing a filter or using another search term.",
    contactEyebrow: "CONTACT", contactTitle: "Shall we find the right property?",
    contactDescription: "Tell us what you need and our team will return with selected options.",
    interest: "I'm interested", bedrooms: "bedrooms", bathrooms: "bathrooms", parking: "parking", area: "area",
    mapTitle: "Explore by area", mapDescription: "Use search to explore neighbourhoods and cities in the catalogue.",
    close: "Close details", language: "Mudar idioma"
  }
};

const state = {
  site: null,
  properties: [],
  language: "pt-BR",
  template: "classic-grid",
  query: "",
  category: "all",
  listing: "all"
};

const byId = (id) => document.getElementById(id);
const clear = (node) => { while (node.firstChild) node.firstChild.remove(); };
const option = (value, label) => {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
};
const localized = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value[state.language] || value["pt-BR"] || value.en || "";
};
const ui = (key) => UI[state.language]?.[key] || UI["pt-BR"][key] || key;
const cleanPhone = (value) => String(value || "").replace(/[^0-9]/g, "");
const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
const templateName = (key) => TEMPLATE_CATALOG.find(([candidate]) => candidate === key)?.[1] || key;

function contactHref(property) {
  const contact = state.site.contact || {};
  const message = property
    ? `${ui("interest")}: ${localized(property.title)} — ${property.location?.label || ""}`
    : contact.whatsappMessage || ui("contactDescription");
  return `https://wa.me/${cleanPhone(contact.whatsapp)}?text=${encodeURIComponent(message)}`;
}

function applyBrand() {
  const { brand = {}, contact = {}, hero = {} } = state.site;
  document.documentElement.lang = state.language;
  document.title = `${brand.name || "Property Flow"} — ${localized(hero.title) || ui("catalogTitle")}`;
  const shell = byId("siteShell");
  shell.style.setProperty("--primary", validColor(brand.colors?.primary, "#d8b36a"));
  shell.style.setProperty("--accent", validColor(brand.colors?.accent, "#9f96ff"));
  shell.style.setProperty("--surface", validColor(brand.colors?.surface, "#0c111d"));
  shell.style.setProperty("--ink", validColor(brand.colors?.ink, "#f7f8fc"));
  byId("brandName").textContent = brand.name || "Property Flow";
  byId("brandTagline").textContent = brand.tagline || "Imóveis selecionados";
  byId("brandMark").textContent = brand.mark || String(brand.name || "PF").slice(0, 2).toUpperCase();
  const logo = byId("brandLogo");
  if (brand.logo) {
    logo.src = brand.logo;
    logo.alt = `Logo ${brand.name || ""}`.trim();
    logo.hidden = false;
    byId("brandMark").hidden = true;
  } else {
    logo.hidden = true;
    byId("brandMark").hidden = false;
  }
  byId("footerBrand").textContent = brand.name || "Property Flow";
  byId("footerAddress").textContent = [contact.address, contact.phone].filter(Boolean).join(" · ");
  byId("poweredBy").hidden = brand.showPoweredBy === false;
  byId("heroEyebrow").textContent = localized(hero.eyebrow);
  byId("heroTitle").textContent = localized(hero.title);
  byId("heroDescription").textContent = localized(hero.description);
}

function applyLanguage() {
  const pairs = {
    headerContact: "contact", heroCatalogLink: "catalogButton", heroContactLink: "talk",
    templateEyebrow: "templateEyebrow", templateTitle: "templateTitle", templateHint: "templateHint", templateLabel: "templateLabel",
    catalogEyebrow: "catalogEyebrow", catalogTitle: "catalogTitle", emptyTitle: "emptyTitle", emptyDescription: "emptyDescription",
    contactEyebrow: "contactEyebrow", contactTitle: "contactTitle", contactDescription: "contactDescription",
    mapTitle: "mapTitle", mapDescription: "mapDescription"
  };
  Object.entries(pairs).forEach(([id, key]) => { byId(id).textContent = ui(key); });
  byId("searchInput").placeholder = ui("search");
  byId("searchLabel").textContent = ui("search");
  byId("categoryLabel").textContent = ui("allCategories");
  byId("listingLabel").textContent = ui("allListings");
  byId("dialogClose").setAttribute("aria-label", ui("close"));
  byId("languageToggle").textContent = state.language === "pt-BR" ? "EN" : "PT";
  byId("languageToggle").setAttribute("aria-label", ui("language"));
  applyBrand();
  fillFilters();
  renderProperties();
}

function applyTemplate(nextTemplate) {
  const available = state.site.template?.available || [];
  const fallback = available[0] || "classic-grid";
  state.template = available.includes(nextTemplate) ? nextTemplate : fallback;
  byId("siteShell").dataset.template = state.template;
  byId("templateSelect").value = state.template;
  byId("mapContext").hidden = state.template !== "map-first";
  localStorage.setItem("propertyflow-template", state.template);
  renderProperties();
}

function fillTemplateSelect() {
  const template = state.site.template || {};
  const select = byId("templateSelect");
  clear(select);
  (template.available || []).forEach((key) => select.append(option(key, templateName(key))));
  byId("templatePanel").hidden = template.showSelector === false || (template.available || []).length < 2;
  select.addEventListener("change", () => applyTemplate(select.value));
  const saved = localStorage.getItem("propertyflow-template");
  applyTemplate(saved || template.selected);
}

function fillFilters() {
  const categories = [...new Set(state.properties.map((property) => property.category).filter(Boolean))].sort();
  const category = byId("categoryFilter");
  const listing = byId("listingFilter");
  clear(category);
  clear(listing);
  category.append(option("all", ui("allCategories")), ...categories.map((value) => option(value, value)));
  listing.append(option("all", ui("allListings")), option("sale", ui("sale")), option("rent", ui("rent")));
  category.value = categories.includes(state.category) ? state.category : "all";
  listing.value = ["sale", "rent"].includes(state.listing) ? state.listing : "all";
}

function filteredProperties() {
  const query = state.query.trim().toLocaleLowerCase();
  return state.properties.filter((property) => {
    const searchable = [localized(property.title), localized(property.summary), property.category, property.location?.label, property.location?.city, property.location?.neighborhood].filter(Boolean).join(" ").toLocaleLowerCase();
    return (state.category === "all" || property.category === state.category)
      && (state.listing === "all" || property.listingType === state.listing)
      && (!query || searchable.includes(query));
  });
}

function imageNode(image, title, className = "") {
  const node = document.createElement("img");
  node.src = image?.src || "";
  node.alt = image?.alt || title;
  node.loading = "lazy";
  node.decoding = "async";
  if (className) node.className = className;
  return node;
}

function propertyCard(property, index) {
  const card = document.createElement("article");
  card.className = "property-card";
  card.style.setProperty("--index", index);
  card.tabIndex = 0;
  card.setAttribute("aria-label", `${localized(property.title)} — ${property.priceLabel || ""}`);

  const media = document.createElement("div");
  media.className = "property-card__media";
  const image = property.images?.[0];
  if (image?.src) media.append(imageNode(image, localized(property.title)));
  const badges = document.createElement("div");
  badges.className = "property-card__badges";
  const category = document.createElement("span");
  category.textContent = property.category || ui("property");
  badges.append(category);
  if (property.featured) {
    const featured = document.createElement("strong");
    featured.textContent = ui("featured");
    badges.append(featured);
  }
  media.append(badges);

  const body = document.createElement("div");
  body.className = "property-card__body";
  const location = document.createElement("small");
  location.textContent = property.location?.label || "";
  const title = document.createElement("h3");
  title.textContent = localized(property.title);
  const summary = document.createElement("p");
  summary.textContent = localized(property.summary);
  const facts = document.createElement("div");
  facts.className = "property-card__facts";
  facts.textContent = [
    property.facts?.bedrooms ? `${property.facts.bedrooms} ${ui("bedrooms")}` : "",
    property.facts?.bathrooms ? `${property.facts.bathrooms} ${ui("bathrooms")}` : "",
    property.facts?.area || ""
  ].filter(Boolean).join(" · ");
  const footer = document.createElement("div");
  footer.className = "property-card__footer";
  const price = document.createElement("strong");
  price.textContent = property.priceLabel || "Sob consulta";
  const details = document.createElement("button");
  details.type = "button";
  details.textContent = ui("view");
  details.addEventListener("click", () => openProperty(property));
  footer.append(price, details);
  body.append(location, title, summary, facts, footer);
  card.append(media, body);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target === card) openProperty(property);
  });
  return card;
}

function renderProperties() {
  const properties = filteredProperties();
  const grid = byId("propertyGrid");
  clear(grid);
  grid.classList.toggle("property-grid--grouped", state.template === "grouped");
  if (state.template === "grouped") {
    const groups = Map.groupBy ? Map.groupBy(properties, (property) => property.category || ui("property")) : properties.reduce((map, property) => {
      const key = property.category || ui("property");
      map.set(key, [...(map.get(key) || []), property]);
      return map;
    }, new Map());
    [...groups.entries()].forEach(([name, group]) => {
      const section = document.createElement("section");
      section.className = "property-group";
      const heading = document.createElement("h3");
      heading.textContent = name;
      const list = document.createElement("div");
      list.className = "property-group__grid";
      group.forEach((property, index) => list.append(propertyCard(property, index)));
      section.append(heading, list);
      grid.append(section);
    });
  } else {
    properties.forEach((property, index) => grid.append(propertyCard(property, index)));
  }
  byId("emptyState").hidden = properties.length > 0;
  byId("propertyCount").textContent = `${properties.length} ${properties.length === 1 ? ui("property") : ui("properties")}`;
  const featured = properties.find((property) => property.featured) || properties[0] || state.properties[0];
  const hero = byId("heroMedia");
  const heroImage = featured?.images?.[0];
  hero.style.backgroundImage = heroImage?.src ? `linear-gradient(180deg,rgba(5,8,14,.02),rgba(5,8,14,.7)),url("${heroImage.src}")` : "";
  hero.setAttribute("aria-label", featured ? `${localized(featured.title)} — ${featured.location?.label || ""}` : "");
}

function openProperty(property) {
  byId("dialogCategory").textContent = property.category || ui("property");
  byId("dialogTitle").textContent = localized(property.title);
  byId("dialogLocation").textContent = property.location?.label || "";
  byId("dialogPrice").textContent = property.priceLabel || "";
  byId("dialogDescription").textContent = localized(property.description) || localized(property.summary);
  const facts = byId("dialogFacts");
  clear(facts);
  const entries = [
    [ui("bedrooms"), property.facts?.bedrooms],
    [ui("bathrooms"), property.facts?.bathrooms],
    [ui("parking"), property.facts?.parking],
    [ui("area"), property.facts?.area]
  ].filter(([, value]) => value !== undefined && value !== "");
  entries.forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    wrapper.append(term, detail);
    facts.append(wrapper);
  });
  const mainImage = byId("dialogImage");
  const thumbs = byId("dialogThumbnails");
  clear(thumbs);
  const images = property.images || [];
  if (images[0]) {
    mainImage.src = images[0].src;
    mainImage.alt = images[0].alt || localized(property.title);
  }
  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${ui("view")} ${index + 1}`);
    button.append(imageNode(image, localized(property.title)));
    button.addEventListener("click", () => {
      mainImage.src = image.src;
      mainImage.alt = image.alt || localized(property.title);
    });
    thumbs.append(button);
  });
  const contact = byId("dialogContact");
  contact.textContent = ui("interest");
  contact.href = contactHref(property);
  contact.target = "_blank";
  contact.rel = "noopener noreferrer";
  byId("propertyDialog").showModal();
}

function wireEvents() {
  byId("languageToggle").addEventListener("click", () => {
    const allowed = state.site.languages || ["pt-BR"];
    const next = state.language === "pt-BR" && allowed.includes("en") ? "en" : "pt-BR";
    state.language = next;
    localStorage.setItem("propertyflow-language", next);
    applyLanguage();
  });
  byId("searchInput").addEventListener("input", (event) => { state.query = event.target.value; renderProperties(); });
  byId("categoryFilter").addEventListener("change", (event) => { state.category = event.target.value; renderProperties(); });
  byId("listingFilter").addEventListener("change", (event) => { state.listing = event.target.value; renderProperties(); });
  byId("dialogClose").addEventListener("click", () => byId("propertyDialog").close());
  byId("propertyDialog").addEventListener("click", (event) => {
    if (event.target === byId("propertyDialog")) byId("propertyDialog").close();
  });
}

async function boot() {
  try {
    const [siteResponse, propertiesResponse] = await Promise.all([
      fetch("./content/site.json", { cache: "no-store" }),
      fetch("./content/properties.json", { cache: "no-store" })
    ]);
    if (!siteResponse.ok || !propertiesResponse.ok) throw new Error("Arquivos de conteúdo não encontrados.");
    state.site = await siteResponse.json();
    state.properties = await propertiesResponse.json();
    const savedLanguage = localStorage.getItem("propertyflow-language");
    state.language = (state.site.languages || []).includes(savedLanguage) ? savedLanguage : state.site.defaultLanguage || "pt-BR";
    const whatsapp = contactHref();
    for (const id of ["headerContact", "heroContactLink", "whatsappLink"]) {
      const link = byId(id);
      link.href = whatsapp;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    byId("emailLink").href = `mailto:${state.site.contact?.email || ""}`;
    fillTemplateSelect();
    wireEvents();
    applyLanguage();
  } catch (error) {
    byId("siteShell").hidden = true;
    byId("fatalState").hidden = false;
    byId("fatalMessage").textContent = error instanceof Error ? error.message : String(error);
    console.error(error);
  }
}

boot();
