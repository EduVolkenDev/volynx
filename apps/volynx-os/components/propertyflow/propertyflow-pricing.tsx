"use client"

import { useEffect, useMemo, useState } from "react"
import {
  propertyFlowComparisonRows,
  propertyFlowCurrencies,
  propertyFlowTiers,
  type PropertyFlowCurrencyCode
} from "@/content/propertyflow"
import { cn } from "@/lib/utils"

const defaultCurrency: PropertyFlowCurrencyCode = "USD"

function detectCurrency(): PropertyFlowCurrencyCode {
  if (typeof navigator === "undefined") {
    return defaultCurrency
  }

  const language = navigator.language.toLowerCase()

  if (language === "pt-br") {
    return "BRL"
  }

  if (language === "en-gb" || language.includes("-gb")) {
    return "GBP"
  }

  if (language.startsWith("de") || language.startsWith("fr") || language.startsWith("es") || language.startsWith("it")) {
    return "EUR"
  }

  return "USD"
}

export function PropertyFlowPricing() {
  const [currency, setCurrency] = useState<PropertyFlowCurrencyCode>(defaultCurrency)
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const selectedCurrency = useMemo(
    () => propertyFlowCurrencies.find((item) => item.code === currency) ?? propertyFlowCurrencies[0],
    [currency]
  )

  useEffect(() => {
    setCurrency(detectCurrency())
  }, [])

  async function startCheckout(tier: string) {
    setCheckoutTier(tier)
    setCheckoutError(null)

    try {
      const response = await fetch("/api/checkout/propertyflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, currency })
      })
      const data = await response.json() as { url?: string; sessionId?: string; error?: string }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Checkout could not be started.")
      }

      if (data.sessionId) {
        try {
          window.localStorage.setItem(
            "propertyflow-pending-checkout",
            JSON.stringify({ sessionId: data.sessionId, tier, createdAt: new Date().toISOString() })
          )
        } catch {
          // Checkout still works if the browser blocks local storage.
        }
      }

      window.location.assign(data.url)
    } catch (error) {
      setCheckoutTier(null)
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not be started.")
    }
  }

  return (
    <section id="pricing" className="section-space border-y border-white/5">
      <div className="container-shell">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="eyebrow">Pricing</span>
            <h2 className="section-title">Three tiers, zero manual service dependency.</h2>
            <p className="section-copy mt-5">
              Starter launches the static catalogue, Professional adds the operating layer, and White-Label turns
              PropertyFlow into a resale-ready system for agencies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/30 p-1">
            {propertyFlowCurrencies.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setCurrency(item.code)}
                className={cn(
                  "rounded-md px-3 py-2 text-xs font-medium text-zinc-400 transition",
                  currency === item.code && "bg-white text-black"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {propertyFlowTiers.map((tier) => (
            <article
              key={tier.id}
              className={cn(
                "surface flex min-h-[650px] flex-col p-6",
                tier.highlight && "border-emerald-300/25 bg-emerald-300/[0.04]"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{tier.eyebrow}</p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">{tier.name}</h3>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-300">
                  {tier.badge}
                </span>
              </div>

              <div className="mt-6">
                <div className="text-5xl font-semibold tracking-[-0.06em] text-white">
                  {selectedCurrency.prices[tier.id]}
                </div>
                <p className="mt-2 text-sm text-zinc-500">{tier.note}</p>
              </div>

              <p className="mt-5 text-sm leading-7 text-zinc-400">{tier.description}</p>

              <div className="mt-6 grid gap-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-7">
                <button
                  type="button"
                  onClick={() => startCheckout(tier.id)}
                  disabled={checkoutTier !== null}
                  className={cn(tier.highlight ? "button-primary" : "button-secondary", "w-full")}
                  aria-label={tier.ctaLabel}
                >
                  {checkoutTier === tier.id ? "Opening Stripe..." : tier.ctaLabel}
                </button>
                {checkoutError ? (
                  <p className="mt-3 text-xs leading-5 text-amber-200/80">{checkoutError}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-lg border border-white/10">
          <div className="grid min-w-[820px] grid-cols-[1.2fr_repeat(3,0.8fr)] border-b border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-zinc-400">
            <div>Feature</div>
            <div>Starter</div>
            <div>Professional</div>
            <div>White-Label</div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              {propertyFlowComparisonRows.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1.2fr_repeat(3,0.8fr)] border-b border-white/5 px-5 py-4 text-sm last:border-b-0"
                >
                  <div className="text-zinc-500">{row.feature}</div>
                  <div className="text-zinc-300">{row.starter}</div>
                  <div className="text-zinc-300">{row.professional}</div>
                  <div className="text-zinc-300">{row.whiteLabel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
