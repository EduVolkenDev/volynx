export type KitSlug = "portfolio" | "agency" | "saas"

export type KitTier = {
  id: string
  name: string
  price: string
  sectionCount: string
  pageCount?: string
  description: string
  bestFor: string
  sections: string[]
  additions?: string[]
  highlight?: boolean
  ctaLabel: string
}

export type KitOffer = {
  slug: KitSlug
  productName: string
  shortName: string
  href: string
  whoFor: string
  buyerFrame: string
  starterLabel: string
  tiers: KitTier[]
}

export const proUpsell = {
  name: "Volynx Pro",
  price: "$19/mo",
  annual: "$179/year",
  promise: "All 3 kits, every tier, Image Suite Pro and Daily unlimited in one recurring product.",
  checkoutLine: "Or get every kit, every tier and the full Volynx tool layer with Volynx Pro."
} as const

export const launchGuarantee = {
  title: "7-day preview-match guarantee",
  copy: "If the delivered kit does not match what was shown in the previews, the buyer gets a full refund."
} as const

export const operationalGuards = [
  "Automatic email 2h after purchase: Got your kit? with resend link.",
  "Public checkout must use Stripe LIVE sessions: cs_live_, pk_live_ and sk_live_.",
  "USD must be the default buyer currency; add local currencies only when live Stripe prices exist.",
  "Before launch, run one low-value real purchase and verify receipt, webhook delivery and ZIP contents.",
  "BRL prices stay fixed annually from USD x 5.8 instead of spot FX.",
  "Every kit page leads with a Who this is for block before pricing."
] as const

export const kitOffers: Record<KitSlug, KitOffer> = {
  portfolio: {
    slug: "portfolio",
    productName: "Portfolio Pro Kit",
    shortName: "Portfolio",
    href: "https://volynx.world/products/portfolio-pro-kit/",
    whoFor: "For builders where the person is the product: developers, designers, freelancers, solo founders and creators selling trust through their work.",
    buyerFrame: "You are the work.",
    starterLabel: "Starter",
    tiers: [
      {
        id: "starter",
        name: "Starter",
        price: "$49",
        sectionCount: "5",
        description: "The clean personal-brand launch path.",
        bestFor: "Fast credibility, one clear offer and a polished first impression.",
        sections: ["Hero minimal", "Feature split", "Value grid", "FAQ", "CTA"],
        ctaLabel: "Buy Starter"
      },
      {
        id: "pro",
        name: "Pro",
        price: "$109",
        sectionCount: "9",
        description: "A stronger portfolio sales page with proof and flow.",
        bestFor: "Client work, hiring, consulting and serious personal positioning.",
        sections: ["Everything in Starter", "Hero split", "Logo cloud", "Workflow", "Pricing single"],
        highlight: true,
        ctaLabel: "Buy Pro"
      },
      {
        id: "studio",
        name: "Studio",
        price: "$209",
        sectionCount: "12+",
        pageCount: "extra pages",
        description: "The complete personal operating system.",
        bestFor: "Creators and specialists who need a full premium presence.",
        sections: ["Everything in Pro", "Hero centered", "Hero product", "Metrics band"],
        additions: ["About page", "Contact page", "1 case study", "Dark/light mode"],
        ctaLabel: "Buy Studio"
      }
    ]
  },
  agency: {
    slug: "agency",
    productName: "Agency Launch Kit",
    shortName: "Agency",
    href: "https://volynx.world/products/agency-launch-kit/",
    whoFor: "For agencies, studios and operators selling other people's work: service pages, proof, process, scope and proposal logic in one launch surface.",
    buyerFrame: "You sell others' work.",
    starterLabel: "Starter",
    tiers: [
      {
        id: "starter",
        name: "Starter",
        price: "$69",
        sectionCount: "6",
        description: "A focused agency page for first leads.",
        bestFor: "New studios, solo agencies and fast service packaging.",
        sections: ["Hero centered", "Logo cloud", "Value grid", "Workflow", "FAQ", "CTA"],
        ctaLabel: "Buy Starter"
      },
      {
        id: "agency-pro",
        name: "Agency Pro",
        price: "$149",
        sectionCount: "10",
        description: "The commercial agency kit with stronger proof and pricing.",
        bestFor: "Agencies that need a page, offer structure and scope confidence.",
        sections: ["Everything in Starter", "Hero split", "Metrics band", "Feature split", "Pricing tiered"],
        highlight: true,
        ctaLabel: "Buy Agency Pro"
      },
      {
        id: "studio",
        name: "Studio",
        price: "$289",
        sectionCount: "13+",
        pageCount: "extra pages",
        description: "A full agency product shelf and delivery system.",
        bestFor: "Studios selling retainers, productized services or client launches.",
        sections: ["Everything in Agency Pro", "Hero minimal", "Hero product", "Pricing comparison"],
        additions: ["Services detail", "Case study", "Proposal template", "Dark/light mode"],
        ctaLabel: "Buy Studio"
      }
    ]
  },
  saas: {
    slug: "saas",
    productName: "SaaS Landing System",
    shortName: "SaaS",
    href: "https://volynx.world/products/saas-landing-system/",
    whoFor: "For founders and product teams that need the value of a SaaS product to become obvious fast: positioning, proof, pricing and launch docs.",
    buyerFrame: "You sell product clarity.",
    starterLabel: "Launch",
    tiers: [
      {
        id: "launch",
        name: "Launch",
        price: "$79",
        sectionCount: "6",
        description: "The shortest clean path to a sellable SaaS page.",
        bestFor: "MVP launches, waitlists and focused product validation.",
        sections: ["Hero product", "Logo cloud", "Value grid", "Pricing single", "FAQ", "CTA"],
        ctaLabel: "Buy Launch"
      },
      {
        id: "growth",
        name: "Growth",
        price: "$169",
        sectionCount: "10",
        description: "A complete conversion page for a growing SaaS offer.",
        bestFor: "Products with enough proof, features and pricing depth to convert.",
        sections: ["Everything in Launch", "Hero centered", "Metrics band", "Feature split", "Pricing tiered"],
        highlight: true,
        ctaLabel: "Buy Growth"
      },
      {
        id: "scale",
        name: "Scale",
        price: "$329",
        sectionCount: "14+",
        pageCount: "extra pages",
        description: "The product marketing system for serious SaaS launches.",
        bestFor: "Teams preparing a stronger launch, docs layer and ongoing roadmap.",
        sections: ["Everything in Growth", "Hero split", "Hero minimal", "Workflow", "Pricing comparison"],
        additions: ["Changelog", "Roadmap", "Docs starter", "Dark/light mode"],
        ctaLabel: "Buy Scale"
      }
    ]
  }
} as const

export const kitOfferList = [kitOffers.portfolio, kitOffers.agency, kitOffers.saas] as const
