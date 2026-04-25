"use client"

import Image from "next/image"
import { type CSSProperties, useEffect, useMemo, useState } from "react"
import { BrandLockup } from "@/components/common/brand-lockup"
import { Button } from "@/components/common/button"
import { iconPacks, iconPackStats, type IconPack } from "@/content/icon-packs"
import { type StoreIcon, iconStoreCategories, iconStoreIcons } from "@/content/icons-store"
import { storeUrl } from "@/content/site"
import { cn } from "@/lib/utils"

type PackPalette = {
  accent: string
  glow: string
  surfaceStart: string
  surfaceEnd: string
}

type PackPresentation = PackPalette & {
  signature: string
  story: string
  featured?: boolean
}

const PACK_FILTER_ALL = "All packs"
const PACK_FILTER_PREMIUM = "Premium"
const PACK_FILTER_FREE = "Free"

const PACK_PALETTES: Record<string, PackPalette> = {
  chrome: { accent: "187,220,255", glow: "116,143,255", surfaceStart: "7,12,22", surfaceEnd: "25,31,47" },
  polygon: { accent: "255,184,108", glow: "91,179,255", surfaceStart: "21,12,18", surfaceEnd: "28,30,56" },
  master: { accent: "126,242,255", glow: "173,127,255", surfaceStart: "4,9,18", surfaceEnd: "19,12,35" },
  neon: { accent: "93,255,210", glow: "64,166,255", surfaceStart: "5,18,19", surfaceEnd: "9,20,43" },
  purple: { accent: "198,133,255", glow: "110,186,255", surfaceStart: "18,9,31", surfaceEnd: "14,19,41" },
  cobalt: { accent: "103,190,255", glow: "94,117,255", surfaceStart: "7,14,31", surfaceEnd: "13,24,46" },
  hyper: { accent: "255,116,191", glow: "90,217,255", surfaceStart: "17,8,25", surfaceEnd: "12,19,41" },
  glow: { accent: "255,229,120", glow: "112,226,255", surfaceStart: "21,17,10", surfaceEnd: "13,26,35" },
  vintage: { accent: "255,177,121", glow: "255,118,159", surfaceStart: "28,13,12", surfaceEnd: "37,19,28" },
  glass: { accent: "142,232,255", glow: "154,183,255", surfaceStart: "6,16,28", surfaceEnd: "15,24,39" },
  ember: { accent: "255,177,92", glow: "255,106,106", surfaceStart: "28,13,9", surfaceEnd: "34,22,18" },
  green: { accent: "121,255,181", glow: "76,210,255", surfaceStart: "7,18,14", surfaceEnd: "10,28,25" },
  rose: { accent: "255,138,196", glow: "171,125,255", surfaceStart: "29,11,28", surfaceEnd: "22,15,37" },
  red: { accent: "255,125,125", glow: "255,170,107", surfaceStart: "30,8,12", surfaceEnd: "40,18,20" },
  iridescent: { accent: "125,247,255", glow: "255,123,221", surfaceStart: "7,12,29", surfaceEnd: "27,13,34" },
}

