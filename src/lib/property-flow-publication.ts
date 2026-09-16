export type PropertyFlowPublicationMode = "volynx-subdomain" | "custom-domain" | "existing-site";
export type PropertyFlowDomainStatus = "not-configured" | "pending-dns" | "verified" | "published";

export const PROPERTY_FLOW_HOST = "volynx.world";

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "dashboard", "auth", "cdn", "mail", "status"]);

export function normalizePropertyFlowSubdomain(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

export function isPropertyFlowSubdomainAvailableFormat(value: unknown): boolean {
  const normalized = normalizePropertyFlowSubdomain(value);
  return normalized.length >= 3 && normalized.length <= 48 && !RESERVED_SUBDOMAINS.has(normalized);
}

export function normalizePropertyFlowDomain(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "www.").replace(/\.$/, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "").split(/[/?#]/, 1)[0].replace(/\.$/, "");
  }
}

export function isPropertyFlowCustomDomainFormat(value: unknown): boolean {
  const normalized = normalizePropertyFlowDomain(value);
  return normalized.length >= 4 && normalized.length <= 253 && normalized.includes(".") && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(normalized);
}

export function propertyFlowSubdomainUrl(subdomain: unknown): string {
  const normalized = normalizePropertyFlowSubdomain(subdomain);
  return normalized ? `https://${normalized}.${PROPERTY_FLOW_HOST}/` : "";
}

export function propertyFlowDomainUrl(domain: unknown): string {
  const normalized = normalizePropertyFlowDomain(domain);
  return normalized ? `https://${normalized}/` : "";
}

export function propertyFlowPublicationFromSettings(settings: Record<string, unknown> | undefined) {
  const root = settings?.property_flow;
  const publication = root && typeof root === "object" ? (root as Record<string, unknown>).publication : null;
  const value = publication && typeof publication === "object" ? publication as Record<string, unknown> : {};
  return {
    mode: (value.mode === "custom-domain" || value.mode === "existing-site" ? value.mode : "volynx-subdomain") as PropertyFlowPublicationMode,
    domainStatus: (value.domain_status === "pending-dns" || value.domain_status === "verified" || value.domain_status === "published" ? value.domain_status : "not-configured") as PropertyFlowDomainStatus,
    subdomain: normalizePropertyFlowSubdomain(value.subdomain),
    customDomain: normalizePropertyFlowDomain(value.custom_domain),
    integrationPath: value.integration_path === "embed" ? "embed" : "separate-site",
  };
}
