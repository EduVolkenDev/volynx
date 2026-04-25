import { SiteHeader } from "@/components/common/site-header"
import { SiteFooter } from "@/components/common/site-footer"
import { ProductBanner } from "@/components/common/product-banner"
import { Hero } from "@/components/sections/hero"
import { LogoCloud } from "@/components/sections/logo-cloud"
import { MetricsBand } from "@/components/sections/metrics-band"
import { ValueGrid } from "@/components/sections/value-grid"
import { FeatureSplit } from "@/components/sections/feature-split"
import { WorkflowSteps } from "@/components/sections/workflow-steps"
import { KitPackageMap } from "@/components/sections/kit-package-map"
import { Pricing } from "@/components/sections/pricing"
import { FAQ } from "@/components/sections/faq"
import { FinalCTA } from "@/components/sections/final-cta"

const portfolioMetrics = [
  { value: "Personal", label: "Brand system" },
  { value: "Case", label: "Study blocks" },
  { value: "CV", label: "Career bridge" },
  { value: "Global", label: "Client-ready" },
]

const portfolioLogos = ["VOLYNX", "STUDIOS VALCARCE", "STUDIO PRO", "DEV JOURNEY", "VOLYNX LAB"]

const portfolioCards = [
  {
    title: "Personal brand structure",
    description: "Introduce what you do, why it matters and how people should evaluate your work.",
  },
  {
    title: "Case study rhythm",
    description: "Frame projects around context, contribution and outcome instead of a loose gallery.",
  },
  {
    title: "Career operating system",
    description: "Connect portfolio, CV, services and contact into one coherent professional surface.",
  },
  {
    title: "Premium first impression",
    description: "Large type, controlled contrast and lean sections help the work feel more credible.",
  },
]

const portfolioFaqs = [
  {
    question: "What type of projects do you take on?",
    answer: "Web applications, SaaS products, landing pages, and digital products. I work best on projects that need both strong engineering and visual polish.",
  },
  {
    question: "Do you work with teams or solo?",
    answer: "Both. I can integrate into an existing team or deliver end-to-end as a solo developer, depending on the project scope.",
  },
  {
    question: "What is your typical timeline?",
    answer: "Landing pages and marketing sites: 1-2 weeks. Web applications and SaaS: 4-8 weeks depending on scope. I scope honestly and ship on time.",
  },
]

export default function PortfolioDemoPage() {
  return (
    <div className="theme-portfolio">
      <ProductBanner
        label="Portfolio Demo"
        productName="Portfolio Pro Kit"
        href="https://volynx.world/products/portfolio-pro-kit/"
      />
      <SiteHeader />
      <main>
        <Hero
          variant="minimal"
          title="Launch fast, feel premium and give your personal brand an operating system."
          subtitle="A portfolio kit for builders who need more than a gallery: positioning, proof, career context and a premium first impression."
          primaryCta="Explore sections"
          primaryHref="#sections"
          secondaryCta="Open kit"
          secondaryHref="https://volynx.world/products/portfolio-pro-kit/"
        />
        <LogoCloud logos={portfolioLogos} />
        <MetricsBand items={portfolioMetrics} />
        <KitPackageMap kit="portfolio" />
        <ValueGrid
          badge="Skills"
          title="Present the professional story, not only the project list."
          copy="The kit turns experience, outcomes and availability into a clear path for clients, recruiters and collaborators."
          cards={portfolioCards}
        />
        <FeatureSplit />
        <WorkflowSteps />
        <Pricing kit="portfolio" variant="single" />
        <FAQ
          badge="Working together"
          title="Common questions from clients and collaborators."
          copy="Transparent answers so we can move faster."
          items={portfolioFaqs}
        />
        <FinalCTA
          eyebrow="Available for hire"
          title="Turn scattered work into a premium professional surface."
          subtitle="Use the kit to connect your projects, CV, services and next step without rebuilding your personal site from scratch."
          primaryCta="Explore sections"
          primaryHref="#sections"
          secondaryCta="Download CV"
          secondaryHref="#"
        />
      </main>
      <SiteFooter />
    </div>
  )
}
