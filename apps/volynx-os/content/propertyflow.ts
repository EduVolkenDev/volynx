export type PropertyFlowTierId = "starter" | "professional" | "white-label"
export type PropertyFlowCurrencyCode = "USD" | "GBP" | "EUR" | "BRL"
export type PropertyFlowTemplateKey =
  | "classic-grid"
  | "magazine"
  | "compact-list"
  | "gallery-hero"
  | "split-view"
  | "masonry"
  | "editorial"
  | "minimalist"
  | "card-stack"
  | "timeline"
  | "map-first"
  | "grouped"
  | "story-mode"
  | "showroom"
  | "catalog"

export const propertyFlowVersion = "1.1.0"

export const propertyFlowPriceMatrix = {
  USD: {
    stripeCurrency: "usd",
    starter: { amount: 23900, display: "$239" },
    professional: { amount: 56900, display: "$569" },
    "white-label": { amount: 114900, display: "$1,149" }
  },
  GBP: {
    stripeCurrency: "gbp",
    starter: { amount: 18700, display: "£187" },
    professional: { amount: 44700, display: "£447" },
    "white-label": { amount: 89700, display: "£897" }
  },
  EUR: {
    stripeCurrency: "eur",
    starter: { amount: 21700, display: "€217" },
    professional: { amount: 51900, display: "€519" },
    "white-label": { amount: 103900, display: "€1,039" }
  },
  BRL: {
    stripeCurrency: "brl",
    starter: { amount: 129000, display: "R$1.290" },
    professional: { amount: 309000, display: "R$3.090" },
    "white-label": { amount: 619000, display: "R$6.190" }
  }
} as const

export const propertyFlowCurrencies = [
  {
    code: "USD",
    label: "$ USD",
    prices: {
      starter: propertyFlowPriceMatrix.USD.starter.display,
      professional: propertyFlowPriceMatrix.USD.professional.display,
      "white-label": propertyFlowPriceMatrix.USD["white-label"].display
    }
  },
  {
    code: "GBP",
    label: "GBP",
    prices: {
      starter: propertyFlowPriceMatrix.GBP.starter.display,
      professional: propertyFlowPriceMatrix.GBP.professional.display,
      "white-label": propertyFlowPriceMatrix.GBP["white-label"].display
    }
  },
  {
    code: "EUR",
    label: "EUR",
    prices: {
      starter: propertyFlowPriceMatrix.EUR.starter.display,
      professional: propertyFlowPriceMatrix.EUR.professional.display,
      "white-label": propertyFlowPriceMatrix.EUR["white-label"].display
    }
  },
  {
    code: "BRL",
    label: "R$ BRL",
    prices: {
      starter: propertyFlowPriceMatrix.BRL.starter.display,
      professional: propertyFlowPriceMatrix.BRL.professional.display,
      "white-label": propertyFlowPriceMatrix.BRL["white-label"].display
    }
  }
] as const

export const propertyFlowTiers = [
  {
    id: "starter",
    name: "Starter",
    badge: "No-code launch",
    note: "One-time · Hosted setup",
    eyebrow: "Publish without developers",
    description: "For solo agents and small teams that want a polished property site and a guided workspace created automatically after checkout.",
    ctaLabel: "Start with Starter",
    deliveryHref: "/dashboard/purchases/propertyflow?tier=starter&preview=1",
    downloadFile: "propertyflow-starter-v1.1.0.zip",
    supportWindow: "30 days · 48h SLA",
    templateCount: 3,
    subtitle: "Starter tier · 3 templates · hosted catalogue",
    highlight: false,
    features: [
      "Hosted VOLYNX site created after checkout",
      "Guided brand, listings and publication setup",
      "Property catalogue + filters",
      "Bilingual interface (EN/PT)",
      "VOLYNX subdomain included",
      "3 templates: Classic Grid, Magazine and Compact List",
      "Standalone static export with all 3 Starter templates"
    ]
  },
  {
    id: "professional",
    name: "Professional",
    badge: "Most popular",
    note: "One-time · Live workspace",
    eyebrow: "Operate the agency",
    description: "For agencies and brokerages that need a fuller operating workspace, image management and a guided custom-domain path without editing code.",
    ctaLabel: "Start with Professional",
    deliveryHref: "/dashboard/purchases/propertyflow?tier=professional&preview=1",
    downloadFile: "propertyflow-professional-v1.1.0.zip",
    supportWindow: "90 days · 24h SLA",
    templateCount: 6,
    subtitle: "Professional tier · 6 templates · live workspace",
    highlight: true,
    features: [
      "Everything in Starter",
      "Live property data and admin dashboard",
      "Image gallery + modals",
      "WhatsApp-ready contact actions",
      "Guided custom-domain connection",
      "6 templates, including Gallery Hero, Split View and Masonry",
      "Standalone static export with all 6 templates",
      "Agency delivery license (1 client)"
    ]
  },
  {
    id: "white-label",
    name: "White-Label",
    badge: "Scale",
    note: "One-time · White-label system",
    eyebrow: "Launch many client sites",
    description: "For agencies and studios that want all 15 templates, isolated client workspaces and white-label delivery rights from one operating system.",
    ctaLabel: "Start with White-Label",
    deliveryHref: "/dashboard/purchases/propertyflow?tier=white-label&preview=1",
    downloadFile: "propertyflow-white-label-v1.1.0.zip",
    supportWindow: "12 months · 24h priority SLA",
    templateCount: 15,
    subtitle: "White-Label tier · 15 templates · multi-tenant publishing",
    highlight: false,
    features: [
      "Everything in Professional",
      "All 15 templates with safe template switching",
      "Standalone static export with all 15 templates",
      "Multi-tenant workspaces for client sites",
      "Automated client onboarding and publishing",
      "Integration-ready CRM and analytics toolkit",
      "White-label rights (strip all VOLYNX attribution)",
      "Self-serve migration toolkit for supported platforms",
      "Priority email queue (24h SLA · 12 months)",
      "Community Discord access"
    ]
  }
] as const

