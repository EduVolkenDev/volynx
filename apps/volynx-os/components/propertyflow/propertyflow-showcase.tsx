"use client"

import { useMemo, useState, type CSSProperties } from "react"
import {
  BarChart3,
  Building2,
  CheckCircle2,
  GalleryHorizontalEnd,
  Grid2X2,
  Layers3,
  ListFilter,
  MapPinned,
  PanelsTopLeft,
  Search,
  ShieldCheck,
  Sparkles,
  Table2
} from "lucide-react"
import { propertyFlowTiers } from "@/content/propertyflow"
import { cn } from "@/lib/utils"

type DemoProperty = {
  title: string
  location: string
  price: string
  beds: number
  baths: number
  image: string
  tag: string
  yield: string
}

type TemplateTier = "Starter" | "Professional" | "White-Label"

type TemplateDemo = {
  name: string
  tier: TemplateTier
  description: string
  variant:
    | "grid"
    | "magazine"
    | "list"
    | "gallery"
    | "split"
    | "masonry"
    | "editorial"
    | "minimal"
    | "stack"
    | "timeline"
    | "map"
    | "grouped"
    | "story"
    | "showroom"
    | "catalog"
}

const demoProperties: DemoProperty[] = [
  {
    title: "Riverside Penthouse",
    location: "Canary Wharf, London",
    price: "GBP 925,000",
    beds: 3,
    baths: 2,
    tag: "Featured",
    yield: "4.8%",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Chelsea Garden House",
    location: "Chelsea, London",
    price: "GBP 1.42M",
    beds: 4,
    baths: 3,
    tag: "Prime",
    yield: "3.9%",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Lisbon View Apartment",
    location: "Chiado, Lisbon",
    price: "EUR 780,000",
    beds: 2,
    baths: 2,
    tag: "New",
    yield: "5.1%",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Surrey Glass Villa",
    location: "Guildford, Surrey",
    price: "GBP 1.85M",
    beds: 5,
    baths: 4,
    tag: "Private",
    yield: "3.4%",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Manchester Loft",
    location: "Ancoats, Manchester",
    price: "GBP 485,000",
    beds: 2,
    baths: 1,
    tag: "Investor",
    yield: "6.2%",
    image: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Porto Townhouse",
    location: "Foz, Porto",
    price: "EUR 640,000",
    beds: 3,
    baths: 2,
    tag: "Coastal",
    yield: "4.6%",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
  }
]

const templateDemos: TemplateDemo[] = [
  { name: "Classic Grid", tier: "Starter", description: "A polished card grid for fast catalogue launches.", variant: "grid" },
  { name: "Magazine", tier: "Starter", description: "Editorial lead property with secondary listings beside it.", variant: "magazine" },
  { name: "Compact List", tier: "Starter", description: "Dense scanning for buyers comparing price, beds and location.", variant: "list" },
  { name: "Gallery Hero", tier: "Professional", description: "Large media-first property display with thumbnail navigation.", variant: "gallery" },
  { name: "Split View", tier: "Professional", description: "Filters and listings beside a premium visual panel.", variant: "split" },
  { name: "Masonry", tier: "Professional", description: "Asymmetric discovery wall for image-heavy agencies.", variant: "masonry" },
  { name: "Editorial", tier: "White-Label", description: "High-end launch-page storytelling for flagship homes.", variant: "editorial" },
  { name: "Minimalist", tier: "White-Label", description: "Quiet luxury listings with fewer borders and stronger spacing.", variant: "minimal" },
  { name: "Card Stack", tier: "White-Label", description: "Interactive-feeling stacked cards for sales decks and demos.", variant: "stack" },
  { name: "Timeline", tier: "White-Label", description: "Show property release cadence, viewings and sold history.", variant: "timeline" },
  { name: "Map-First", tier: "White-Label", description: "Location-led browsing with listings pinned to regions.", variant: "map" },
  { name: "Grouped", tier: "White-Label", description: "Neighbourhood sections for multi-market agencies.", variant: "grouped" },
  { name: "Story Mode", tier: "White-Label", description: "A swipe-style hero for premium campaign pages.", variant: "story" },
  { name: "Showroom", tier: "White-Label", description: "Luxury carousel treatment for agency showcases.", variant: "showroom" },
  { name: "Catalog", tier: "White-Label", description: "Operational table view for serious buyer shortlists.", variant: "catalog" }
]

