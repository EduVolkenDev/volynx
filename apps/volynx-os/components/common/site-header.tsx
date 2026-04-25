import Link from "next/link"
import { BrandLockup } from "@/components/common/brand-lockup"
import { Button } from "@/components/common/button"
import { ThemeSwitcher } from "@/components/common/theme-switcher"
import { propertyFlowUrl, storeUrl } from "@/content/site"
import { type SiteLocale } from "@/lib/site-locale"

type SiteHeaderProps = {
  locale?: SiteLocale
  showLanguageToggle?: boolean
  languageHrefBase?: string
}

const headerCopy = {
  en: {
    brandCaption: "VX signature",
    purchases: "Purchases",
    language: "Language",
    nav: [
      { href: storeUrl, label: "Products", external: true },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/daily", label: "Daily" },
      { href: "/icons-store", label: "Icons" },
      { href: propertyFlowUrl, label: "PropertyFlow", external: true },
      { href: "/support", label: "Support" },
    ],
    mobileNav: [
      { href: storeUrl, label: "Products", external: true },
      { href: "/daily", label: "Daily" },
      { href: "/dashboard/purchases", label: "Purchases" },
      { href: "/support", label: "Support" },
    ]
  },
  pt: {
    brandCaption: "assinatura VX",
    purchases: "Compras",
    language: "Idioma",
    nav: [
      { href: storeUrl, label: "Produtos", external: true },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/daily", label: "Daily" },
      { href: "/icons-store", label: "Icons" },
      { href: propertyFlowUrl, label: "PropertyFlow", external: true },
      { href: "/support", label: "Suporte" },
    ],
    mobileNav: [
      { href: storeUrl, label: "Produtos", external: true },
      { href: "/daily", label: "Daily" },
      { href: "/dashboard/purchases", label: "Compras" },
      { href: "/support", label: "Suporte" },
    ]
  }
} satisfies Record<SiteLocale, {
  brandCaption: string
  purchases: string
  language: string
  nav: Array<{ href: string; label: string; external?: boolean }>
  mobileNav: Array<{ href: string; label: string; external?: boolean }>
}>

function localeHref(baseHref: string, locale: SiteLocale) {
  return locale === "pt" ? `${baseHref}?lang=pt` : baseHref
}

export function SiteHeader({
  locale = "en",
  showLanguageToggle = false,
  languageHrefBase = "/"
}: SiteHeaderProps) {
  const copy = headerCopy[locale]

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-xl">
      <div className="container-shell flex h-18 items-center justify-between py-4">
        <BrandLockup href={showLanguageToggle ? localeHref(languageHrefBase, locale) : "/"} size="sm" caption={copy.brandCaption} priority />

        <nav className="hidden items-center gap-7 md:flex">
          {copy.nav.map((item) => (
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
        </nav>

        <div className="flex items-center gap-3">
          {showLanguageToggle ? (
            <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1" aria-label={copy.language}>
              {(["en", "pt"] as const).map((language) => {
                const active = language === locale

                return (
                  <Link
                    key={language}
                    href={localeHref(languageHrefBase, language)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-9 min-w-11 items-center justify-center rounded-md px-3 text-xs font-semibold tracking-[0.22em] transition ${
                      active ? "bg-white text-black" : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {language.toUpperCase()}
                  </Link>
                )
              })}
            </div>
          ) : null}
          <ThemeSwitcher />
          <Button href="/dashboard/purchases" className="hidden md:inline-flex">
            {copy.purchases}
          </Button>
        </div>
      </div>
      <nav className="container-shell flex gap-2 overflow-x-auto border-t border-white/5 pb-3 md:hidden">
        {copy.mobileNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
