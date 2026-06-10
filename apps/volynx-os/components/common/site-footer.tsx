import Image from "next/image"
import Link from "next/link"
import { propertyFlowUrl } from "@/content/site"
import { type SiteLocale } from "@/lib/site-locale"

type SiteFooterProps = {
  locale?: SiteLocale
  brand?: "platform" | "daily"
}

const footerCopy = {
  en: {
    brandCaption: "Iconic platform signature",
    description: "Launch OS for execution tools, premium assets, product kits and delivery.",
    footerLinks: [
      { href: "https://volynx.world/products/", label: "Products", external: true },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/purchases", label: "Purchases" },
      { href: "/daily", label: "Daily" },
      { href: propertyFlowUrl, label: "PropertyFlow", external: true },
      { href: "/icons-store", label: "Icons Store" },
      { href: "/demo/saas", label: "SaaS demo" },
      { href: "/demo/agency", label: "Agency demo" },
      { href: "/demo/portfolio", label: "Portfolio demo" }
    ],
    legalLinks: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refund", label: "Refunds" },
      { href: "/license", label: "License" },
      { href: "/cookies", label: "Cookies" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
      { href: "/about", label: "About" },
    ]
  },
  pt: {
    brandCaption: "assinatura icônica da plataforma",
    description: "Sistema de launch para execução, assets premium, kits de produto e entrega.",
    footerLinks: [
      { href: "https://volynx.world/products/", label: "Produtos", external: true },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/purchases", label: "Compras" },
      { href: "/daily", label: "Daily" },
      { href: propertyFlowUrl, label: "PropertyFlow", external: true },
      { href: "/icons-store", label: "Icons Store" },
      { href: "/demo/saas", label: "Demo SaaS" },
      { href: "/demo/agency", label: "Demo Agency" },
      { href: "/demo/portfolio", label: "Demo Portfolio" }
    ],
    legalLinks: [
      { href: "/terms", label: "Termos" },
      { href: "/privacy", label: "Privacidade" },
      { href: "/refund", label: "Reembolsos" },
      { href: "/license", label: "Licença" },
      { href: "/cookies", label: "Cookies" },
      { href: "/support", label: "Suporte" },
      { href: "/contact", label: "Contato" },
      { href: "/about", label: "Sobre" },
    ]
  }
} satisfies Record<SiteLocale, {
  brandCaption: string
  description: string
  footerLinks: Array<{ href: string; label: string; external?: boolean }>
  legalLinks: Array<{ href: string; label: string }>
}>

export function SiteFooter({ locale = "en", brand = "platform" }: SiteFooterProps) {
  const copy = footerCopy[locale]
  const isDaily = brand === "daily"
  const brandHref = isDaily ? "/daily" : (locale === "pt" ? "/?lang=pt" : "/")
  const brandLabel = isDaily ? "VOLYNX DAILY" : "VOLYNX OS"
  const brandCaption = isDaily ? "Personal execution OS" : copy.brandCaption
  const brandDescription = isDaily
    ? "Daily workspace for capture, planning, writing, decisions and follow-through."
    : copy.description
  const brandIcon = isDaily ? "/assets/brand/daily-icon.webp" : "/assets/brand/vx-new.webp"
  const brandIconAlt = isDaily ? "Volynx Daily icon" : "VOLYNX OS icon"

  return (
    <footer className="overflow-hidden border-t border-white/5 py-10">
      <div className="container-shell grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <Link href={brandHref} className="inline-flex items-center gap-5" aria-label={brandLabel}>
            <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(88,214,141,.16),transparent_60%),linear-gradient(145deg,rgba(9,13,25,.96),rgba(12,18,14,.92))] p-2 shadow-[0_24px_60px_rgba(0,0,0,.34)]">
              <Image
                src={brandIcon}
                alt={brandIconAlt}
                width={320}
                height={320}
                className="h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(88,214,141,.22)]"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold leading-none tracking-[0.3em] text-white md:text-xl">
                {brandLabel}
              </span>
              <span className="mt-2 block text-[11px] uppercase leading-none tracking-[0.28em] text-zinc-500">
                {brandCaption}
              </span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-zinc-500">
            {brandDescription}
          </p>
        </div>
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-5 lg:justify-end">
            {copy.footerLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {copy.legalLinks.map((item) => (
              <Link key={item.label} href={item.href} className="text-xs text-zinc-500 transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