const tierAccent: Record<TemplateTier, string> = {
  Starter: "from-cyan-300/18 to-white/5",
  Professional: "from-emerald-300/20 to-cyan-300/5",
  "White-Label": "from-amber-200/20 to-violet-300/10"
}

function propertyImageStyle(property: DemoProperty, overlay = "dark"): CSSProperties {
  const tint =
    overlay === "light"
      ? "linear-gradient(180deg, rgba(6,10,18,.08), rgba(6,10,18,.42))"
      : "linear-gradient(180deg, rgba(6,10,18,.08), rgba(6,10,18,.84))"

  return {
    backgroundImage: `${tint}, url(${property.image})`,
    backgroundPosition: "center",
    backgroundSize: "cover"
  }
}

function PhotoPanel({
  property,
  className,
  children,
  overlay = "dark",
  style
}: {
  property: DemoProperty
  className?: string
  children?: React.ReactNode
  overlay?: "dark" | "light"
  style?: CSSProperties
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950", className)}
      style={{ ...propertyImageStyle(property, overlay), ...style }}
      role="img"
      aria-label={`${property.title} in ${property.location}`}
    >
      {children}
    </div>
  )
}

function MiniMeta({ property }: { property: DemoProperty }) {
  return (
    <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/15 bg-black/55 p-3 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">{property.location}</p>
          <p className="mt-1 text-sm font-semibold text-white">{property.title}</p>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
          {property.tag}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-200">
        <span>{property.price}</span>
        <span>{property.beds} bd / {property.baths} ba</span>
      </div>
    </div>
  )
}

