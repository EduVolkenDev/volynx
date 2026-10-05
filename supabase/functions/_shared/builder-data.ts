/** Minimum renderable contract for AI-generated VxOS pages. */
const SECTION_TYPES = new Set([
  "hero", "logoCloud", "metrics", "valueGrid", "featureSplit", "pricing", "faq",
  "workflow", "cta", "contactForm", "problemStatement", "scopeGrid", "testimonial",
]);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function list(value: unknown, validate: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length > 0 && value.length <= 12 && value.every(validate);
}

function cta(value: unknown): boolean {
  if (!record(value) || !text(value.label) || !text(value.href)) return false;
  const href = value.href.trim();
  return href.startsWith("#") || href.startsWith("/") && !href.startsWith("//") ||
    /^https:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href);
}

function validSection(value: unknown): boolean {
  if (!record(value) || !text(value.type) || !SECTION_TYPES.has(value.type) || !record(value.content)) return false;
  const c = value.content;
  if (("primaryCta" in c && !cta(c.primaryCta)) || ("secondaryCta" in c && !cta(c.secondaryCta))) return false;
  switch (value.type) {
    case "hero":
    case "cta":
      return text(c.title) && cta(c.primaryCta);
    case "logoCloud":
      return list(c.items, text);
    case "metrics":
      return list(c.items, (item) => record(item) && text(item.label) && text(item.value));
    case "valueGrid":
      return text(c.title) && list(c.cards, (item) => record(item) && text(item.title) && text(item.description));
    case "featureSplit":
      return text(c.title) && list(c.features, (item) => text(item) || record(item) && text(item.text));
    case "pricing":
      return text(c.title) && list(c.tiers, (item) => record(item) && text(item.name) && text(item.price) && cta(item.cta));
    case "faq":
      return text(c.title) && list(c.items, (item) => record(item) && text(item.question) && text(item.answer));
    case "workflow":
      return text(c.title) && list(c.steps, (item) => record(item) && text(item.title) && text(item.description));
    case "contactForm":
      return text(c.title) && list(c.fields, (item) => record(item) && text(item.label) &&
        ["text", "email", "textarea", "tel"].includes(String(item.type)));
    case "problemStatement":
      return text(c.title) && text(c.description) && list(c.points, text);
    case "scopeGrid":
      return text(c.title) && list(c.items, (item) => record(item) && text(item.title) && text(item.description));
    case "testimonial":
      return text(c.quote) && text(c.author);
    default:
      return false;
  }
}

export function isBuilderData(value: unknown): boolean {
  if (!record(value) || !record(value.brand) || !record(value.brand.colors) || !Array.isArray(value.sections)) {
    return false;
  }
  const { brand, sections } = value;
  if (!text(brand.name) || !text(brand.tagline)) return false;
  if (!["primary", "bg", "fg", "accent"].every((key) =>
    typeof (brand.colors as Record<string, unknown>)[key] === "string" &&
    /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test((brand.colors as Record<string, string>)[key])
  )) return false;
  return sections.length >= 2 && sections.length <= 12 && sections.every(validSection) &&
    sections.some((section) => section.type === "hero") && sections.some((section) => section.type === "cta") &&
    new TextEncoder().encode(JSON.stringify(value)).byteLength <= 100_000;
}