const PACK_PRESENTATIONS: Record<string, Omit<PackPresentation, keyof PackPalette> & { palette: keyof typeof PACK_PALETTES }> = {
  "hyper-icons-premium": {
    palette: "hyper",
    signature: "Hyper Interface",
    story: "Oversized product UI icons with the loudest premium presence in the shelf.",
    featured: true,
  },
  "poligon-premium": {
    palette: "polygon",
    signature: "Flagship Geometry",
    story: "A larger angular bundle with the sharper polygon language pushed to the front.",
    featured: true,
  },
  "purple-icons-premium": {
    palette: "purple",
    signature: "Ultra Violet",
    story: "High-polish purple treatment with a sharper futuristic glow.",
    featured: true,
  },
  "neon-icons-free": {
    palette: "neon",
    signature: "Neon Gateway",
    story: "A generous free neon line that still carries the Volynx future-facing silhouette.",
    featured: true,
  },
  "volynx-master-webp": {
    palette: "master",
    signature: "Open Archive",
    story: "The broad WebP archive for exploring the full range of Volynx icon language.",
    featured: true,
  },
  "glow-premium": {
    palette: "glow",
    signature: "Glow Signal",
    story: "Soft luminous halos and cleaner futuristic light falloff in one premium pack.",
  },
  "icons-glass-premium": {
    palette: "glass",
    signature: "Crystal Layer",
    story: "Glossy depth, transparency and quiet reflections for premium glass UI work.",
  },
  "icons-glass-premium-2": {
    palette: "glass",
    signature: "Crystal Variant",
    story: "A second glass direction with the same polished material, arranged as its own line.",
  },
  "iridescent-premium": {
    palette: "iridescent",
    signature: "Iridescent Shift",
    story: "The chromatic premium line with shifting light and cleaner reflective depth.",
  },
  "metal-chrome-premium": {
    palette: "chrome",
    signature: "Chrome Vector",
    story: "A tighter chrome line for compact premium accents and sharper detail.",
  },
  "metal-premium": {
    palette: "chrome",
    signature: "Forged Metal",
    story: "A denser metal series with bold highlights and confident industrial shine.",
  },
  "vintage-premium": {
    palette: "vintage",
    signature: "Retro Signal",
    story: "Warm stylized tones for a premium shelf that feels archival, not generic.",
  },
  "abstract-free": {
    palette: "rose",
    signature: "Abstract Drop",
    story: "Free abstract shapes for testing the Volynx mood without flattening the brand.",
  },
  "day-by-day-free": {
    palette: "cobalt",
    signature: "Day By Day",
    story: "A lighter daily free pack that still feels authored and intentional.",
  },
  "icons-blue-sliced3": {
    palette: "cobalt",
    signature: "Blue Vector Slice",
    story: "Technical blue slicing with more motion and sharper cut lines.",
  },
  "neon-icons-free3": {
    palette: "neon",
    signature: "Neon Variant III",
    story: "A second free neon shelf with alternate shapes for faster product testing.",
  },
  "soft-blue": {
    palette: "cobalt",
    signature: "Soft Blue",
    story: "A calm premium blue pack with softer light and cleaner volume.",
  },
  "soft-dark-blue": {
    palette: "cobalt",
    signature: "Night Blue",
    story: "Deeper premium blues for darker dashboards and quieter interfaces.",
  },
  "soft-green": {
    palette: "green",
    signature: "Soft Green",
    story: "Fresh premium greens with a softer glow and cleaner organic weight.",
  },
  "soft-orange": {
    palette: "ember",
    signature: "Soft Orange",
    story: "Warm premium orange shapes that keep energy without losing polish.",
  },
  "soft-red": {
    palette: "red",
    signature: "Soft Red",
    story: "Controlled red intensity for premium packs that still read as elegant.",
  },
}

function resolvePackPresentation(pack: IconPack): PackPresentation {
  const mapped = PACK_PRESENTATIONS[pack.slug]

  if (mapped) {
    return { ...PACK_PALETTES[mapped.palette], ...mapped }
  }

  return {
    ...PACK_PALETTES[pack.plan === "premium" ? "master" : "cobalt"],
    signature: pack.plan === "premium" ? "Volynx Premium" : "Volynx Free",
    story: "A curated Volynx icon pack prepared for the storefront shelf.",
  }
}

function formatPackPrice(price: string) {
  if (price.toLowerCase() === "free") {
    return "£0"
  }

  return price.startsWith("£") ? price : price.replace("$", "£")
}