function TemplatePreview({ demo }: { demo: TemplateDemo }) {
  const properties = demoProperties

  if (demo.variant === "grid") {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {properties.slice(0, 3).map((property) => (
          <PhotoPanel key={property.title} property={property} className="h-72">
            <MiniMeta property={property} />
          </PhotoPanel>
        ))}
      </div>
    )
  }

  if (demo.variant === "magazine") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
        <PhotoPanel property={properties[1]} className="min-h-[390px]">
          <div className="absolute left-5 top-5 rounded-md bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black">
            Lead story
          </div>
          <MiniMeta property={properties[1]} />
        </PhotoPanel>
        <div className="grid gap-3">
          {properties.slice(2, 5).map((property) => (
            <div key={property.title} className="grid grid-cols-[112px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <PhotoPanel property={property} className="h-24" overlay="light" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{property.tag}</p>
                <p className="mt-2 truncate text-sm font-semibold text-white">{property.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{property.location}</p>
                <p className="mt-3 text-sm text-zinc-200">{property.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (demo.variant === "list") {
    return (
      <div className="grid gap-3">
        {properties.slice(0, 5).map((property) => (
          <div key={property.title} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[140px_1fr_auto] md:items-center">
            <PhotoPanel property={property} className="h-28" overlay="light" />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/70">{property.location}</p>
              <h4 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">{property.title}</h4>
              <p className="mt-1 text-sm text-zinc-400">{property.beds} bedrooms / {property.baths} bathrooms / estimated yield {property.yield}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-right">
              <p className="text-sm font-semibold text-white">{property.price}</p>
              <p className="mt-1 text-xs text-zinc-500">{property.tag}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (demo.variant === "gallery") {
    return (
      <div className="grid gap-3">
        <PhotoPanel property={properties[3]} className="min-h-[420px]">
          <MiniMeta property={properties[3]} />
        </PhotoPanel>
        <div className="grid grid-cols-4 gap-3">
          {properties.slice(0, 4).map((property) => (
            <PhotoPanel key={property.title} property={property} className="h-24" overlay="light" />
          ))}
        </div>
      </div>
    )
  }

  if (demo.variant === "split") {
    return (
      <div className="grid gap-3 lg:grid-cols-[.72fr_1fr]">
        <div className="rounded-lg border border-white/10 bg-black/35 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-400">
            <Search className="h-4 w-4" />
            London, Porto, Lisbon
          </div>
          <div className="mt-4 grid gap-3">
            {properties.slice(0, 4).map((property) => (
              <button key={property.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-emerald-200/30">
                <p className="text-sm font-semibold text-white">{property.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{property.location}</p>
                <p className="mt-3 text-sm text-emerald-100">{property.price}</p>
              </button>
            ))}
          </div>
        </div>
        <PhotoPanel property={properties[0]} className="min-h-[430px]">
          <MiniMeta property={properties[0]} />
        </PhotoPanel>
      </div>
    )
  }

  if (demo.variant === "masonry") {
    return (
      <div className="columns-1 gap-3 md:columns-3">
        {properties.map((property, index) => (
          <PhotoPanel
            key={property.title}
            property={property}
            className={cn("mb-3 break-inside-avoid", index % 2 === 0 ? "h-72" : "h-96")}
          >
            <MiniMeta property={property} />
          </PhotoPanel>
        ))}
      </div>
    )
  }

  if (demo.variant === "editorial") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_.72fr]">
        <PhotoPanel property={properties[1]} className="min-h-[460px]">
          <div className="absolute inset-x-6 bottom-6 max-w-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Flagship listing</p>
            <h4 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">{properties[1].title}</h4>
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-100/80">A cinematic lead layout for agencies selling fewer, better properties with stronger narrative.</p>
          </div>
        </PhotoPanel>
        <div className="grid content-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-5">
          {["Private viewing", "Investment memo", "Neighbourhood story"].map((item) => (
            <div key={item} className="border-b border-white/10 pb-5 last:border-b-0 last:pb-0">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">{item}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">Premium content blocks that make the site feel like a product, not a data dump.</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (demo.variant === "minimal") {
    return (
      <div className="grid gap-2 rounded-lg border border-white/10 bg-[#f4f1ea] p-4 text-zinc-950">
        {properties.slice(0, 5).map((property) => (
          <div key={property.title} className="grid grid-cols-[96px_1fr_auto] items-center gap-4 border-b border-zinc-950/10 py-3 last:border-b-0">
            <PhotoPanel property={property} className="h-20 border-zinc-950/10" overlay="light" />
            <div>
              <p className="text-sm font-semibold">{property.title}</p>
              <p className="mt-1 text-xs text-zinc-600">{property.location}</p>
            </div>
            <p className="text-sm font-semibold">{property.price}</p>
          </div>
        ))}
      </div>
    )
  }

  if (demo.variant === "stack") {
    return (
      <div className="relative min-h-[460px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-6">
        {properties.slice(0, 4).map((property, index) => (
          <PhotoPanel
            key={property.title}
            property={property}
            className="absolute h-80 w-[72%] max-w-[560px] shadow-2xl"
            style={{
              transform: `translate(${index * 42}px, ${index * 32}px) rotate(${index * 2 - 3}deg)`,
              zIndex: 4 - index
            }}
          >
            <MiniMeta property={property} />
          </PhotoPanel>
        ))}
        <div className="relative z-10 ml-auto w-fit rounded-lg border border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.18em] text-violet-100/80">Stack mode</p>
          <p className="mt-2 text-sm text-white">Swipe-ready premium shortlist</p>
        </div>
      </div>
    )
  }

  if (demo.variant === "timeline") {
    return (
      <div className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-5">
        {properties.slice(0, 5).map((property, index) => (
          <div key={property.title} className="grid grid-cols-[36px_120px_1fr] gap-4">
            <div className="relative flex justify-center">
              <span className="mt-2 h-3 w-3 rounded-full bg-cyan-200" />
              {index < 4 ? <span className="absolute top-6 h-full w-px bg-white/10" /> : null}
            </div>
            <PhotoPanel property={property} className="h-24" overlay="light" />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Week {index + 1}</p>
              <p className="mt-2 text-base font-semibold text-white">{property.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{property.tag} / {property.price}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (demo.variant === "map") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="relative min-h-[430px] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,.22),transparent_22rem),radial-gradient(circle_at_76%_62%,rgba(129,140,248,.18),transparent_20rem),#08111e]">
          {["left-[18%] top-[24%]", "left-[62%] top-[30%]", "left-[44%] top-[62%]", "left-[78%] top-[70%]"].map((position, index) => (
            <span key={position} className={cn("absolute flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white text-xs font-bold text-black shadow-lg", position)}>
              {index + 1}
            </span>
          ))}
          <div className="absolute bottom-5 left-5 rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Map-first browsing</p>
            <p className="mt-2 text-sm text-white">Pins, filters and shortlist in one display.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {properties.slice(0, 3).map((property) => (
            <div key={property.title} className="grid grid-cols-[86px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <PhotoPanel property={property} className="h-20" overlay="light" />
              <div>
                <p className="text-sm font-semibold text-white">{property.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{property.location}</p>
                <p className="mt-2 text-xs text-emerald-100">{property.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (demo.variant === "grouped") {
    const groups = [
      ["London", properties.slice(0, 2)],
      ["Portugal", properties.slice(2, 4)],
      ["Investor", properties.slice(4, 6)]
    ] as const

    return (
      <div className="grid gap-3 md:grid-cols-3">
        {groups.map(([group, items]) => (
          <div key={group} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">{group}</p>
            <div className="mt-4 grid gap-3">
              {items.map((property) => (
                <PhotoPanel key={property.title} property={property} className="h-48">
                  <MiniMeta property={property} />
                </PhotoPanel>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (demo.variant === "story") {
    return (
      <PhotoPanel property={properties[5]} className="min-h-[470px]">
        <div className="absolute left-5 right-5 top-5 grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <span key={item} className={cn("h-1 rounded-full", item === 0 ? "bg-white" : "bg-white/30")} />
          ))}
        </div>
        <div className="absolute bottom-6 left-6 max-w-lg">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Story Mode</p>
          <h4 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{properties[5].title}</h4>
          <p className="mt-4 text-sm leading-6 text-zinc-100/80">A mobile-friendly premium display for agency campaigns, featured homes and launch announcements.</p>
        </div>
      </PhotoPanel>
    )
  }

  if (demo.variant === "showroom") {
    return (
      <div className="grid gap-3">
        <PhotoPanel property={properties[3]} className="min-h-[440px]">
          <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white backdrop-blur">
            Showroom
          </div>
          <MiniMeta property={properties[3]} />
        </PhotoPanel>
        <div className="grid grid-cols-3 gap-3">
          {properties.slice(0, 3).map((property) => (
            <PhotoPanel key={property.title} property={property} className="h-28" overlay="light" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="grid grid-cols-[1.2fr_.8fr_.7fr_.7fr] bg-white/[0.06] px-4 py-3 text-xs uppercase tracking-[0.14em] text-zinc-500">
        <span>Property</span>
        <span>Location</span>
        <span>Price</span>
        <span>Yield</span>
      </div>
      {properties.map((property) => (
        <div key={property.title} className="grid grid-cols-[1.2fr_.8fr_.7fr_.7fr] items-center border-t border-white/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <PhotoPanel property={property} className="h-12 w-16 shrink-0" overlay="light" />
            <span className="font-medium text-white">{property.title}</span>
          </div>
          <span className="text-zinc-400">{property.location}</span>
          <span className="text-zinc-200">{property.price}</span>
          <span className="text-emerald-100">{property.yield}</span>
        </div>
      ))}
    </div>
  )
}

export function PropertyFlowTierSamples() {
  const samples = [
    {
      tier: propertyFlowTiers[0],
      title: "Starter is a sellable static catalogue.",
      copy: "The buyer gets a premium public site, three display modes and real property cards from day one.",
      icon: Grid2X2,
      properties: demoProperties.slice(0, 3)
    },
    {
      tier: propertyFlowTiers[1],
      title: "Professional feels like an operating product.",
      copy: "Admin, enquiry capture, galleries and six layouts make it obvious why it is more than a template.",
      icon: BarChart3,
      properties: demoProperties.slice(2, 5)
    },
    {
      tier: propertyFlowTiers[2],
      title: "White-Label becomes an agency platform.",
      copy: "Multi-tenant logic, CRM hooks and fifteen layouts are presented as a premium resale system.",
      icon: ShieldCheck,
      properties: demoProperties.slice(3, 6)
    }
  ]

  return (
    <section className="section-space border-y border-white/5">
      <div className="container-shell">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow">Product samples</span>
          <h2 className="section-title">All three tiers now look like products.</h2>
          <p className="section-copy mt-5">
            Starter, Professional and White-Label each get a visible sample surface, so the page sells the actual
            deliverable before the buyer reaches pricing.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {samples.map((sample) => {
            const Icon = sample.icon

            return (
              <article
                key={sample.tier.id}
                className={cn(
                  "surface relative flex min-h-[620px] flex-col overflow-hidden p-5",
                  sample.tier.highlight && "border-emerald-300/25 bg-emerald-300/[0.04]"
                )}
              >
                <div className={cn("rounded-lg border border-white/10 bg-gradient-to-br p-4", tierAccent[sample.tier.name as TemplateTier])}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{sample.tier.eyebrow}</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{sample.tier.name}</h3>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-black/30 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-zinc-300">{sample.copy}</p>
                </div>
                <div className="mt-5 grid gap-3">
                  {sample.properties.map((property) => (
                    <PhotoPanel key={property.title} property={property} className="h-40">
                      <MiniMeta property={property} />
                    </PhotoPanel>
                  ))}
                </div>
                <div className="mt-auto pt-5">
                  <p className="text-sm font-semibold text-white">{sample.title}</p>
                  <div className="mt-4 grid gap-2">
                    {sample.tier.features.slice(0, 4).map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm text-zinc-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function PropertyFlowShowcase() {
  const [activeName, setActiveName] = useState(templateDemos[0].name)
  const activeDemo = useMemo(
    () => templateDemos.find((template) => template.name === activeName) ?? templateDemos[0],
    [activeName]
  )
  const groups: TemplateTier[] = ["Starter", "Professional", "White-Label"]
  const tierIcons = {
    Starter: Grid2X2,
    Professional: PanelsTopLeft,
    "White-Label": Layers3
  } satisfies Record<TemplateTier, typeof Grid2X2>
  const variantIcons = {
    grid: Grid2X2,
    magazine: GalleryHorizontalEnd,
    list: ListFilter,
    gallery: GalleryHorizontalEnd,
    split: PanelsTopLeft,
    masonry: Grid2X2,
    editorial: Sparkles,
    minimal: Building2,
    stack: Layers3,
    timeline: ListFilter,
    map: MapPinned,
    grouped: PanelsTopLeft,
    story: Sparkles,
    showroom: GalleryHorizontalEnd,
    catalog: Table2
  } satisfies Record<TemplateDemo["variant"], typeof Grid2X2>
  const ActiveIcon = variantIcons[activeDemo.variant]

  return (
    <section id="templates" className="section-space">
      <div className="container-shell">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_.8fr] lg:items-end">
          <div>
            <span className="eyebrow">Interactive preview</span>
            <h2 className="section-title">Preview every grid, display and model before buying.</h2>
            <p className="section-copy mt-5">
              Fifteen display modes are mapped to the three product tiers. Each click changes the live showroom with
              property photography, price data and listing states.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {groups.map((tier) => {
              const Icon = tierIcons[tier]
              const count = templateDemos.filter((template) => template.tier === tier).length

              return (
                <div key={tier} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <Icon className="h-5 w-5 text-white" />
                  <p className="mt-4 text-2xl font-semibold text-white">{count}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{tier}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="surface h-fit p-4">
            {groups.map((tier) => (
              <div key={tier} className="mb-5 last:mb-0">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">{tier}</p>
                <div className="grid gap-2">
                  {templateDemos.filter((template) => template.tier === tier).map((template) => {
                    const Icon = variantIcons[template.variant]

                    return (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => setActiveName(template.name)}
                        className={cn(
                          "grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.05]",
                          activeDemo.name === template.name && "border-emerald-200/35 bg-emerald-200/[0.06]"
                        )}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/25 text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-white">{template.name}</span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">{template.description}</span>
                        </span>
                        <span className="text-xs text-zinc-600">{template.tier === "White-Label" ? "WL" : template.tier === "Professional" ? "Pro" : "S"}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </aside>

          <div className="surface overflow-hidden p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
                  <ActiveIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{activeDemo.tier} display</p>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">{activeDemo.name}</h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                <span className="rounded-md border border-white/10 px-3 py-2">EN/PT ready</span>
                <span className="rounded-md border border-white/10 px-3 py-2">Real photos</span>
                <span className="rounded-md border border-white/10 px-3 py-2">Responsive</span>
              </div>
            </div>
            <TemplatePreview demo={activeDemo} />
          </div>
        </div>
      </div>
    </section>
  )
}
