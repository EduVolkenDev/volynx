import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { productKits as defaultProductKits } from "@/content/site"
import { volynxCardIcons } from "@/content/volynx-card-icons"
import { SectionHeading } from "@/components/common/section-heading"

type ProductKitItem = {
  name: string
  label: string
  href: string
  description: string
  points: string[]
}

type ProductKitsProps = {
  badge?: string
  title?: string
  copy?: string
  items?: ProductKitItem[]
  openLabel?: string
}

export function ProductKits({
  badge = "Kits",
  title = "Four product lines ready to sell from the same operating system.",
  copy = "VolynxOS turns portfolio, agency, SaaS and property products into a coherent commercial platform with clear use cases and direct buying paths.",
  items = defaultProductKits,
  openLabel = "Open kit"
}: ProductKitsProps) {
  return (
    <section id="kits" className="section-space">
      <div className="container-shell">
        <SectionHeading badge={badge} title={title} copy={copy} />
        <div className="grid gap-5 lg:grid-cols-4">
          {items.map((kit, index) => {
            const icon = volynxCardIcons.kits[index % volynxCardIcons.kits.length]
            const external = kit.href.startsWith("http")

            return (
              <article key={kit.name} className="surface relative flex min-h-[420px] flex-col overflow-hidden p-6">
                <div className="mb-6 flex h-28 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                  <Image src={icon} alt="" width={160} height={160} className="h-24 w-24 object-contain" />
                </div>
                <p className="relative z-10 text-xs uppercase tracking-[0.22em] text-zinc-500">{kit.label}</p>
                <h3 className="relative z-10 mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">{kit.name}</h3>
                <p className="relative z-10 mt-4 text-sm leading-7 text-zinc-400">{kit.description}</p>
                <div className="mt-6 grid gap-3">
                  {kit.points.map((point) => (
                    <div key={point} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
                      {point}
                    </div>
                  ))}
                </div>
                <Link
                  href={kit.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  aria-label={`Open ${kit.name}`}
                  className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium text-white"
                >
                  {openLabel} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
