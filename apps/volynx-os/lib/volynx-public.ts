const FALLBACK_VOLYNX_PUBLIC_SITE_URL = "https://volynx.world"

export const volynxPublicSiteUrl = (
  process.env.NEXT_PUBLIC_VOLYNX_PUBLIC_SITE_URL || FALLBACK_VOLYNX_PUBLIC_SITE_URL
).replace(/\/+$/, "")

export function getVolynxPublicUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${volynxPublicSiteUrl}${normalizedPath}`
}

export function withQueryString(
  href: string,
  query: Record<string, string | string[] | undefined> = {}
) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) params.append(key, entry)
      }
      continue
    }

    if (value) {
      params.set(key, value)
    }
  }

  const search = params.toString()
  return search ? `${href}?${search}` : href
}

export function getPropertyFlowPublicUrl(query: Record<string, string | string[] | undefined> = {}) {
  return withQueryString(getVolynxPublicUrl("/products/propertyflow/"), query)
}
