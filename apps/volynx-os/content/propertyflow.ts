export type PropertyFlowTierId = "starter" | "professional" | "white-label"
export type PropertyFlowCurrencyCode = "USD" | "GBP" | "EUR" | "BRL"

export const propertyFlowVersion = "1.0.0"

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
    badge: "Source code",
    note: "One-time · Source code",
    eyebrow: "Launch the catalogue",
    description: "For solo agents or small teams that need a polished bilingual property showcase with static data.",
    ctaLabel: "Get Starter",
    deliveryHref: "/dashboard/purchases/propertyflow?tier=starter&preview=1",
    downloadFile: "propertyflow-starter-v1.0.0.zip",
    supportWindow: "30 days · 48h SLA",
    subtitle: "Starter tier · 3 templates · static catalogue",
    highlight: false,
    features: [
      "Full React source code",
      "Property catalogue + filters",
      "Bilingual interface (EN/PT)",
      "Responsive design",
      "Static data mode",
      "3 grid templates"
    ]
  },
  {
    id: "professional",
    name: "Professional",
    badge: "Most popular",
    note: "One-time · Full kit",
    eyebrow: "Operate the agency",
    description: "For agencies and brokerages that need Supabase, admin controls, enquiries and a stronger delivery license.",
    ctaLabel: "Get Professional",
    deliveryHref: "/dashboard/purchases/propertyflow?tier=professional&preview=1",
    downloadFile: "propertyflow-professional-v1.0.0.zip",
    supportWindow: "90 days · 24h SLA",
    subtitle: "Professional tier · 6 templates · Supabase + admin",
    highlight: true,
    features: [
      "Everything in Starter",
      "Supabase backend integration",
      "Admin dashboard",
      "Image gallery + modals",
      "Enquiry capture system",
      "6 grid templates (vs 3 in Starter)",
      "Full deployment guide",
      "Agency delivery license (1 client)"
    ]
  },
  {
    id: "white-label",
    name: "White-Label",
    badge: "Premium",
    note: "One-time · Agency delivery",
    eyebrow: "Built for agencies at scale",
    description: "For agencies reselling PropertyFlow as their own real-estate SaaS across many clients.",
    ctaLabel: "Get White-Label",
    deliveryHref: "/dashboard/purchases/propertyflow?tier=white-label&preview=1",
    downloadFile: "propertyflow-white-label-v1.0.0.zip",
    supportWindow: "12 months · 24h priority SLA",
    subtitle: "White-Label tier · 15 templates · multi-tenant",
    highlight: false,
    features: [
      "Everything in Professional",
      "15 grid templates (vs 6 in Pro)",
      "Multi-tenant mode (1 install, unlimited clients)",
      "CRM integrations pack (HubSpot, Pipedrive, Salesforce)",
      "Advanced analytics (per-tenant, per-agent, trends)",
      "White-label rights (strip all VOLYNX attribution)",
      "Automated onboarding + self-serve migration toolkit",
      "Priority email queue (24h SLA · 12 months)",
      "Community Discord access"
    ]
  }
] as const

export const propertyFlowHeroMetrics = [
  { value: "15", label: "Grid templates" },
  { value: "EN/PT", label: "Bilingual UI" },
  { value: "3", label: "Sellable tiers" },
  { value: "1h", label: "Setup target" }
] as const

export const propertyFlowTemplates = [
  { name: "Classic Grid", tier: "Starter" },
  { name: "Magazine", tier: "Starter" },
  { name: "Compact List", tier: "Starter" },
  { name: "Gallery Hero", tier: "Pro+" },
  { name: "Split View", tier: "Pro+" },
  { name: "Masonry", tier: "Pro+" },
  { name: "Editorial", tier: "White-Label" },
  { name: "Minimalist", tier: "White-Label" },
  { name: "Card Stack", tier: "White-Label" },
  { name: "Timeline", tier: "White-Label" },
  { name: "Map-First", tier: "White-Label" },
  { name: "Grouped", tier: "White-Label" },
  { name: "Story Mode", tier: "White-Label" },
  { name: "Showroom", tier: "White-Label" },
  { name: "Catalog", tier: "White-Label" }
] as const

export const propertyFlowComparisonRows = [
  { feature: "React source code", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Property catalogue", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Filters", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Bilingual EN/PT", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Static data mode", starter: "Yes", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Supabase backend", starter: "-", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Admin dashboard", starter: "-", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Image gallery + modals", starter: "-", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Enquiry capture", starter: "-", professional: "Yes", whiteLabel: "Yes" },
  { feature: "Grid templates", starter: "3", professional: "6", whiteLabel: "15" },
  { feature: "Agency delivery license", starter: "-", professional: "1 client", whiteLabel: "Unlimited" },
  { feature: "Multi-tenant mode", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "CRM integrations", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "Advanced analytics", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "White-label rights", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "Automated onboarding", starter: "-", professional: "-", whiteLabel: "Yes" },
  { feature: "Email support window", starter: "30 days", professional: "90 days", whiteLabel: "12 months" },
  { feature: "Email response SLA", starter: "48h", professional: "24h", whiteLabel: "24h priority" },
  { feature: "Free template updates", starter: "-", professional: "-", whiteLabel: "12 months" }
] as const

export const propertyFlowDocs = [
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
    title: "React 19 + Vite 7 codebase",
    description: "Full source, typed, modular. Hot reload and fast builds.",
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
    title: "Enquiry capture",
    description: "Contact forms, email notifications and CRM webhook-ready flow.",
    minTier: "professional"
  },
  {
    title: "Multi-tenant mode",
    description: "One install, unlimited agency clients. Path or domain tenancy.",
    minTier: "white-label"
  },
  {
    title: "CRM integrations",
    description: "HubSpot, Pipedrive and Salesforce webhooks pre-wired.",
    minTier: "white-label"
  },
  {
    title: "Advanced analytics",
    description: "Per-tenant and per-agent metrics with trends and exports.",
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
