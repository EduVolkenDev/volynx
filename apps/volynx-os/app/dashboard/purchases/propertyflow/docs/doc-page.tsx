import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { MarkdownDocument } from "@/components/common/markdown-document"
import {
  getPropertyFlowTier,
  isPropertyFlowDocTierAllowed,
  propertyFlowDocs,
  type PropertyFlowTierId
} from "@/content/propertyflow"
import { isPropertyFlowTierId, previewDownloadsEnabled, verifyPropertyFlowSession } from "@/lib/propertyflow-commerce"
import { getPropertyFlowPublicUrl } from "@/lib/volynx-public"

type PropertyFlowDocViewProps = {
  slug: string
  searchParams?: Record<string, string | string[] | undefined>
}

type PropertyFlowDocAccess = {
  deliveryHref: string
  docQuery: string
  tierId: PropertyFlowTierId
}

function getDoc(slug: string) {
  const doc = propertyFlowDocs.find((item) => item.slug === slug)

  if (!doc) {
    throw new Error(`Unknown PropertyFlow doc: ${slug}`)
  }

  return doc
}

function readDoc(file: string) {
  return readFileSync(path.join(process.cwd(), "content", "propertyflow-docs", file), "utf8")
}

export function metadataForPropertyFlowDoc(slug: string): Metadata {
  const doc = getDoc(slug)

  return {
    title: `${doc.title} - PropertyFlow docs`,
    description: `${doc.title} documentation for PropertyFlow ${doc.tier}.`
  }
}

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString()

  return query ? `?${query}` : ""
}

function buildDeliveryHref(tierId: PropertyFlowTierId, searchParams: Record<string, string>) {
  return `/dashboard/purchases/propertyflow${buildQuery({
    ...searchParams,
    tier: tierId
  })}`
}

function redirectToProduct(): never {
  redirect(getPropertyFlowPublicUrl({ docs: "locked" }))
}

async function resolveDocAccess(slug: string, searchParams: Record<string, string | string[] | undefined> = {}): Promise<PropertyFlowDocAccess> {
  const doc = getDoc(slug)
  const preview = firstSearchValue(searchParams.preview) === "1"
  const sessionId = firstSearchValue(searchParams.session_id)
  const tierParam = firstSearchValue(searchParams.tier)

  if (preview) {
    if (!previewDownloadsEnabled() || !isPropertyFlowTierId(tierParam)) {
      redirectToProduct()
    }

    if (!isPropertyFlowDocTierAllowed(tierParam, doc.tier)) {
      redirect(buildDeliveryHref(tierParam, { preview: "1" }))
    }

    return {
      tierId: tierParam,
      docQuery: buildQuery({ preview: "1", tier: tierParam }),
      deliveryHref: buildDeliveryHref(tierParam, { preview: "1" })
    }
  }

  if (!sessionId) {
    redirectToProduct()
  }

  try {
    const purchase = await verifyPropertyFlowSession(sessionId)
    const baseSearchParams = {
      session_id: purchase.sessionId,
      tier: purchase.tierId
    }

    if (!isPropertyFlowDocTierAllowed(purchase.tierId, doc.tier)) {
      redirect(buildDeliveryHref(purchase.tierId, baseSearchParams))
    }

    return {
      tierId: purchase.tierId,
      docQuery: buildQuery(baseSearchParams),
      deliveryHref: buildDeliveryHref(purchase.tierId, baseSearchParams)
    }
  } catch {
    redirectToProduct()
  }

  redirectToProduct()
}

export async function PropertyFlowDocView({ slug, searchParams }: PropertyFlowDocViewProps) {
  const doc = getDoc(slug)
  const source = readDoc(doc.file)
  const access = await resolveDocAccess(slug, searchParams)
  const tier = getPropertyFlowTier(access.tierId)
  const visibleDocs = propertyFlowDocs.filter((item) => isPropertyFlowDocTierAllowed(tier.id, item.tier))

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-white/5 py-12 md:py-16">
          <div className="container-shell">
            <nav className="mb-8 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <a href={getPropertyFlowPublicUrl()} className="transition hover:text-white">PropertyFlow</a>
              <span>/</span>
              <a href={access.deliveryHref} className="transition hover:text-white">Delivery</a>
              <span>/</span>
              <span className="text-zinc-300">{doc.title}</span>
            </nav>
            <BrandLockup size="sm" caption="VX signature" className="mb-5" />
            <span className="eyebrow">{doc.tier}</span>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
              {doc.title}
            </h1>
          </div>
        </section>

        <section className="section-space">
          <div className="container-shell grid gap-8 lg:grid-cols-[0.28fr_0.72fr]">
            <aside className="surface h-fit p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">PropertyFlow docs</p>
              <div className="mt-5 grid gap-2">
                {visibleDocs.map((item) => (
                  <a
                    key={item.slug}
                    href={`/dashboard/purchases/propertyflow/docs/${item.slug}${access.docQuery}`}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      item.slug === doc.slug
                        ? "border-white/20 bg-white/[0.06] text-white"
                        : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
              <a href={access.deliveryHref} className="button-secondary mt-6 w-full">
                Return to delivery
              </a>
            </aside>
            <article className="surface p-6 md:p-8">
              <MarkdownDocument source={source} />
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
