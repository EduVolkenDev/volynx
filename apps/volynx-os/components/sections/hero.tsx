import { BrandLockup } from "@/components/common/brand-lockup"
import { Button } from "@/components/common/button"
import { cn } from "@/lib/utils"

type HeroVariant = "centered" | "split" | "minimal" | "product"

type HeroProps = {
  variant?: HeroVariant
  eyebrow?: string
  brandCaption?: string
  title: string
  subtitle: string
  primaryCta?: string
  secondaryCta?: string
  primaryHref?: string
  secondaryHref?: string
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-2xl font-semibold tracking-[-0.05em] text-white">{value}</div>
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</div>
    </div>
  )
}

export function Hero({
  variant = "centered",
  eyebrow,
  brandCaption = "VX signature",
  title,
  subtitle,
  primaryCta = "Get VolynxOS",
  secondaryCta = "Live preview",
  primaryHref = "#pricing",
  secondaryHref = "/demo/saas"
}: HeroProps) {
  if (variant === "split") {
    return (
      <section className="section-space relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-hero-glow opacity-90" />
        <div className="container-shell grid items-end gap-16 md:grid-cols-[1.15fr_.85fr]">
          <div>
            <BrandLockup size="md" caption={brandCaption} className="mb-6" />
            <span className="eyebrow">{eyebrow ?? "Premium infrastructure for landing pages"}</span>
            <h1 className="text-hero-sm font-semibold tracking-[-0.06em] text-white md:text-hero-md lg:text-hero-lg">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">{subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={primaryHref}>{primaryCta}</Button>
              <Button href={secondaryHref} variant="secondary">{secondaryCta}</Button>
            </div>
          </div>

          <div className="surface relative overflow-hidden p-6">
            <div className="grid-fade absolute inset-0 opacity-50" />
            <div className="relative rounded-[22px] border border-white/10 bg-black/50 p-5">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Launch score</p>
                  <p className="text-4xl font-semibold tracking-[-0.06em]">92</p>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
                  Ready to ship
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric value="24+" label="Sections" />
                <Metric value="3" label="Demo pages" />
                <Metric value="60+" label="Variants" />
                <Metric value="1 day" label="Launch time" />
              </div>
              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-zinc-400">
                  VolynxOS is engineered for clean conversion, coherent tokens and premium perception.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (variant === "minimal") {
    return (
      <section className="section-space">
        <div className="container-shell max-w-5xl">
          <BrandLockup size="md" caption={brandCaption} className="mb-6" />
          <span className="eyebrow">{eyebrow ?? "Minimal / technical / premium"}</span>
          <h1 className="mt-3 max-w-4xl text-hero-sm font-semibold tracking-[-0.06em] text-white md:text-hero-md">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={primaryHref}>{primaryCta}</Button>
            <Button href={secondaryHref} variant="secondary">{secondaryCta}</Button>
          </div>
        </div>
      </section>
    )
  }

  if (variant == "product") {
    return (
      <section className="section-space relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-hero-glow opacity-70" />
        <div className="container-shell text-center">
          <BrandLockup size="md" caption={brandCaption} className="mx-auto mb-6" />
          <span className="eyebrow">{eyebrow ?? "VolynxOS, not one-offs"}</span>
          <h1 className="mx-auto max-w-5xl text-hero-sm font-semibold tracking-[-0.06em] text-white md:text-hero-md lg:text-hero-lg">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">{subtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href={primaryHref}>{primaryCta}</Button>
            <Button href={secondaryHref} variant="secondary">{secondaryCta}</Button>
          </div>

          <div className="surface mask-bottom mt-14 grid gap-5 p-5 text-left md:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-[24px] border border-white/10 bg-black/50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Launch stack</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Four monetizable kit lines</p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">Next.js + Tailwind</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {["Portfolio Pro Kit", "Agency Launch Kit", "SaaS Landing System", "PropertyFlow"].map((item) => (
                  <div key={item} className="rounded-[18px] border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <Metric value="v3" label="Launch-ready" />
              <Metric value="4" label="Core kits" />
              <Metric value="A+" label="Premium feel" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section-space relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-glow opacity-70" />
      <div className="container-shell text-center">
        <BrandLockup size="md" caption={brandCaption} className="mx-auto mb-6" />
        <span className="eyebrow">{eyebrow ?? "Global product positioning"}</span>
        <h1 className="mx-auto max-w-5xl text-hero-sm font-semibold tracking-[-0.06em] text-white md:text-hero-md lg:text-hero-lg">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">{subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={primaryHref}>{primaryCta}</Button>
          <Button href={secondaryHref} variant="secondary">{secondaryCta}</Button>
        </div>
      </div>
    </section>
  )
}
