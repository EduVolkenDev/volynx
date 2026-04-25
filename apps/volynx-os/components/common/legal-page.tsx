import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { legalUpdated, type LegalPageContent } from "@/content/legal-pages"

type LegalPageProps = {
  page: LegalPageContent
}

export function LegalPage({ page }: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-space border-b border-white/5">
          <div className="container-shell max-w-4xl">
            <BrandLockup size="sm" caption="VX signature" className="mb-5" />
            <span className="eyebrow">Legal</span>
            <h1 className="section-title">{page.title}</h1>
            <p className="section-copy mt-5">{page.description}</p>
            <p className="mt-6 text-sm text-zinc-500">Last updated: {legalUpdated}</p>
          </div>
        </section>
        <section className="section-space">
          <div className="container-shell max-w-4xl">
            <div className="grid gap-5">
              {page.sections.map((section) => (
                <article key={section.title} className="surface p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{section.title}</h2>
                  <div className="mt-4 grid gap-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-zinc-400">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
