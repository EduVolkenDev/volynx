/**
 * VOLYNX — Central Route Map
 * Every internal link in the platform MUST use this file.
 * No hardcoded paths anywhere else.
 */

export const ROUTES = {
  // ── Core ──────────────────────────────
  home: "/",
  about: "/about/",
  contact: "/contact/",
  pricing: "/pricing/",
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

  // ── Products ──────────────────────────
  products: "/products/",
  agencyKit: "/products/agency-launch-kit/",
  portfolioKit: "/products/portfolio-pro-kit/",
  saasSystem: "/products/saas-landing-system/",
  propertyflow: "/products/propertyflow/",
  iconsStore: "/products/volynx-icons-store/",

  // ── Services ──────────────────────────
  services: "/services/",
  landingExpress: "/services/landing-express/",
  maintenance: "/maintenance/",

  // ── Dev Hub ───────────────────────────
  devHub: "/dev-hub/",
  builder: "/builder/",
  builderLegacy: "/dev-hub/builder/",

  // ── Lab (Free) ────────────────────────
  lab: "/volynx-lab/",
  labConverter: "/volynx-lab/converter/",
  labImageScaler: "/volynx-lab/image-scaler/",
  labImageSuite: "/volynx-lab/image-suite/",
  labQrGen: "/volynx-lab/qr-gen/",

  // ── Studio (Pro) ──────────────────────
  studio: "/volynx-lab/studio/",
  studioConverter: "/volynx-lab/studio/converter/",
  studioImageScaler: "/volynx-lab/studio/image-scaler/",
  studioImageSuite: "/volynx-lab/studio/image-suite/",
  studioQrGen: "/volynx-lab/studio/qr-gen/",

  // ── VIP ──────────────────────────────
  blackDiamond: "/invite/black-diamond/",

  // ── Other ─────────────────────────────
  devJourney: "/dev-journey/",
  tools: "/tools/",

  // ── Legal ─────────────────────────────
  privacy: "/privacy/",
  terms: "/terms/",
  disclaimer: "/disclaimer/",

  // ── Ecosystem (subdomains) ────────────
  cvitae: "https://cvitae.volynx.world",
  daily: "https://daily.volynx.world",

  // ── External ──────────────────────────
  whatsapp: "https://wa.me/447438656769",
  email: "mailto:hello@volynx.world",
} as const;

export type RouteKey = keyof typeof ROUTES;
