import { SiteHeader } from "@/components/common/site-header"
import { SiteFooter } from "@/components/common/site-footer"
import { ProductBanner } from "@/components/common/product-banner"
import { Hero } from "@/components/sections/hero"
import { LogoCloud } from "@/components/sections/logo-cloud"
import { MetricsBand } from "@/components/sections/metrics-band"
import { ValueGrid } from "@/components/sections/value-grid"
import { FeatureSplit } from "@/components/sections/feature-split"
import { KitPackageMap } from "@/components/sections/kit-package-map"
import { Pricing } from "@/components/sections/pricing"
import { FAQ } from "@/components/sections/faq"
import { FinalCTA } from "@/components/sections/final-cta"

const saasMetrics = [
  { value: "12", label: "Core sections" },
  { value: "3", label: "Pricing blocks" },
  { value: "< 1 day", label: "Launch window" },
  { value: "SEO", label: "Ready structure" },
]

const saasLogos = ["PRODUCT LED", "AI TOOLS", "DEV SAAS", "B2B PLATFORM", "STARTUP LAB"]

const saasCards = [
  {
    title: "Section-first story",
    description: "Move from problem, proof and product value into pricing without rebuilding the page logic.",
  },
  {
    title: "Speed-aware layout",
    description: "Lean blocks, controlled effects and clear hierarchy keep the product feeling expensive.",
  },
  {
    title: "Conversion-ready pricing",
    description: "Launch, Growth and Scale tiers give the buyer a clean path from curiosity to commitment.",
  },
  {
    title: "Launch documentation",
    description: "Copy prompts, section map and deployment notes help the kit become a repeatable workflow.",
  },
]

const saasFaqs = [
  {
    question: "What does the SaaS Landing System include?",
    answer: "A conversion-focused landing page kit with clean sections, SEO structure, copy framework and performance checklist. Ready to deploy on Cloudflare Pages, Vercel or any static host.",
  },
  {
    question: "Can I customize the sections and copy?",
    answer: "Everything is editable. Sections are modular, copy is structured with placeholder guidance, and the design tokens let you match any brand identity.",
  },
  {
    question: "Is this a template or a system?",
    answer: "A system. You get reusable sections, structured variants, design tokens and launch-ready pages - not a one-off layout you need to reverse-engineer.",
  },
]

export default function SaaSDemoPage() {
  return (
    <div className="theme-saas">
      <ProductBanner
        label="SaaS Demo"
        productName="SaaS Landing System"
        href="https://volynx.world/products/saas-landing-system/"
      />
      <SiteHeader />
      <main>
        <Hero
          variant="product"
          title="Turn product value into conviction with a SaaS page that moves fast."
          subtitle="A section-first landing system for founders and teams that need premium positioning, clean proof and a page they can ship without rebuilding from zero."
          primaryCta="View pricing"
          primaryHref="#pricing"
          secondaryCta="Open kit"
          secondaryHref="https://volynx.world/products/saas-landing-system/"
        />
        <LogoCloud logos={saasLogos} />
        <MetricsBand items={saasMetrics} />
        <KitPackageMap kit="saas" />
        <ValueGrid
          badge="Platform"
          title="The page structure follows the sales argument."
          copy="Each block has a job: establish trust, make the product concrete and give the buyer a confident next step."
          cards={saasCards}
        />
        <FeatureSplit />
        <Pricing kit="saas" variant="tiered" />
        <FAQ
          badge="About the kit"
          title="What you need to know about the SaaS Landing System."
          copy="Real answers about what is included, how it works and what you can build."
          items={saasFaqs}
        />
        <FinalCTA
          eyebrow="Ready to ship?"
          title="Launch the SaaS page before the momentum cools."
          subtitle="Use the system as the foundation, swap the content layer and ship the page with enough structure to sell."
          primaryCta="View pricing"
          primaryHref="#pricing"
          secondaryCta="Get the SaaS Kit"
          secondaryHref="https://volynx.world/products/saas-landing-system/"
        />
      </main>
      <SiteFooter />
    </div>
  )
}
