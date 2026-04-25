import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteHeader } from "@/components/common/site-header"
import { SiteFooter } from "@/components/common/site-footer"
import { HeroShowcase } from "@/components/sections/hero-showcase"
import { productKits } from "@/content/site"

const sections = [
  "Hero / 4 variants",
  "Launch offer",
  "Product kits",
  "Logo cloud",
  "Metrics band",
  "Value grid",
  "Feature split",
  "Workflow steps",
  "Testimonials",
  "Comparison",
  "Pricing / 3 variants",
  "FAQ",
  "Final CTA",
  "Header + footer"
]

const quickstart = [
  "Install dependencies with npm install",
  "Run npm run dev",
  "Edit content/site.ts for kit copy, metrics, FAQs and pricing",
  "Compose pages from app/page.tsx or the demo routes"
]

const architecture = [
  {
    label: "app/",
    copy: "Routes, metadata and demo page composition."
  },
  {
    label: "components/",
    copy: "Reusable section and common UI primitives."
  },
  {
    label: "content/",
    copy: "Commercial copy, kit data, pricing and social proof."
  },
  {
    label: "lib/",
    copy: "Shared tokens, utilities and motion primitives."
  }
]

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-space border-b border-white/5">
          <div className="container-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <BrandLockup size="sm" caption="VX signature" className="mb-5" />
              <span className="eyebrow">Documentation</span>
              <h1 className="section-title">Build with VolynxOS without reverse-engineering the page.</h1>
              <p className="section-copy mt-5">
                VolynxOS is organized around kits, reusable sections, theme presets and a central content layer. Start with the data, then compose the page.
              </p>
            </div>
            <div className="surface grid gap-3 p-5 sm:grid-cols-2">
              {quickstart.map((item, index) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step {index + 1}</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container-shell">
          <section className="section-space">
            <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr]">
              <div>
                <span className="eyebrow">Architecture</span>
                <h2 className="section-title">The system is small on purpose.</h2>
                <p className="section-copy mt-5">
                  Most changes should happen in content data and page composition. Components stay reusable, routes stay readable and themes stay centralized.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {architecture.map((item) => (
                  <article key={item.label} className="surface p-5">
                    <h3 className="font-mono text-sm text-white">{item.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">{item.copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section-space border-y border-white/5">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="eyebrow">Hero variants</span>
                <h2 className="section-title">Preview the variants without breaking the docs layout.</h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-zinc-500">
                These are compact documentation previews. The real sections still render on the home and demo pages.
              </p>
            </div>
            <HeroShowcase />
          </section>

          <section className="section-space">
            <div className="grid gap-5 lg:grid-cols-[0.55fr_1fr]">
              <aside className="surface h-fit p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Included sections</p>
                <div className="mt-5 grid gap-3">
                  {sections.map((section) => (
                    <div key={section} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-300">{section}</div>
                  ))}
                </div>
              </aside>

              <div>
                <span className="eyebrow">Kit map</span>
                <h2 className="section-title">Use the same engine for each VolynxOS product line.</h2>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {productKits.map((kit) => (
                    <a
                      key={kit.name}
                      href={kit.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="surface block p-5 transition hover:-translate-y-0.5"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{kit.label}</p>
                      <h3 className="mt-4 text-xl font-medium text-white">{kit.name}</h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-500">{kit.description}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
