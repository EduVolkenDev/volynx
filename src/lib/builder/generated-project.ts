// Applied only to freshly generated projects, after optional blocks are filtered.
// Existing projects and their custom links are never migrated implicitly.
export function finalizeGeneratedProject(data: any, presetId: string, primaryHref = "") {
  const sections = data.sections || [];
  const used = new Set<string>();
  const defaults: Record<string, string> = {
    hero: "home", logoCloud: "proof", metrics: "results",
    valueGrid: presetId === "portfolio" ? "work" : "features",
    featureSplit: "details", workflow: "process", pricing: "pricing",
    faq: "faq", cta: "cta", contactForm: "contact",
  };
  for (const section of sections) {
    const base = /^[a-zA-Z][\w-]*$/.test(section.id || "")
      ? section.id : defaults[section.type] || "section";
    let id = base;
    for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
    section.id = id;
    used.add(id);
  }
  const first = (...types: string[]) => {
    for (const type of types) {
      const section = sections.find((s: any) => s.type === type);
      if (section) return `#${section.id}`;
    }
    return "#";
  };
  const fallback: Record<string, string> = {
    pricing: first("pricing", "valueGrid", "workflow", "cta", "hero"),
    features: first("valueGrid", "featureSplit", "workflow", "hero"),
    work: first("valueGrid", "featureSplit", "workflow", "hero"),
    process: first("workflow", "featureSplit", "valueGrid", "hero"),
    contact: first("contactForm", "cta", "hero"),
    cta: first("cta", "contactForm", "hero"),
  };
  function normalize(link: any, isPrimary: boolean) {
    if (!link || typeof link.href !== "string") return;
    // Explicit destinations belong to the user, including root-relative URLs.
    if (isPrimary && primaryHref) { link.href = primaryHref; return; }
    const hash = link.href.startsWith("#") ? link.href.slice(1) : null;
    if (hash && !used.has(hash) && fallback[hash]) link.href = fallback[hash];
    if (/^\/(?:products\/(?:landing-express|saas-landing-system|agency-launch-kit|portfolio-pro-kit)\/?|pricing\/?)$/.test(link.href)) {
      link.href = new URL(link.href, "https://volynx.world").href;
    }
  }
  for (const section of sections) {
    normalize(section.content?.primaryCta, true);
    normalize(section.content?.secondaryCta, false);
    for (const tier of section.content?.tiers || []) normalize(tier.cta, !!tier.highlight);
  }
  return data;
}
