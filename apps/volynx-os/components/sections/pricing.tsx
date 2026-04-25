import { Button } from "@/components/common/button"
import { SectionHeading } from "@/components/common/section-heading"
import { kitOffers, launchGuarantee, proUpsell, type KitSlug, type KitTier } from "@/content/kit-offers"
import { pricingTiers } from "@/content/site"
import { cn } from "@/lib/utils"

type PricingVariant = "single" | "tiered" | "comparison"

type Tier = {
  name: string
  price: string
  description: string
  features: string[]
  highlight?: boolean
  href?: string
}

type PricingLabels = {
  badge?: string
  choose?: string
  get?: string
  bestValue?: string
  comparisonFeature?: string
  upsellBadge?: string
  comparePro?: string
  upsellTitle?: string
  upsellBody?: string
  annualLabel?: string
}

type PricingProps = {
  variant?: PricingVariant
  kit?: KitSlug
  titleOverride?: string
  copyOverride?: string
  platformTiersOverride?: Tier[]
  labels?: PricingLabels
}

const platformTiers: Tier[] = pricingTiers

function toTier(tier: KitTier, href: string): Tier {
  return {
    name: tier.name,
    price: tier.price,
    description: tier.description,
    features: [
      `${tier.sectionCount} sections${tier.pageCount ? ` + ${tier.pageCount}` : ""}`,
      tier.bestFor,
      ...tier.sections,
      ...(tier.additions ?? [])
    ],
    highlight: tier.highlight,
    href
  }
}

function SingleCard({ tiers, getLabel }: { tiers: Tier[]; getLabel: string }) {
  const pro = tiers.find((tier) => tier.highlight) ?? tiers[1] ?? tiers[0]
  return (
    <div className="mx-auto max-w-xl surface p-8 text-center">
      <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">{pro.name}</p>
      <div className="mt-4 text-6xl font-semibold tracking-[-0.06em]">{pro.price}</div>
      <p className="mx-auto mt-4 max-w-md text-zinc-400">{pro.description}</p>
      <div className="mt-8 grid gap-3 text-left">
        {pro.features.map((feature) => (
          <div key={feature} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-300">{feature}</div>
        ))}
      </div>
      <Button href={pro.href ?? "#pricing"} className="mt-8 w-full" ariaLabel={`${getLabel} ${pro.name}`}>
        {getLabel} {pro.name}
      </Button>
    </div>
  )
}

function TieredCards({
  tiers,
  chooseLabel,
  bestValueLabel
}: {
  tiers: Tier[]
  chooseLabel: string
  bestValueLabel: string
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {tiers.map((tier) => (
        <article key={tier.name} className={cn("surface p-7", tier.highlight && "border-white/20 bg-white/[0.05]")}>
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">{tier.name}</p>
            {tier.highlight ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] text-emerald-200">{bestValueLabel}</span> : null}
          </div>
          <div className="mt-5 text-5xl font-semibold tracking-[-0.06em]">{tier.price}</div>
          <p className="mt-4 text-sm leading-7 text-zinc-400">{tier.description}</p>
          <div className="mt-6 grid gap-3">
            {tier.features.map((feature) => (
              <div key={feature} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">{feature}</div>
            ))}
          </div>
          <Button
            href={tier.href ?? "#pricing"}
            variant={tier.highlight ? "primary" : "secondary"}
            className="mt-7 w-full"
            ariaLabel={`${chooseLabel} ${tier.name}`}
          >
            {chooseLabel} {tier.name}
          </Button>
        </article>
      ))}
    </div>
  )
}

