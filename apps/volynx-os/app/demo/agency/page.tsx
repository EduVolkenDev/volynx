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

const agencyMetrics = [
  { value: "SOW", label: "Scope system" },
  { value: "Proposal", label: "Included flow" },
  { value: "24h", label: "Lead response" },
  { value: "Premium", label: "Positioning" },
]

const agencyLogos = ["STARTUP LAB", "BRAND STUDIO", "GROWTH OPS", "PRODUCT TEAM", "FOUNDER LED"]

const agencyCards = [
  {
    title: "Proposal path",
    description: "Present the offer, timeline and value in a way that makes the next step feel obvious.",
  },
  {
    title: "SOW discipline",
    description: "Scope, deliverables and revision rules are part of the system instead of a late scramble.",
  },
  {
    title: "Premium web presence",
    description: "Services, proof, process and pricing all work together to make the agency feel established.",
  },
  {
    title: "Client onboarding",
    description: "Reduce friction after the sale with clearer handoff, intake and expectation-setting blocks.",
  },
]

const agencyFaqs = [
  {
    question: "What does the Agency Launch Kit include?",
    answer: "A ready-to-deploy agency website, proposal template, SOW template, onboarding checklist, and revision rules. Everything you need to look professional from day one.",
  },
  {
    question: "Can I use this for my own agency or client work?",
    answer: "Yes. Commercial and Studio licenses allow client delivery. You get the full source code and can customize everything.",
  },
  {
    question: "How is this different from a generic template?",
    answer: "It is a business system, not a layout. It includes operational documents (SOW, proposal, onboarding) alongside the website - built for agencies that want to close deals faster.",
  },
]

export default function AgencyDemoPage() {
  return (
    <div className="theme-agency">
      <ProductBanner
        label="Agency Demo"
        productName="Agency Launch Kit"
        href="https://volynx.world/products/agency-launch-kit/"
      />
      <SiteHeader />
      <main>
        <Hero
          variant="centered"
          title="Close agency work with a site, proposal and scope system that agree."
          subtitle="A premium agency launch kit for studios that need more than a pretty homepage: positioning, SOW logic and client-ready structure in one place."
          primaryCta="View packages"
          primaryHref="#pricing"
          secondaryCta="Open kit"
          secondaryHref="https://volynx.world/products/agency-launch-kit/"
        />
        <MetricsBand items={agencyMetrics} />
        <LogoCloud logos={agencyLogos} />
        <KitPackageMap kit="agency" />
        <ValueGrid
          badge="Services"
          title="Everything supports the sales conversation."
          copy="The website, proposal and onboarding flow point toward the same promise, so the agency feels sharper before the first call."
          cards={agencyCards}
        />
        <FeatureSplit />
        <WorkflowSteps />
        <Pricing kit="agency" variant="tiered" />
        <FAQ
          badge="About the kit"
          title="What you need to know about the Agency Launch Kit."
          copy="Real answers about what is included, licensing and how it works."
          items={agencyFaqs}
        />
        <FinalCTA
          eyebrow="New project?"
          title="Package your agency like the work is already premium."
          subtitle="Use the kit to align the offer, scope and website before leads start asking hard questions."
          primaryCta="View packages"
          primaryHref="#pricing"
          secondaryCta="Get the Agency Kit"
          secondaryHref="https://volynx.world/products/agency-launch-kit/"
        />
      </main>
      <SiteFooter />
    </div>
  )
}
