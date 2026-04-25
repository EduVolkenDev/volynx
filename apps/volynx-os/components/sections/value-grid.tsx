import Image from "next/image"
import { featureCards } from "@/content/site"
import { volynxCardIcons } from "@/content/volynx-card-icons"
import { SectionHeading } from "@/components/common/section-heading"

type ValueGridProps = {
  badge?: string
  title?: string
  copy?: string
  cards?: { title: string; description: string }[]
}

export function ValueGrid({
  badge = "System",
  title = "Designed around clarity, speed and structured shipping.",
  copy = "The best premium landing pages do not feel crowded. They feel inevitable.",
  cards
}: ValueGridProps) {
  const items = cards ?? featureCards
  return (
    <section id="system" className="section-space">
      <div className="container-shell">
        <SectionHeading badge={badge} title={title} copy={copy} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.map((card, index) => {
            const icon = volynxCardIcons.values[index % volynxCardIcons.values.length]

            return (
              <article key={card.title} className="surface p-6">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                  <Image src={icon} alt="" width={120} height={120} className="h-16 w-16 object-contain" />
                </div>
                <h3 className="text-xl font-medium tracking-[-0.03em] text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{card.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
