import type { Metadata } from "next"
import { ArrowRight, FileArchive, Home, Image, ShieldCheck } from "lucide-react"
import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"

export const metadata: Metadata = {
  title: "Purchases - VOLYNX",
  description: "Return to VOLYNX delivery pages, downloads and product documentation."
}

const purchaseAreas = [
  {
    title: "Icons Store",
    label: "Asset delivery",
    href: "/dashboard/purchases/icons",
    icon: Image,
    copy: "Verify checkout sessions, download icon packs and recover free or premium ZIPs.",
    checks: ["Pack delivery", "Session verification", "Support path"]
  },
  {
    title: "PropertyFlow",
    label: "Product kit delivery",
    href: "/dashboard/purchases/propertyflow",
    icon: Home,
    copy: "Return to tiered downloads, setup docs and gated delivery for Starter, Professional and White-Label.",
    checks: ["Tier downloads", "Docs", "License support"]
  }
]

export default function PurchasesPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen border-t border-white/5">
        <section className="container-shell py-10 md:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <BrandLockup size="sm" caption="VX signature" className="mb-5" />
              <span className="eyebrow">Purchase Hub</span>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl">
                Downloads, docs and support in one return path.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
                Use the product-specific delivery pages below after Stripe redirects you back, or when support asks for a verified session.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200/20 bg-emerald-300/[0.045] p-5 shadow-glow backdrop-blur">
              <ShieldCheck className="h-6 w-6 text-emerald-100" />
              <h2 className="mt-4 text-xl font-semibold text-white">Protected delivery stays server-side.</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Downloads verify paid Stripe sessions before returning ZIP files. Preview mode remains separate from production unlock.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {purchaseAreas.map((area) => {
              const Icon = area.icon

              return (
                <a
                  key={area.title}
                  href={area.href}
                  className="group rounded-lg border border-white/10 bg-white/[0.035] p-6 shadow-glow backdrop-blur transition hover:border-white/20 hover:bg-white/[0.055]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{area.label}</p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{area.title}</h2>
                    </div>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-black">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-zinc-400">{area.copy}</p>
                  <div className="mt-5 grid gap-2">
                    {area.checks.map((check) => (
                      <div key={check} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-300">
                        <FileArchive className="h-4 w-4 text-zinc-500" />
                        {check}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 inline-flex items-center text-sm font-medium text-white">
                    Open delivery <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