function ComparisonTable({
  kit,
  tiers,
  comparisonFeatureLabel
}: {
  kit?: KitSlug
  tiers: Tier[]
  comparisonFeatureLabel: string
}) {
  const offer = kit ? kitOffers[kit] : null
  const kitRows = offer
    ? [
        ["Price", ...offer.tiers.map((tier) => tier.price)],
        ["Core count", ...offer.tiers.map((tier) => `${tier.sectionCount} sections${tier.pageCount ? " + pages" : ""}`)],
        ["Hero depth", ...offer.tiers.map((tier) => tier.sections.filter((item) => item.toLowerCase().includes("hero")).join(", ") || "Included")],
        ["Pricing depth", ...offer.tiers.map((tier) => tier.sections.filter((item) => item.toLowerCase().includes("pricing")).join(", ") || "Not included")],
        ["Expansion", ...offer.tiers.map((tier) => (tier.additions ?? ["Core page"]).join(", "))]
      ]
    : [
        ["Demo pages", "1", "3", "3 + future"],
        ["Hero variants", "3", "4", "4"],
        ["Pricing variants", "1", "3", "3"],
        ["Commercial usage", "Yes", "Yes", "Extended"],
        ["Future updates", "No", "Yes", "Yes"]
      ]

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="grid grid-cols-4 border-b border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-zinc-400">
        <div>{comparisonFeatureLabel}</div>
        {tiers.slice(0, 3).map((tier) => (
          <div key={tier.name}>{tier.name}</div>
        ))}
      </div>
      {kitRows.map((row) => (
        <div key={row[0]} className="grid grid-cols-4 border-b border-white/5 px-6 py-4 text-sm">
          {row.map((cell, i) => (
            <div key={cell + i} className={i === 0 ? "text-zinc-500" : "text-zinc-300"}>{cell}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ProUpsell({
  kit,
  upsellBadge,
  compareProLabel,
  upsellTitle,
  upsellBody,
  annualLabel
}: {
  kit?: KitSlug
  upsellBadge: string
  compareProLabel: string
  upsellTitle?: string
  upsellBody?: string
  annualLabel: string
}) {
  return (
    <div className="mt-8 grid gap-4 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">{upsellBadge}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          {upsellTitle ?? `${proUpsell.name} at ${proUpsell.price}`}
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {kit ? proUpsell.checkoutLine : upsellBody ?? proUpsell.promise} {annualLabel}: {proUpsell.annual}.
        </p>
      </div>
      <Button href="https://volynx.world/pricing/" ariaLabel="Compare Volynx Pro">
        {compareProLabel}
      </Button>
    </div>
  )
}

export function Pricing({
  variant = "tiered",
  kit,
  titleOverride,
  copyOverride,
  platformTiersOverride,
  labels
}: PricingProps) {
  const resolvedLabels = {
    badge: "Pricing",
    choose: "Choose",
    get: "Get",
    bestValue: "Best value",
    comparisonFeature: "Feature",
    upsellBadge: "Upsell central",
    comparePro: "Compare Pro",
    annualLabel: "Annual option",
    ...labels
  }
  const offer = kit ? kitOffers[kit] : null
  const tiers = offer ? offer.tiers.map((tier) => toTier(tier, offer.href)) : platformTiersOverride ?? platformTiers
  const title = titleOverride ?? (offer
    ? `${offer.productName} pricing is packaged for the buyer's real moment.`
    : "Price VolynxOS like launch infrastructure, not disposable templates.")
  const copy = copyOverride ?? (offer
    ? `${offer.starterLabel} gets the first launch live, the middle tier becomes the obvious upgrade, and ${proUpsell.name} turns one-time intent into recurring value.`
    : "Every tier points toward commercial use: premium perception, reusable architecture and product packaging that can start selling today.")

  return (
    <section id="pricing" className="section-space">
      <div className="container-shell">
        <SectionHeading
          badge={resolvedLabels.badge}
          title={title}
          copy={copy}
          align="center"
        />
        {variant === "single" ? <SingleCard tiers={tiers} getLabel={resolvedLabels.get} /> : null}
        {variant === "tiered" ? <TieredCards tiers={tiers} chooseLabel={resolvedLabels.choose} bestValueLabel={resolvedLabels.bestValue} /> : null}
        {variant === "comparison" ? <ComparisonTable kit={kit} tiers={tiers} comparisonFeatureLabel={resolvedLabels.comparisonFeature} /> : null}
        <ProUpsell
          kit={kit}
          upsellBadge={resolvedLabels.upsellBadge}
          compareProLabel={resolvedLabels.comparePro}
          upsellTitle={resolvedLabels.upsellTitle}
          upsellBody={resolvedLabels.upsellBody}
          annualLabel={resolvedLabels.annualLabel}
        />
        {kit ? (
          <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-6 text-zinc-500">
            {launchGuarantee.title}: {launchGuarantee.copy}
          </p>
        ) : null}
      </div>
    </section>
  )
}
