/**
 * VOLYNX — Central Route Map
 * Every internal link in the platform MUST use this file.
 * No hardcoded paths anywhere else.
 */

export const ROUTES = {
  // ── Core ──────────────────────────────
  home: "/",
  platform: "/platform/",
  about: "/about/",
  contact: "/contact/",
  support: "/support/",
  pricing: "/pricing/",
  docs: "/docs/",
  manifesto: "/manifesto/",
  changelog: "/changelog/",
  status: "/status/",

  // ── Auth ──────────────────────────────
  login: "/login/",
  signup: "/signup/",
  authConfirm: "/auth/confirm/",
  authRecover: "/auth/recover/",

  // ── Account ───────────────────────────
  account: "/account/",
  profile: "/profile/",
  profileQrCodes: "/profile/qr-codes/",
  recarregar: "/recarregar/",
  delivery: "/delivery/",
  checkout: "/checkout/",

  // ── Products ──────────────────────────
  products: "/products/",
  agencyKit: "/products/agency-launch-kit/",
  agencyKitPreview: "/products/agency-launch-kit/preview/",
  portfolioKit: "/products/portfolio-pro-kit/",
  portfolioKitPreview: "/products/portfolio-pro-kit/preview/",
  saasSystem: "/products/saas-landing-system/",
  saasSystemPreview: "/products/saas-landing-system/preview/",
  propertyflow: "/products/propertyflow/",
  iconsStore: "/products/volynx-icons-store/",
  landingExpress: "/products/saas-landing-system/",

  // ── Services ──────────────────────────
  services: "/services/",
  maintenance: "/maintenance/",

  // ── Dev Hub ───────────────────────────
  devHub: "/dev-hub/",
  builder: "/builder/",
  builderLegacy: "/builder/",  // alias for backwards-compat (unified into /builder/)
  dashboard: "/dashboard/",
  purchases: "/dashboard/purchases/",
  propertyflowDelivery: "/dashboard/purchases/propertyflow",
  iconsDelivery: "/dashboard/purchases/icons",
  kitsDelivery: "/dashboard/purchases/kits",

  // ── Lab (Free) ────────────────────────
  lab: "/volynx-lab/",
  labConverter: "/volynx-lab/converter/",
  labImageScaler: "/volynx-lab/image-scaler/",
  labImageSuite: "/volynx-lab/image-suite/",
  labQrGen: "/volynx-lab/qr-gen/",

  // ── Studio (Pro) — unified into Lab; aliases kept for backwards-compat ──
  studio: "/volynx-lab/",
  studioConverter: "/volynx-lab/converter/",
  studioImageScaler: "/volynx-lab/image-scaler/",
  studioImageSuite: "/volynx-lab/image-suite/",
  studioQrGen: "/volynx-lab/qr-gen/",

  // ── VIP / Vouchers ──────────────────
  activate: "/activate/",
  blackDiamond: "/invite/black-diamond/",

  // ── Admin (gated by profiles.is_admin) ───
  adminCodes: "/admin/codes/",
  adminVouchers: "/admin/codes/?tab=vouchers",
  adminQrCodes: "/admin/codes/?tab=qr",

  // ── Campaign landings ─────────────────
  tiktokLanding: "/tiktok/",

  // ── Other ─────────────────────────────
  launch2026: "/launch-2026/",
  devJourney: "/dev-journey/",
  devJourneyStudent: "/dev-journey/student/",
  devJourneyChecklist: "/dev-journey/checklist/",
  devJourneySubmit: "/dev-journey/submit/",
  devJourneyVerify: "/dev-journey/verify/",
  tools: "/tools/",

  // ── Legal ─────────────────────────────
  privacy: "/privacy/",
  terms: "/terms/",
  disclaimer: "/disclaimer/",

  // ── Ecosystem (subdomains) ────────────
  cvitae: "https://cvitae.volynx.world",
  daily: "https://daily.volynx.world",

  // ── External ──────────────────────────
  whatsapp: "https://wa.me/447577991080",
  email: "mailto:hello@volynx.world",
} as const;

export type RouteKey = keyof typeof ROUTES;

export function checkoutHref(
  lookupKey: string,
  options?: {
    currency?: string;
    next?: string;
  },
) {
  const params = new URLSearchParams({ lookup_key: lookupKey });

  if (options?.currency) {
    params.set("currency", options.currency.toLowerCase());
  }

  if (options?.next) {
    params.set("next", options.next);
  }

  return `${ROUTES.checkout}?${params.toString()}`;
}
