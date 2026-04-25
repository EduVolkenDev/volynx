import type { Metadata } from "next"
import { ArrowRight, Download, FileText, LifeBuoy, Mail, ReceiptText, ShieldCheck } from "lucide-react"
import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { legalPages, supportEmail } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "Support - VolynxOS",
  description: legalPages.support.description
}

const supportRoutes = [
  {
    title: "Find a purchase",
    label: "Delivery hub",
    href: "/dashboard/purchases",
    copy: "Return to Icons Store or PropertyFlow delivery pages after Stripe redirects.",
    icon: Download
  },
  {
    title: "Check product access",
    label: "Platform hub",
    href: "/dashboard",
    copy: "Jump back into Daily, product pages, delivery areas and launch surfaces.",
    icon: ReceiptText
  },
  {
    title: "Read policies",
    label: "Refunds and license",
    href: "/refund",
    copy: "Review the 7-day preview-match guarantee and delivery issue process.",
    icon: ShieldCheck
  }
]

export default function SupportPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-white/5 py-12 md:py-16">
          <div className="container-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <BrandLockup size="sm" caption="VX signature" className="mb-5" />
              <span className="eyebrow">Support</span>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl">
                Fast recovery for downloads, access and launch issues.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
                Start with the delivery hub if you just checked out. Email support with the purchase email, product name,
                tier or pack, and any Stripe session ID you have.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/dashboard/purchases" className="button-primary">
                  Open purchases <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a href={`mailto:${supportEmail}?subject=VOLYNX%20support`} className="button-secondary">
                  Email support <Mail className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
            <aside className="surface p-5">
              <LifeBuoy className="h-6 w-6 text-white" />
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">What to include</h2>
              <div className="mt-5 grid gap-3">
                {["Order email", "Product or tier", "ZIP filename", "Short issue summary"].map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="container-shell py-10 md:py-14">
          <div className="grid gap-5 lg:grid-cols-3">
            {supportRoutes.map((route) => {
              const Icon = route.icon

              return (
                <a
                  key={route.title}
                  href={route.href}
                  className="surface group block min-h-[260px] p-6 transition hover:border-white/20 hover:bg-white/[0.055]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{route.label}</p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{route.title}</h2>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-black">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-zinc-400">{route.copy}</p>
                  <div className="mt-6 inline-flex items-center text-sm font-medium text-white">
                    Open <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </a>
              )
            })}
          </div>
        </section>

        <section className="container-shell pb-16">
          <div className="grid gap-5 lg:grid-cols-2">
            {legalPages.support.sections.map((section, index) => (
              <article key={section.title} className="surface p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300">
                    {index === 0 ? <FileText className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{section.title}</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-zinc-400">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
