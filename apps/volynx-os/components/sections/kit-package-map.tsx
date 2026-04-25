import { Button } from "@/components/common/button"
import { kitOffers, launchGuarantee, proUpsell, type KitSlug } from "@/content/kit-offers"

type KitPackageMapProps = {
  kit: KitSlug
}

export function KitPackageMap({ kit }: KitPackageMapProps) {
  const offer = kitOffers[kit]

  return (
    <section className="section-space">
      <div className="container-shell">
        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="surface p-6">
            <span className="eyebrow">Who this is for</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              {offer.buyerFrame}
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">{offer.whoFor}</p>
            <div className="mt-6 rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{launchGuarantee.title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{launchGuarantee.copy}</p>
            </div>
            <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">{proUpsell.name}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {proUpsell.price} or {proUpsell.annual}: {proUpsell.promise}
              </p>
            </div>
          </aside>

          <div className="grid gap-4">
            {offer.tiers.map((tier) => (
              <article
                key={tier.id}
                className={`surface grid gap-5 p-5 md:grid-cols-[0.42fr_1fr_auto] md:items-center ${tier.highlight ? "border-white/20 bg-white/[0.05]" : ""}`}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{tier.name}</p>
                  <div className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white">{tier.price}</div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {tier.sectionCount} sections{tier.pageCount ? ` + ${tier.pageCount}` : ""}
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">{tier.description}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{tier.bestFor}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...tier.sections, ...(tier.additions ?? [])].map((item) => (
                      <span key={item} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <Button href={offer.href} variant={tier.highlight ? "primary" : "secondary"} ariaLabel={`${tier.ctaLabel} for ${offer.productName}`}>
                  {tier.ctaLabel}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