export const propertyFlowHeroMetrics = [
  { value: "15", label: "Templates available" },
  { value: "0", label: "Code required" },
  { value: "EN/PT", label: "Bilingual UI" },
  { value: "1", label: "Hosted workspace" }
] as const

export const propertyFlowTemplates = [
  { key: "classic-grid", name: "Classic Grid", tier: "Starter", description: "Catálogo direto, limpo e fácil de percorrer.", bestFor: "Agências com muitos imóveis" },
  { key: "magazine", name: "Magazine", tier: "Starter", description: "Uma imagem principal cria desejo e contexto.", bestFor: "Imóveis premium e boutique" },
  { key: "compact-list", name: "Compact List", tier: "Starter", description: "Comparação rápida de preço, área e localização.", bestFor: "Busca objetiva e inventário extenso" },
  { key: "gallery-hero", name: "Gallery Hero", tier: "Professional", description: "Imagem dominante com galeria para contar a história.", bestFor: "Casas e apartamentos de alto padrão" },
  { key: "split-view", name: "Split View", tier: "Professional", description: "Dados e imagem lado a lado para decidir com segurança.", bestFor: "Empreendimentos e investimento" },
  { key: "masonry", name: "Masonry", tier: "Professional", description: "Cards flexíveis para imóveis com formatos variados.", bestFor: "Portfólios mistos e terrenos" },
  { key: "editorial", name: "Editorial", tier: "White-Label", description: "Narrativa sofisticada para lançamentos e imóveis de destaque.", bestFor: "Imobiliárias boutique e alto padrão" },
  { key: "minimalist", name: "Minimalist", tier: "White-Label", description: "Luxo silencioso com menos bordas e mais respiro visual.", bestFor: "Marcas premium e portfólios selecionados" },
  { key: "card-stack", name: "Card Stack", tier: "White-Label", description: "Cartões empilhados para apresentações e decisões rápidas.", bestFor: "Apresentações comerciais e demonstrações" },
  { key: "timeline", name: "Timeline", tier: "White-Label", description: "Organiza lançamentos, visitas e histórico de comercialização.", bestFor: "Projetos e empreendimentos em fases" },
  { key: "map-first", name: "Map-First", tier: "White-Label", description: "A localização lidera a descoberta dos imóveis.", bestFor: "Operações por bairro e região" },
  { key: "grouped", name: "Grouped", tier: "White-Label", description: "Separa o inventário por bairros, mercados ou categorias.", bestFor: "Imobiliárias com vários mercados" },
  { key: "story-mode", name: "Story Mode", tier: "White-Label", description: "Uma experiência narrativa para um imóvel ou campanha.", bestFor: "Lançamentos flagship" },
  { key: "showroom", name: "Showroom", tier: "White-Label", description: "Carrossel premium para destacar uma curadoria enxuta.", bestFor: "Vitrines de alto padrão" },
  { key: "catalog", name: "Catalog", tier: "White-Label", description: "Visão operacional para listas e comparações sérias.", bestFor: "Equipes comerciais e shortlists" }
] as const

