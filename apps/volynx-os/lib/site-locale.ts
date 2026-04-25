export type SiteLocale = "en" | "pt"

function normalizeLocale(value?: string | null): SiteLocale | null {
  if (!value) return null

  const normalized = value.toLowerCase()

  if (normalized.startsWith("pt")) return "pt"
  if (normalized.startsWith("en")) return "en"

  return null
}

function firstValue(value?: string | string[] | null) {
  return Array.isArray(value) ? value[0] : value ?? null
}

export function resolveSiteLocale(
  requestedLocale?: string | string[] | null,
  acceptLanguageHeader?: string | null
): SiteLocale {
  const explicitLocale = normalizeLocale(firstValue(requestedLocale))

  if (explicitLocale) {
    return explicitLocale
  }

  const browserLocale = normalizeLocale(acceptLanguageHeader?.split(",")[0] ?? null)

  return browserLocale ?? "en"
}

export function documentLanguage(locale: SiteLocale) {
  return locale === "pt" ? "pt-BR" : "en"
}
