import Image from "next/image"
import type { Metadata } from "next"
import { ArrowRight, Building2, CheckCircle2, Database, Globe2, Layers3, ShieldCheck } from "lucide-react"
import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { PropertyFlowPricing } from "@/components/propertyflow/propertyflow-pricing"
import { PropertyFlowShowcase, PropertyFlowTierSamples } from "@/components/propertyflow/propertyflow-showcase"
import {
  propertyFlowHeroMetrics,
  propertyFlowTemplates,
  propertyFlowTiers,
  propertyFlowVersion
} from "@/content/propertyflow"

export const metadata: Metadata = {
  title: "PropertyFlow - Premium real estate SaaS kit",
  description:
    "PropertyFlow is a premium bilingual real-estate SaaS kit with property previews, tiered delivery, Supabase, admin tools and white-label resale rights."
}

const systemHighlights = [
  {
    title: "Public property site",
    copy: "A polished EN/PT catalogue with filters, photos, detail states and responsive layouts.",
    icon: Building2
  },
  {
    title: "Professional operating layer",
    copy: "Admin, enquiries, Supabase wiring and image-led gallery patterns for agencies that need more than static pages.",
    icon: Database
  },
  {
    title: "White-label resale system",
    copy: "Multi-tenant mode, CRM integrations, analytics and attribution controls for agency delivery.",
    icon: ShieldCheck
  }
]

const launchChecks = [
  "15 property display templates across three tiers",
  "Starter, Professional and White-Label presented as distinct products",
  "Real property photo previews for every grid and display model",
  "Checkout-ready pricing with USD, GBP, EUR and BRL"
]

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "PropertyFlow",
  description: metadata.description,
  brand: {
    "@type": "Brand",
    name: "VolynxOS"
  },
  version: propertyFlowVersion,
  offers: propertyFlowTiers.map((tier) => ({
    "@type": "Offer",
    name: `PropertyFlow ${tier.name}`,
    price: tier.id === "starter" ? "187" : tier.id === "professional" ? "447" : "897",
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
    url: "https://volynx.world/products/propertyflow/"
  }))
}

export default function PropertyFlowPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_24%_0%,rgba(45,212,191,.14),transparent_32rem),radial-gradient(circle_at_78%_12%,rgba(251,191,36,.1),transparent_28rem)]" />
          <div className="container-shell grid min-h-[calc(100vh-76px)] gap-10 py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-20">
            <div>
              <BrandLockup size="sm" caption="VX signature" className="mb-5" />
              <span className="eyebrow">PropertyFlow v{propertyFlowVersion}</span>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-white md:text-7xl">
                A premium real-estate SaaS kit buyers can see before they buy.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                PropertyFlow now sells the product in the room: live-style previews, property photography, tier samples,
                template models and a clear path from Starter to White-Label.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#templates" className="button-primary">
                  Preview templates <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a href="#pricing" className="button-secondary">
                  View pricing <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {launchChecks.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="surface overflow-hidden p-3">
                <div className="flex h-10 items-center gap-2 border-b border-white/10 px-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
                  <span className="ml-2 text-xs uppercase tracking-[0.18em] text-zinc-500">propertyflow/showroom</span>
                </div>
                <div className="grid gap-3 p-3 md:grid-cols-[1fr_.72fr]">
                  <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-black">
                    <Image
                      src="/propertyflow/propertyflow2.webp"
                      alt="PropertyFlow premium product illustration"
                      fill
                      priority
                      sizes="(min-width: 1024px) 54vw, 100vw"
                      className="object-cover opacity-80"
                    />
                    <div className="absolute inset-x-5 bottom-5 rounded-lg border border-white/15 bg-black/60 p-5 backdrop-blur-md">
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Live product surface</p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">15 display models</h2>
                      <p className="mt-3 text-sm leading-6 text-zinc-300">
                        Browse templates, sample tiers and property cards directly on the sales page.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
                          <Layers3 className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Template coverage</p>
                          <p className="text-xl font-semibold text-white">{propertyFlowTemplates.length} models</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-200 text-black">
                          <Globe2 className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Launch markets</p>
                          <p className="text-xl font-semibold text-white">EN/PT ready</p>
                        </div>
                      </div>
                    </div>
                    <Image
                      src="/propertyflow/propertyflow-screen-6.png"
                      alt="PropertyFlow product screen sample"
                      width={800}
                      height={800}
                      className="min-h-[300px] rounded-lg border border-white/10 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-8">
          <div className="container-shell grid gap-3 md:grid-cols-4">
            {propertyFlowHeroMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <p className="text-3xl font-semibold tracking-[-0.04em] text-white">{metric.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-space">
          <div className="container-shell">
            <div className="mb-10 max-w-3xl">
              <span className="eyebrow">What buyers get</span>
              <h2 className="section-title">The page now demonstrates the system, not only describes it.</h2>
              <p className="section-copy mt-5">
                Each product layer has a visible job: Starter launches, Professional operates, White-Label lets an
                agency resell a premium property platform.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {systemHighlights.map((item) => {
                const Icon = item.icon

                return (
                  <article key={item.title} className="surface min-h-[260px] p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white text-black">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-zinc-400">{item.copy}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <PropertyFlowTierSamples />
        <PropertyFlowShowcase />
        <PropertyFlowPricing />

        <section className="section-space">
          <div className="container-shell">
            <div className="surface grid gap-6 overflow-hidden p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
              <div>
                <span className="eyebrow">Pre-launch polish</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                  PropertyFlow now looks like a premium GBP 897 product.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
                  The buyer can inspect templates, understand tier differences and see property visuals before Stripe.
                </p>
              </div>
              <a href="#pricing" className="button-primary">
                Choose a tier <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
