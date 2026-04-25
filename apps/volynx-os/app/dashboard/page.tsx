import type { Metadata } from "next"
import { ArrowRight, Box, Download, Sparkles } from "lucide-react"
import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { platformProducts, storeUrl } from "@/content/site"

export const metadata: Metadata = {
  title: "VOLYNX Dashboard",
  description: "Start tools, browse products and return to delivery areas across the VOLYNX platform."
}

const dashboardStats = [
  { label: "Use", value: "Daily" },
  { label: "Browse", value: "Assets" },
  { label: "Build", value: "Kits" },
  { label: "Return", value: "Delivery" }
]

export default function DashboardPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen border-t border-white/5">
        <section className="container-shell py-10 md:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <BrandLockup size="sm" caption="VX signature" className="mb-5" />
              <span className="eyebrow">Platform Hub</span>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl">
                One place to use, buy and return to VOLYNX.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
                Daily handles execution, Icons powers assets, PropertyFlow ships as a product kit, and Purchases brings delivery back into one path.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Launch Flow</p>
                  <p className="mt-2 text-lg font-semibold text-white">Products → Execution → Delivery</p>
                </div>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {dashboardStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-sm font-semibold text-white">{stat.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {platformProducts.map((product) => (
              <a
                key={product.name}
                href={product.href}
                className="group rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-glow backdrop-blur transition hover:border-white/20 hover:bg-white/[0.055]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{product.label}</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{product.name}</h2>
                  </div>
                  <span className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-xs text-zinc-400">
                    {product.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">{product.description}</p>
                <div className="mt-5 grid gap-2">
                  {product.actions.map((action) => (
                    <span key={action} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-300">
                      {action}
                    </span>
                  ))}
                </div>
                <div className="mt-5 inline-flex items-center text-sm font-medium text-white">
                  Open <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <a href={storeUrl} className="rounded-lg border border-white/10 bg-white text-black p-5 transition hover:opacity-90">
              <Box className="h-5 w-5" />
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Open Products</h2>
              <p className="mt-2 text-sm leading-6 text-black/65">Browse the full VOLYNX product catalog.</p>
            </a>
            <a href="/dashboard/purchases" className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-glow backdrop-blur transition hover:border-white/20">
              <Download className="h-5 w-5 text-white" />
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">Return To Purchases</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Find delivery pages, docs and support paths.</p>
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
