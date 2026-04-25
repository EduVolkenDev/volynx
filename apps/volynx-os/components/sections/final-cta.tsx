import { Button } from "@/components/common/button"
import { storeUrl } from "@/content/site"

type FinalCTAProps = {
  eyebrow?: string
  title?: string
  subtitle?: string
  primaryCta?: string
  primaryHref?: string
  secondaryCta?: string
  secondaryHref?: string
}

export function FinalCTA({
  eyebrow = "Get started",
  title = "Stop building random pages. Start shipping VolynxOS.",
  subtitle = "The fastest way to feel premium is restraint, clarity and execution. VolynxOS gives you the structure to do that repeatedly.",
  primaryCta = "Open product store",
  primaryHref = storeUrl,
  secondaryCta = "Read docs",
  secondaryHref = "/docs",
}: FinalCTAProps) {
  return (
    <section className="section-space">
      <div className="container-shell">
        <div className="surface overflow-hidden p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-end">
            <div>
              <span className="eyebrow">{eyebrow}</span>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                {title}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                {subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button href={primaryHref}>{primaryCta}</Button>
              <Button href={secondaryHref} variant="secondary">{secondaryCta}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
