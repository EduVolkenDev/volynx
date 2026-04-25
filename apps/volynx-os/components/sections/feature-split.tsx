import { Check } from "lucide-react"
import { SectionHeading } from "@/components/common/section-heading"

const defaultPoints = [
  "Hero, social proof, pricing, FAQ, CTA and footer variants",
  "Design tokens for type, spacing, surfaces and containers",
  "Three launch-ready demo pages for SaaS, agency and portfolio",
  "Documentation and copywriting foundations included"
]

type FeatureSplitStat = {
  label: string
  value: string
  copy: string
}

type FeatureSplitProps = {
  badge?: string
  title?: string
  copy?: string
  points?: string[]
  stats?: FeatureSplitStat[]
}

const defaultStats: FeatureSplitStat[] = [
  {
    label: "Layouts",
    value: "12 core",
    copy: "Opinionated enough to feel premium, flexible enough to fit multiple categories."
  },
  {
    label: "Components",
    value: "24+",
    copy: "Drop-in sections with coherent visual hierarchy and copy structure."
  },
  {
    label: "Positioning",
    value: "Premium by restraint",
    copy: "Large type, precise spacing, controlled contrast and fewer competing elements create trust faster than ornamental complexity."
  }
]

export function FeatureSplit({
  badge = "Feature split",
  title = "Built as launch infrastructure you can actually scale.",
  copy = "The goal is not to impress with noise. The goal is to help each VolynxOS product line feel premium and launch faster.",
  points = defaultPoints,
  stats = defaultStats
}: FeatureSplitProps) {
  return (
    <section id="sections" className="section-space">
      <div className="container-shell grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading badge={badge} title={title} copy={copy} />
          <div className="grid gap-4">
            {points.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mt-1 rounded-full border border-white/10 p-1">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-sm leading-7 text-zinc-400">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface overflow-hidden p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`rounded-[24px] border border-white/10 bg-black/55 p-5 ${
                  index === stats.length - 1 && stats.length % 2 === 1 ? "md:col-span-2" : ""
                }`}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{stat.label}</p>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{stat.value}</h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-zinc-400">{stat.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
