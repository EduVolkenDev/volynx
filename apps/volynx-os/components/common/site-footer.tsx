import Link from "next/link"
import { BrandLockup } from "@/components/common/brand-lockup"
import { propertyFlowUrl } from "@/content/site"
import { type SiteLocale } from "@/lib/site-locale"

type SiteFooterProps = {
  locale?: SiteLocale
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

export function SiteFooter({ locale = "en" }: SiteFooterProps) {
  const copy = footerCopy[locale]

  return (
    <footer className="border-t border-white/5 py-10">
      <div className="container-shell grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <BrandLockup href={locale === "pt" ? "/?lang=pt" : "/"} size="md" caption={copy.brandCaption} />
          <p className="mt-2 text-sm text-zinc-500">
            {copy.description}
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
          <div className="flex flex-wrap gap-4 lg:justify-end">
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
