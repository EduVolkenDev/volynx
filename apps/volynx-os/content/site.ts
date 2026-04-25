import { getPropertyFlowPublicUrl } from "@/lib/volynx-public"

export const propertyFlowUrl = getPropertyFlowPublicUrl()
export const storeUrl = "https://volynx.world/products/"

export const platformProducts = [
  {
    name: "VOLYNX Daily",
    label: "Execution OS",
    href: "/daily",
    status: "Use now",
    description: "Capture anything and route it into tasks, summaries, writing and decisions.",
    actions: ["Command Inbox", "VOLYNX AI", "Local fallback"]
  },
  {
    name: "Icons Store",
    label: "Asset shelf",
    href: "/icons-store",
    status: "Browse",
    description: "Premium and free icon packs with checkout-ready delivery.",
    actions: ["Free drops", "Premium packs", "Instant ZIPs"]
  },
  {
    name: "PropertyFlow",
    label: "Product kit",
    href: propertyFlowUrl,
    status: "Buy",
    description: "Premium real-estate SaaS kit with tiered delivery and white-label rights.",
    actions: ["Starter", "Professional", "White-Label"]
  },
  {
    name: "Purchases",
    label: "Delivery hub",
    href: "/dashboard/purchases",
    status: "Download",
    description: "Return to verified downloads, docs and post-purchase support.",
    actions: ["Icons delivery", "PropertyFlow delivery", "Docs"]
  }
] as const

export const metrics = [
  { label: "Core kits", value: "4" },
  { label: "Sections", value: "39+" },
  { label: "Launch time", value: "< 1 day" },
  { label: "Pro upsell", value: "$19/mo" }
]

export const logoCloud = ["Venture Studio", "Studio North", "Dev Foundry", "Agency Zero", "Creator Lab"]

export const productKits = [
  {
    name: "Portfolio Pro Kit",
    label: "Flagship kit",
    href: "https://volynx.world/products/portfolio-pro-kit/",
    description: "Launch fast, feel premium and give your personal brand a real operating system.",
    points: ["Starts at $49", "You are the work", "5 to 12+ sections"]
  },
  {
    name: "Agency Launch Kit",
    label: "For agencies",
    href: "https://volynx.world/products/agency-launch-kit/",
    description: "Proposal, SOW and premium website structure built to close with less friction.",
    points: ["Starts at $69", "You sell others' work", "6 to 13+ sections"]
  },
  {
    name: "SaaS Landing System",
    label: "For SaaS",
    href: "https://volynx.world/products/saas-landing-system/",
    description: "Section-first, speed-aware and ready to turn product value into conviction.",
    points: ["Starts at $79", "You sell product clarity", "6 to 14+ sections"]
  },
  {
    name: "PropertyFlow",
    label: "Real estate SaaS",
    href: propertyFlowUrl,
    description: "Bilingual real-estate SaaS kit with tiered delivery, docs and white-label upgrade logic.",
    points: ["Starts at $239", "15 templates", "White-label tier"]
  }
]

export const featureCards = [
  {
    title: "Section-first architecture",
    description: "Compose product pages by swapping opinionated blocks instead of rebuilding launch surfaces from zero."
  },
  {
    title: "Monetization-first copy",
    description: "Every block has a commercial job: clarify the offer, reduce doubt and move buyers toward action."
  },
  {
    title: "Launch fast by default",
    description: "Lean components, restrained effects and performance-conscious styling keep the platform ready to ship."
  },
  {
    title: "VolynxOS tokens",
    description: "Type, spacing, containers and surfaces stay coherent across every kit, demo and product line."
  }
]

export const testimonials = [
  {
    quote: "The sections gave our launch page enough structure to feel deliberate without slowing the team down.",
    name: "Mara Chen",
    role: "Founder, Northstar Labs"
  },
  {
    quote: "We used the agency demo as a base, swapped the content layer and shipped a client-ready first pass the same day.",
    name: "Eli Ramos",
    role: "Creative director, Forma Studio"
  },
  {
    quote: "It feels like launch infrastructure, not a template. That distinction matters when you sell premium work.",
    name: "Noah Patel",
    role: "Independent product builder"
  }
]

export const comparisonRows = [
  {
    feature: "Page composition",
    templatePack: "Fixed pages that need manual rewiring.",
    volynx: "VolynxOS sections with reusable variants."
  },
  {
    feature: "Positioning",
    templatePack: "Generic copy and visual novelty.",
    volynx: "Commercial copy structure and restrained premium cues."
  },
  {
    feature: "Scaling",
    templatePack: "New product often means a new template.",
    volynx: "Shared tokens, demos and content data across product lines."
  },
  {
    feature: "Developer workflow",
    templatePack: "Pretty start, messy handoff.",
    volynx: "Next.js components, Tailwind utilities, docs and launch CTAs."
  }
]

export const pricingTiers = [
  {
    name: "Kit Starter",
    price: "from $49",
    description: "For buyers who need one premium launch surface now.",
    features: ["Portfolio from $49", "Agency from $69", "SaaS from $79", "Commercial use"],
    href: storeUrl
  },
  {
    name: "Volynx Pro",
    price: "$19/mo",
    description: "For buyers who should get every kit, every tier and the full tool layer.",
    features: ["All 3 kits", "All tiers", "Image Suite Pro", "Daily unlimited"],
    highlight: true,
    href: "https://volynx.world/pricing/"
  },
  {
    name: "Studio / Scale",
    price: "from $209",
    description: "For studios and serious launches that need pages, modes and expansion assets.",
    features: ["Extra pages", "Dark/light mode", "Comparison pricing", "Premium expansion"],
    href: storeUrl
  }
]

export const workflow = [
  { step: "01", title: "Choose the product line", copy: "Portfolio, agency, SaaS or property." },
  { step: "02", title: "Attach the selling blocks", copy: "Hero, proof, pricing, FAQ and final CTA." },
  { step: "03", title: "Ship into revenue", copy: "Docs, tokens and product links keep execution clean." }
]

export const faqs = [
  {
    question: "Is this a UI kit or a template pack?",
    answer: "It is VolynxOS: reusable sections, structured variants, tokens and launch-ready product pages."
  },
  {
    question: "Can I use it for client work?",
    answer: "Yes. VolynxOS is built for commercial launches, your own products and client delivery."
  },
  {
    question: "How fast can I launch?",
    answer: "The demo pages are ready to edit. Many products can be adapted and shipped in a single day."
  }
]