export const propertyFlowComparisonRows = [
  { feature: "Hosted VOLYNX publication", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "No-code onboarding", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "VOLYNX subdomain", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Custom domain connection", starter: "Guided", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Standalone static export", starter: "3 templates", professional: "6 templates", whiteLabel: "15 templates" },
  { feature: "Property catalogue", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Filters", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Bilingual EN/PT", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Hosted Supabase backend", starter: "-", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Hosted admin workspace", starter: "Basic", professional: "Full", whiteLabel: "Multi-tenant" },
  { feature: "Image gallery + modals", starter: "-", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Contact actions", starter: "WhatsApp", professional: "WhatsApp", whiteLabel: "Customizable" },
  { feature: "Templates included", starter: "3", professional: "6", whiteLabel: "15" },
  { feature: "Agency delivery license", starter: "-", professional: "1 client", whiteLabel: "Unlimited" },
  { feature: "Multi-tenant mode", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "CRM / analytics toolkit", starter: "-", professional: "-", whiteLabel: "Included" },
  { feature: "White-label rights", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "Automated onboarding", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Email support window", starter: "30 days", professional: "90 days", whiteLabel: "12 months" },
  { feature: "Email response SLA", starter: "48h", professional: "24h", whiteLabel: "24h priority" },
  { feature: "Free template updates", starter: "-", professional: "-", whiteLabel: "12 months" }
] as const

export const propertyFlowDocs = [
  { slug: "onboarding", title: "Hosted onboarding", tier: "All tiers", file: "onboarding.md" },
  { slug: "setup", title: "Setup", tier: "Starter+", file: "setup.md" },
  { slug: "customization", title: "Customization", tier: "Starter+", file: "customization.md" },
  { slug: "admin", title: "Admin dashboard", tier: "Professional+", file: "admin.md" },
  { slug: "supabase", title: "Supabase", tier: "Professional+", file: "supabase.md" },
  { slug: "multi-tenant", title: "Multi-tenant", tier: "White-Label", file: "multi-tenant.md" },
  { slug: "migration-toolkit", title: "Migration toolkit", tier: "White-Label", file: "migration-toolkit.md" },
  { slug: "integrations", title: "Integrations", tier: "White-Label", file: "integrations.md" },
  { slug: "white-label", title: "White-label", tier: "White-Label", file: "white-label.md" },
  { slug: "license", title: "License", tier: "All tiers", file: "license.md" },
  { slug: "tier-config", title: "Tier config", tier: "Technical", file: "tier-config.md" }
] as const

export const propertyFlowDeliveryFeatures = [
  {
    title: "Hosted Property Flow workspace",
    description: "The public site, dashboard and tenant data are provisioned automatically after checkout.",
    minTier: "starter"
  },
  {
    title: "Property catalogue",
    description: "Grid view, cover images, filters by name, neighbourhood, type and price.",
    minTier: "starter"
  },
  {
    title: "Bilingual EN + PT-BR",
    description: "Full i18n, every string translated and language toggle ready.",
    minTier: "starter"
  },
  {
    title: "No-code publication",
    description: "Start with a VOLYNX subdomain. Connect a custom domain through guided DNS verification.",
    minTier: "starter"
  },
  {
    title: "Supabase backend",
    description: "Auth, database and storage. Free tier handles most agencies.",
    minTier: "professional"
  },
  {
    title: "Admin dashboard",
    description: "Properties CRUD, leads inbox, featured toggles and image upload.",
    minTier: "professional"
  },
  {
    title: "Contact actions",
    description: "WhatsApp-ready contact actions that can be customized per property and brand.",
    minTier: "professional"
  },
  {
    title: "Multi-tenant mode",
    description: "Separate client workspaces with isolated data, branding, templates and publication settings.",
    minTier: "white-label"
  },
  {
    title: "CRM integration toolkit",
    description: "Documented, tenant-safe connection points for supported CRM integrations.",
    minTier: "white-label"
  },
  {
    title: "Analytics foundation",
    description: "Tenant-safe data structures prepared for reporting extensions and exports.",
    minTier: "white-label"
  }
] as const

export const propertyFlowTierRank: Record<PropertyFlowTierId, number> = {
  starter: 0,
  professional: 1,
  "white-label": 2
}

export function isPropertyFlowDocTierAllowed(tierId: PropertyFlowTierId, docTier: string) {
  const rank = propertyFlowTierRank[tierId]

  if (docTier === "All tiers" || docTier === "Starter+") {
    return true
  }

  if (docTier === "Professional+") {
    return rank >= propertyFlowTierRank.professional
  }

  if (docTier === "White-Label" || docTier === "Technical") {
    return rank >= propertyFlowTierRank["white-label"]
  }

  return false
}

export function getPropertyFlowTier(id: string | null | undefined) {
  return propertyFlowTiers.find((tier) => tier.id === id) ?? propertyFlowTiers[2]
}
