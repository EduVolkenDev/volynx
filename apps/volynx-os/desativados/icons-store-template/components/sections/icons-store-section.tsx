"use client"

import Image from "next/image"
import { type CSSProperties, useEffect, useMemo, useState } from "react"
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

export function IconsStoreSection() {
  const [activeCategory, setActiveCategory] = useState<(typeof iconStoreCategories)[number]>("All")
  const [selectedIcon, setSelectedIcon] = useState<StoreIcon | null>(null)
  const visibleIcons = useMemo(() => {
    if (activeCategory === "All") return iconStoreIcons
    return iconStoreIcons.filter((icon) => icon.category === activeCategory)
  }, [activeCategory])
  const featuredIcons = useMemo(() => iconStoreIcons.slice(0, 12), [])

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

  return (
    <main className="icons-store-page">
      <section className="icons-store-hero">
        <div className="container-shell">
          <div className="icons-store-hero-shell">
            <div className="text-center lg:text-left">
              <p className="icons-store-brand">VolynxOS Assets</p>
              <h1 className="icons-store-title">Icons Store</h1>
              <p className="icons-store-subtitle">Premium · Textured · Futuristic</p>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#7c8a9a] lg:mx-0">
                {iconPackStats.packs} catalogued WebP packs plus the VolynxOS SVG source set, organized for free drops, priced premium packs and fast product publishing.
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
                <Button href="#ready-packs">Browse ready packs</Button>
                <Button href={storeUrl} variant="secondary">Open product store</Button>
              </div>
            </div>

            <div className="icons-store-logo-card" aria-label="Icons Store logo card">
              <div className="icons-store-logo-frame">
                <Image
                  src="/icons-store/icons-logo.webp"
                  alt="VolynxOS Icons Store logo"
                  width={320}
                  height={320}
                  priority
                  className="icons-store-logo-image"
                />
              </div>
              <div className="icons-store-logo-copy">
                <p>Source identity</p>
                <strong>Icons logo</strong>
                <span>Use this as the recognisable pack mark while the SVG vault and WebP shelf expand.</span>
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
        <div className="icons-pack-grid">
          {iconPacks.map((pack) => {
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
                  <strong>{pack.price}</strong>
                  <span>{pack.priceDetail}</span>
                </div>
                <a
                  href={pack.plan === "premium" ? storeUrl : pack.href}
                  target={pack.plan === "premium" ? "_blank" : undefined}
                  rel={pack.plan === "premium" ? "noopener noreferrer" : undefined}
                  className="icons-pack-cta"
                >
                  {pack.plan === "premium" ? `Buy pack - ${pack.price}` : "Download free ZIP"}
                </a>
              </article>
            )
          })}
        </div>
      </section>

      <section className="container-shell py-10">
        <div className="icons-export-showcase">
          <div>
            <p className="icons-store-brand text-left">Volynx Source Edition</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              The SVG model set stays as the Volynx source layer.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#7c8a9a]">
              Dark neon cards, textured SVG icons and a premium product surface for SaaS pages, dashboards, stores and kit launches.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href={storeUrl}>Get the vault</Button>
              <Button href="#icon-grid" variant="secondary">Continue to icons</Button>
            </div>
          </div>

          <div className="source-preview-shell" aria-label="Volynx source preview">
            <div className="source-preview-topbar">
              <span />
              <span />
              <span />
              <p>volynx-icons-store/source-edition</p>
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
                  <div dangerouslySetInnerHTML={{ __html: icon.svg }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-10">
        <div className="icons-section-heading">
          <p className="icons-store-brand">Featured Source Grid</p>
          <h2>The HTML showcase grid now lives in the page as a real section.</h2>
          <p>
            These twelve cards pull from the source SVG set directly, keep the neon palette visible, and open a larger preview instead of feeling decorative only.
          </p>
        </div>
        <div className="featured-source-grid" aria-label="Featured source icons">
          {featuredIcons.map((icon) => (
            <button
              key={icon.label}
              type="button"
              className={cn("featured-source-card", icon.tone !== "cyan" && `tone-${icon.tone}`)}
              onClick={() => setSelectedIcon(icon)}
              aria-label={`Preview ${icon.label}`}
            >
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

      <section className="icons-store-filters" aria-label="Icon categories">
        {iconStoreCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn("icons-filter-btn", activeCategory === category && "active")}
          >
            {category}
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
            {icon.badge ? <span className={cn("neon-icon-badge", icon.badgeTone && `badge-${icon.badgeTone}`)}>{icon.badge}</span> : null}
            <div className="neon-icon-svg" dangerouslySetInnerHTML={{ __html: icon.svg }} />
            <p className="neon-icon-label">{icon.label}</p>
          </button>
        ))}
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
