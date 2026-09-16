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
    "PropertyFlow is a premium bilingual real-estate platform that creates and publishes a branded property site automatically, with hosted workspaces, custom-domain guidance and white-label delivery."
}

const systemHighlights = [
  {
    title: "Published without code",
    copy: "Checkout creates a hosted workspace, a branded catalogue and a VOLYNX subdomain so the buyer can start without touching a repository.",
    icon: Building2
  },
  {
    title: "One simple operating layer",
    copy: "The dashboard manages properties, photos, templates and publication. A custom domain is guided from the same setup flow.",
    icon: Database
  },
  {
    title: "White-label at scale",
    copy: "Agencies can create separate client workspaces, preserve tenant isolation and launch branded sites from one system.",
    icon: ShieldCheck
  }
]

const launchChecks = [
  "15 property display templates across three tiers",
  "The hosted workspace is the primary product",
  "VOLYNX subdomain included; custom domains guided",
  "Starter, Professional and White-Label presented as distinct products",
  "Real property photo previews for every grid and display model",
  "Checkout-ready pricing with USD, GBP, EUR and BRL",
  "Existing sites remain untouched unless the owner chooses an integration",
  "A complete standalone static ZIP is included and optional"
]

const buyerFlow = [
  ["01", "Choose your tier", "Starter includes 3 templates, Professional includes 6, and White-Label includes all 15."],
  ["02", "Complete secure checkout", "Your account and purchase entitlement stay connected from the first payment event."],
  ["03", "Open your ready workspace", "The dashboard, tenant space, first site shell and VOLYNX address are created automatically."],
  ["04", "Make it yours", "Add your logo, colors, contact details, photos and properties through guided forms."],
  ["05", "Choose and preview a template", "Switch only between templates included in your tier. Your properties and photos remain untouched."],
  ["06", "Publish and connect", "Launch on a VOLYNX subdomain immediately, or follow the guided path to a domain you already own."]
] as const

const buyerChoices = [
  ["No domain yet", "Start with your free your-brand.volynx.world address. Connect a custom domain later without rebuilding the site."],
  ["I already have a domain", "Add the domain in the workspace. You receive the exact DNS step and SSL follows after verification."],
  ["I already have a website", "Keep it untouched. Add a link or subdomain first; embeds and internal routes are optional and depend on the existing host."]
] as const

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
                A premium property site that publishes itself.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                PropertyFlow is a hosted property-site workspace: choose a tier, pay once and follow a guided setup.
                Your dashboard, catalogue, brand settings and public site are created automatically. The optional ZIP is
                a complete standalone static site for teams that want a separate self-hosted path.
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
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Hosted product surface</p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">From checkout to live site</h2>
                      <p className="mt-3 text-sm leading-6 text-zinc-300">
                        Configure your brand, choose a template and publish without editing the existing site.
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

        <section className="section-space border-b border-white/5">
          <div className="container-shell">
            <div className="mb-10 max-w-3xl">
              <span className="eyebrow">How it works</span>
              <h2 className="section-title">A buyer should never have to guess the next step.</h2>
              <p className="section-copy mt-5">
                This is the complete route from purchase to a public property site. You do not need your own domain,
                access to an existing codebase or a developer to begin.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {buyerFlow.map(([step, title, copy]) => (
                <article key={step} className="surface min-h-[210px] p-6">
                  <span className="text-xs font-semibold tracking-[0.22em] text-emerald-200">{step}</span>
                  <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space border-b border-white/5">
          <div className="container-shell">
            <div className="mb-10 max-w-3xl">
              <span className="eyebrow">Choose your starting point</span>
              <h2 className="section-title">No domain, existing domain or existing website — all three paths are clear.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {buyerChoices.map(([title, copy]) => (
                <article key={title} className="surface p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space">
          <div className="container-shell">
            <div className="mb-10 max-w-3xl">
              <span className="eyebrow">What buyers get</span>
              <h2 className="section-title">A clear route from purchase to publication.</h2>
              <p className="section-copy mt-5">
                Every tier starts with the same no-code foundation. The difference is how much operational depth,
                template access and client scale you need.
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

        <section className="section-space border-y border-white/5">
          <div className="container-shell">
            <div className="mb-10 max-w-3xl">
              <span className="eyebrow">Publication paths</span>
              <h2 className="section-title">Your existing website does not need to change.</h2>
              <p className="section-copy mt-5">
                PropertyFlow is hosted separately by default, so no access to the customer&apos;s codebase is required.
                The original website can stay exactly where it is.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                ["VOLYNX subdomain", "Automatic", "The fastest path: your branded site goes live at a VOLYNX subdomain after setup."],
                ["Custom domain", "Guided", "Connect imoveis.yourdomain.com with a guided DNS check and automatic SSL."],
                ["Existing site", "Optional", "Add a link, subdomain or supported embed. We never pretend arbitrary sites can be edited without access."]
              ].map(([title, badge, copy]) => (
                <article key={title} className="surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h3>
                    <span className="rounded-md border border-emerald-200/20 bg-emerald-200/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100">{badge}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space">
          <div className="container-shell">
            <div className="surface grid gap-6 overflow-hidden p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
              <div>
                <span className="eyebrow">Pre-launch polish</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                  From checkout to published property site without a developer handoff.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
                  See the templates, understand the domain path and choose the tier that matches the operation before checkout.
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