export function IconsStoreSection() {
  const [activeCategory, setActiveCategory] = useState<(typeof iconStoreCategories)[number]>("All")
  const [activePackFilter, setActivePackFilter] = useState<string>(PACK_FILTER_ALL)
  const [selectedIcon, setSelectedIcon] = useState<StoreIcon | null>(null)
  const [checkoutPack, setCheckoutPack] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<{ pack: string; message: string } | null>(null)
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null)
  const packFilterOptions = useMemo(
    () => [
      PACK_FILTER_ALL,
      PACK_FILTER_PREMIUM,
      PACK_FILTER_FREE,
      ...Array.from(new Set(iconPacks.map((pack) => pack.category)))
    ],
    []
  )
  const visiblePacks = useMemo(() => {
    if (activePackFilter === PACK_FILTER_ALL) return iconPacks
    if (activePackFilter === PACK_FILTER_PREMIUM) return iconPacks.filter((pack) => pack.plan === "premium")
    if (activePackFilter === PACK_FILTER_FREE) return iconPacks.filter((pack) => pack.plan === "free")
    return iconPacks.filter((pack) => pack.category === activePackFilter)
  }, [activePackFilter])
  const packFilterCounts = useMemo(() => {
    const counts = new Map<string, number>()
    counts.set(PACK_FILTER_ALL, iconPacks.length)
    counts.set(PACK_FILTER_PREMIUM, iconPackStats.premium)
    counts.set(PACK_FILTER_FREE, iconPackStats.free)

    for (const pack of iconPacks) {
      counts.set(pack.category, (counts.get(pack.category) ?? 0) + 1)
    }

    return counts
  }, [])
  const iconCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    counts.set("All", iconStoreIcons.length)

    for (const icon of iconStoreIcons) {
      counts.set(icon.category, (counts.get(icon.category) ?? 0) + 1)
    }

    return counts
  }, [])
  const heroPacks = useMemo(() => iconPacks.filter((pack) => pack.plan === "premium").slice(0, 3), [])
  const visibleIcons = useMemo(() => {
    if (activeCategory === "All") return iconStoreIcons
    return iconStoreIcons.filter((icon) => icon.category === activeCategory)
  }, [activeCategory])
  const featuredIcons = useMemo(() => iconStoreIcons.slice(0, 12), [])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const checkout = search.get("checkout")
    const packSlug = search.get("pack")

    if (checkout === "cancelled") {
      const packName = iconPacks.find((pack) => pack.slug === packSlug)?.name
      setCheckoutNotice(packName ? `${packName} checkout was cancelled. No charge was completed.` : "Checkout was cancelled. No charge was completed.")
    }
  }, [])

  useEffect(() => {
    if (!selectedIcon) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIcon(null)
    }

    window.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [selectedIcon])

  async function startPackCheckout(pack: IconPack) {
    setCheckoutPack(pack.slug)
    setCheckoutError(null)

    try {
      const response = await fetch("/api/checkout/icons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pack: pack.slug })
      })
      const data = await response.json() as { url?: string; sessionId?: string; error?: string }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Checkout could not be started.")
      }

      if (data.sessionId) {
        try {
          window.localStorage.setItem(
            "icons-pending-checkout",
            JSON.stringify({ sessionId: data.sessionId, pack: pack.slug, createdAt: new Date().toISOString() })
          )
        } catch {
          // Checkout still works if the browser blocks local storage.
        }
      }

      window.location.assign(data.url)
    } catch (error) {
      setCheckoutPack(null)
      setCheckoutError({
        pack: pack.slug,
        message: error instanceof Error ? error.message : "Checkout could not be started."
      })
    }
  }

  return (
    <main className="icons-store-page">
      <section id="icon-vault" className="icons-store-hero">
        <div className="container-shell">
          <div className="icons-store-hero-shell">
            <div className="text-center lg:text-left">
              <BrandLockup size="sm" caption="VX signature" className="mx-auto mb-5 lg:mx-0" />
              <p className="icons-store-brand">Icon Vault</p>
              <h1 className="icons-store-title">Icons Store</h1>
              <p className="icons-store-subtitle">Premium · Textured · Futuristic</p>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#7c8a9a] lg:mx-0">
                {iconPackStats.packs} catalogued WebP packs, priced premium vaults and the VX source SVG collection arranged so the commercial packs lead the page and the metallic source gallery lives lower in the browse flow.
              </p>
              <div className="icons-store-stats" aria-label="Icons Store stats">
                <div className="icons-store-stat">
                  <strong>{iconPackStats.packs}</strong>
                  <span>ready packs</span>
                </div>
                <div className="icons-store-stat">
                  <strong>{iconPackStats.icons}</strong>
                  <span>WebP icons</span>
                </div>
                <div className="icons-store-stat">
                  <strong>{iconPackStats.free}</strong>
                  <span>free drops</span>
                </div>
                <div className="icons-store-stat">
                  <strong>{iconPackStats.premium}</strong>
                  <span>premium vaults</span>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Button href="#ready-packs">Browse priced packs</Button>
                <Button href="#icon-grid" variant="secondary">Explore icon grid</Button>
              </div>
            </div>

            <div className="icons-store-showcase-card" aria-label="Icons Store launch showcase">
              <div className="icons-showcase-topbar">
                <span />
                <span />
                <span />
                <p>premium-pack-browser</p>
              </div>
              <div className="icons-showcase-feature">
                <BrandLockup
                  size="lg"
                  caption="The VX reference"
                  showWordmark={false}
                  className="mx-auto sm:mx-0"
                />
                <div>
                  <p>VX signature</p>
                  <strong>The icon that anchors every pack, vault and launch surface.</strong>
                  <span>{iconPackStats.premium} premium vaults plus {iconPackStats.free} free drops, now tied to one unmistakable mark instead of a fragmented shelf identity.</span>
                </div>
              </div>
              <div className="icons-showcase-strip">
                {heroPacks.map((pack) => {
                  const presentation = resolvePackPresentation(pack)

                  return (
                    <div
                      key={pack.slug}
                      className="icons-showcase-pack"
                      style={{
                        "--pack-accent": presentation.accent,
                        "--pack-glow": presentation.glow,
                      } as CSSProperties}
                    >
                      <span className="vx-card-chip compact">VX</span>
                      <div className="icons-showcase-pack-icons" aria-hidden="true">
                        {pack.preview.slice(0, 3).map((src) => (
                          <Image key={src} src={src} alt="" width={72} height={72} />
                        ))}
                      </div>
                      <p>{presentation.signature}</p>
                      <strong>{pack.name}</strong>
                      <div className="icons-showcase-pack-price">
                        <span>{formatPackPrice(pack.price)}</span>
                        <small>{pack.count} WebP</small>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ready-packs" className="container-shell py-10">
        <div className="icons-section-heading">
          <p className="icons-store-brand">Ready Packs</p>
          <h2>Free drops and premium vaults ready to publish.</h2>
          <p>
            Each pack uses the WebP folders you separated for launch, with real previews, item counts, individual pricing and direct paths for free or premium conversion.
          </p>
        </div>
        {checkoutNotice ? (
          <div className="mb-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100/90">
            {checkoutNotice}
          </div>
        ) : null}
        <div className="icons-pack-filters" aria-label="Ready pack categories">
          {packFilterOptions.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActivePackFilter(filter)}
              className={cn("icons-pack-filter", activePackFilter === filter && "active")}
            >
              <span>{filter}</span>
              <strong>{packFilterCounts.get(filter) ?? 0}</strong>
            </button>
          ))}
        </div>
        <div className="icons-pack-grid">
          {visiblePacks.map((pack) => {
            const presentation = resolvePackPresentation(pack)
            const packStyle = {
              "--pack-accent": presentation.accent,
              "--pack-glow": presentation.glow,
              "--pack-surface-start": presentation.surfaceStart,
              "--pack-surface-end": presentation.surfaceEnd,
            } as CSSProperties

            return (
              <article
                key={pack.slug}
                className={cn(
                  "icons-pack-card",
                  pack.plan === "premium" && "is-premium",
                  presentation.featured && "is-featured",
                )}
                style={packStyle}
              >
                <span className="vx-card-chip">VX</span>
                <div className="icons-pack-meta">
                  <span className={cn("icons-plan-badge", pack.plan)}>{pack.plan}</span>
                  <span className="icons-pack-signature">{presentation.signature}</span>
                </div>
                <div className="icons-pack-preview" aria-hidden="true">
                  {pack.preview.map((src) => (
                    <div key={src} className="icons-pack-tile">
                      <Image src={src} alt="" width={96} height={96} />
                    </div>
                  ))}
                </div>
                <div className="icons-pack-submeta">
                  <p className="icons-pack-category">{pack.category}</p>
                  <span className="icons-pack-count">{pack.count} WebP</span>
                </div>
                <h3 className="icons-pack-title">{pack.name}</h3>
                <p className="icons-pack-story">{presentation.story}</p>
                <div className="icons-pack-price-row">
                  <strong>{formatPackPrice(pack.price)}</strong>
                  <span>{pack.priceDetail}</span>
                </div>
                {pack.plan === "premium" ? (
                  <button
                    type="button"
                    onClick={() => startPackCheckout(pack)}
                    disabled={checkoutPack !== null}
                    className="icons-pack-cta"
                  >
                    {checkoutPack === pack.slug ? "Opening Stripe..." : `Buy pack - ${formatPackPrice(pack.price)}`}
                  </button>
                ) : (
                  <a href={pack.href} className="icons-pack-cta">
                    Download free ZIP
                  </a>
                )}
                {checkoutError?.pack === pack.slug ? (
                  <p className="mt-3 text-xs leading-5 text-amber-200/80">{checkoutError.message}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className="icons-store-filters" aria-label="Icon categories">
        {iconStoreCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn("icons-filter-btn", activeCategory === category && "active")}
          >
            <span>{category}</span>
            <strong>{iconCategoryCounts.get(category) ?? 0}</strong>
          </button>
        ))}
      </section>

      <section id="icon-grid" className="icons-store-grid" aria-label="VolynxOS icon store">
        {visibleIcons.map((icon) => (
          <button
            key={icon.label}
            type="button"
            onClick={() => setSelectedIcon(icon)}
            className={cn("neon-icon-card", icon.tone !== "cyan" && `tone-${icon.tone}`)}
            aria-label={`Open preview for ${icon.label}`}
          >
            <span className="vx-card-chip compact">VX</span>
            {icon.badge ? <span className={cn("neon-icon-badge", icon.badgeTone && `badge-${icon.badgeTone}`)}>{icon.badge}</span> : null}
            <div className="neon-icon-svg" dangerouslySetInnerHTML={{ __html: icon.svg }} />
            <p className="neon-icon-label">{icon.label}</p>
          </button>
        ))}
      </section>

      <section className="container-shell py-10">
        <div className="icons-export-showcase">
          <div>
            <p className="icons-store-brand text-left">SVG Vault</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              The metal SVG icons now live lower in the page.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#7c8a9a]">
              The shopping flow stays focused on priced packs first. The source SVG shelf is still here for previews, references and collectible browsing, but no longer competes with the top of the store.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="#ready-packs">Back to priced packs</Button>
              <Button href={storeUrl} variant="secondary">Open product store</Button>
            </div>
          </div>

          <div className="source-preview-shell" aria-label="SVG vault preview">
            <div className="source-preview-topbar">
              <span />
              <span />
              <span />
              <p>svg-vault/source-preview</p>
            </div>
            <div className="source-preview-grid">
              {iconStoreIcons.slice(0, 8).map((icon) => (
                <button
                  key={icon.label}
                  type="button"
                  className={cn("source-preview-card", icon.tone !== "cyan" && `tone-${icon.tone}`)}
                  onClick={() => setSelectedIcon(icon)}
                  aria-label={`Open preview for ${icon.label}`}
                >
                  <span className="vx-card-chip compact">VX</span>
                  <div dangerouslySetInnerHTML={{ __html: icon.svg }} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 featured-source-grid" aria-label="Featured source icons">
          {featuredIcons.map((icon) => (
            <button
              key={icon.label}
              type="button"
              className={cn("featured-source-card", icon.tone !== "cyan" && `tone-${icon.tone}`)}
              onClick={() => setSelectedIcon(icon)}
              aria-label={`Preview ${icon.label}`}
            >
              <span className="vx-card-chip compact">VX</span>
              {icon.badge ? <span className={cn("neon-icon-badge", icon.badgeTone && `badge-${icon.badgeTone}`)}>{icon.badge}</span> : null}
              <div className="featured-source-svg" dangerouslySetInnerHTML={{ __html: icon.svg }} />
              <div className="featured-source-copy">
                <p>{icon.category}</p>
                <strong>{icon.label}</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="container-shell pb-20">
        <div className="icons-store-pack">
          <div>
            <p className="icons-store-brand text-left">
              {iconPackStats.packs} Packs · {iconPackStats.icons} WebP · 40 SVG Source Icons
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              The Icons Store is now a real VolynxOS product shelf.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#7c8a9a]">
              Free packs can build trust, premium packs can route to checkout, and the source set keeps the neon card language consistent across the platform.
            </p>
          </div>
          <Button href={storeUrl}>Open product store</Button>
        </div>
      </section>

      {selectedIcon ? (
        <div
          className="icons-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedIcon(null)
          }}
        >
          <div className={cn("icons-modal-card", selectedIcon.tone !== "cyan" && `tone-${selectedIcon.tone}`)} role="dialog" aria-modal="true" aria-label={selectedIcon.label}>
            <button type="button" className="icons-modal-close" onClick={() => setSelectedIcon(null)} aria-label="Close preview">
              Close
            </button>
            <div className="icons-modal-svg" dangerouslySetInnerHTML={{ __html: selectedIcon.svg }} />
            <p className="icons-modal-category">{selectedIcon.category}</p>
            <h3 className="icons-modal-title">{selectedIcon.label}</h3>
            <p className="icons-modal-copy">
              Source SVG preview from the VolynxOS icon grid. Use the filtered shelf for browsing and the ready packs above for WebP-based product delivery.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  )
}
