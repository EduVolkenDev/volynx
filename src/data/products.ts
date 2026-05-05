/**
 * VOLYNX — Multi-Product Catalog
 *
 * Single source of truth for all products, plans, pricing, entitlements,
 * bundles, and backward-compatibility mappings.
 *
 * product_key : volynx | daily | cvitae | bundle | volynxlab
 * plan_key    : {product}_{tier}  e.g. volynx_pro, daily_diamond
 * bundle key  : bundle_{product1}_{product2}_{tier}
 */

import type { Currency, Locale } from './pricing';

// ── Product keys ────────────────────────────────────────────

export type ProductKey = 'volynx' | 'daily' | 'cvitae' | 'bundle' | 'volynxlab';

export const PRODUCTS: Record<string, {
  key: ProductKey;
  name: Record<Locale, string>;
  tagline: Record<Locale, string>;
  profileField: string;
}> = {
  volynx: {
    key: 'volynx',
    name: { en: 'VOLYNX', pt: 'VOLYNX' },
    tagline: {
      en: 'Premium builder to launch and monetize today.',
      pt: 'Builder premium para lançar e vender hoje.',
    },
    profileField: 'builder_plan',
  },
  daily: {
    key: 'daily',
    name: { en: 'VOLYNX Daily', pt: 'VOLYNX Daily' },
    tagline: {
      en: 'The personal operating layer of your digital life.',
      pt: 'A camada pessoal do seu dia digital.',
    },
    profileField: 'daily_plan',
  },
  cvitae: {
    key: 'cvitae',
    name: { en: 'CVitae', pt: 'CVitae' },
    tagline: {
      en: 'AI-assisted CV building with guided sections, templates, and VX-powered exports.',
      pt: 'Criação de currículo com IA, seções guiadas, templates e exports com VX.',
    },
    profileField: 'cvitae_plan',
  },
  volynxlab: {
    key: 'volynxlab',
    name: { en: 'VOLYNX Lab', pt: 'VOLYNX Lab' },
    tagline: {
      en: 'Premium image & dev tools.',
      pt: 'Ferramentas premium de imagem e dev.',
    },
    profileField: 'plan', // existing tool-access tier
  },
};

// ── Plan tiers ──────────────────────────────────────────────

export interface PlanTier {
  product: ProductKey;
  tier: string;
  rank: number;
}

export const PLAN_TIERS: Record<string, PlanTier> = {
  // Volynx (Builder)
  volynx_free:   { product: 'volynx', tier: 'free',   rank: 0 },
  volynx_launch: { product: 'volynx', tier: 'launch', rank: 1 },
  volynx_pro:    { product: 'volynx', tier: 'pro',    rank: 2 },
  volynx_studio: { product: 'volynx', tier: 'studio', rank: 3 },
  volynx_teams:  { product: 'volynx', tier: 'teams',  rank: 4 },

  // Daily
  daily_free:    { product: 'daily', tier: 'free',    rank: 0 },
  daily_pro:     { product: 'daily', tier: 'pro',     rank: 1 },
  daily_diamond: { product: 'daily', tier: 'diamond', rank: 2 },

  // CVitae
  cvitae_free:     { product: 'cvitae', tier: 'free',     rank: 0 },
  cvitae_business: { product: 'cvitae', tier: 'business', rank: 1 },
};

export type PlanKey = keyof typeof PLAN_TIERS;

// ── Pricing (cents/pence) ───────────────────────────────────

type Amounts = Record<Currency, number>;

export const PLAN_PRICING: Record<string, {
  amounts: Amounts;
  billing: 'subscription' | 'one_time';
  interval?: 'month' | 'year';
}> = {
  // Volynx (mirror of scripts/stripe-catalog-setup.ts BUILDER_SUBS amounts)
  volynx_launch:  { amounts: { GBP: 1100,  EUR: 1300,  BRL: 6900  }, billing: 'subscription', interval: 'month' },
  volynx_pro:     { amounts: { GBP: 2400,  EUR: 2800,  BRL: 14900 }, billing: 'subscription', interval: 'month' },
  volynx_studio:  { amounts: { GBP: 5400,  EUR: 6300,  BRL: 34900 }, billing: 'subscription', interval: 'month' },
  volynx_teams:   { amounts: { GBP: 11800, EUR: 13800, BRL: 74900 }, billing: 'subscription', interval: 'month' },

  // Daily (mirror of DAILY_SUBS amounts)
  daily_pro:      { amounts: { GBP: 1400,  EUR: 1600,  BRL: 8900  }, billing: 'subscription', interval: 'month' },
  daily_diamond:  { amounts: { GBP: 3400,  EUR: 3900,  BRL: 21900 }, billing: 'subscription', interval: 'month' },

  // CVitae
  cvitae_business:{ amounts: { GBP: 1500,  EUR: 1800,  BRL: 9900  }, billing: 'subscription', interval: 'month' },

  // Bundles (real discount vs separate; mirror of BUNDLE_SUBS amounts)
  bundle_volynx_daily_pro:    { amounts: { GBP: 3500, EUR: 4100, BRL: 22900 }, billing: 'subscription', interval: 'month' },
  bundle_volynx_daily_studio: { amounts: { GBP: 8200, EUR: 9600, BRL: 54900 }, billing: 'subscription', interval: 'month' },
};

// ── Bundles ─────────────────────────────────────────────────

export interface BundleDef {
  plan_key: string;
  name: Record<Locale, string>;
  grants: { product: ProductKey; tier: string }[];
}

export const BUNDLES: Record<string, BundleDef> = {
  bundle_volynx_daily_pro: {
    plan_key: 'bundle_volynx_daily_pro',
    name: { en: 'VOLYNX + Daily Pro', pt: 'VOLYNX + Daily Pro' },
    grants: [
      { product: 'volynx', tier: 'pro' },
      { product: 'daily',  tier: 'pro' },
    ],
  },
  bundle_volynx_daily_studio: {
    plan_key: 'bundle_volynx_daily_studio',
    name: { en: 'VOLYNX Studio + Daily Diamond', pt: 'VOLYNX Studio + Daily Diamond' },
    grants: [
      { product: 'volynx', tier: 'studio' },
      { product: 'daily',  tier: 'diamond' },
    ],
  },
};

// ── Backward-compatibility mapping ──────────────────────────
// Old Stripe lookup prefixes → canonical plan_key

export const LEGACY_PREFIX_MAP: Record<string, string> = {
  builder_launch: 'volynx_launch',
  builder_pro:    'volynx_pro',
  builder_studio: 'volynx_studio',
  builder_teams:  'volynx_teams',
  studio_pro:     'volynx_pro',
};

// ── Daily tool quotas ───────────────────────────────────────

export const DAILY_QUOTAS: Record<string, Record<string, number>> = {
  free: {
    scanner: 5,
    summary: 5,
    vault: 20,     // items
    writing: 5,
    decision: 3,
  },
  pro: {
    scanner: -1,   // unlimited
    summary: -1,
    vault: -1,
    writing: -1,
    decision: -1,
  },
  diamond: {
    scanner: -1,
    summary: -1,
    vault: -1,
    writing: -1,
    decision: -1,
  },
};

// ── Entitlements per plan ───────────────────────────────────

export const ENTITLEMENTS: Record<string, string[]> = {
  // Volynx
  volynx_free:   ['builder_editor', 'builder_preview', '1_draft'],
  volynx_launch: ['builder_editor', 'builder_preview', 'builder_publish', '1_site', 'subdomain', 'basic_kits', 'basic_analytics'],
  volynx_pro:    ['builder_editor', 'builder_preview', 'builder_publish', '3_sites', 'custom_domain', 'remove_branding', 'premium_kits', 'icons_bonus', 'publish_priority'],
  volynx_studio: ['builder_editor', 'builder_preview', 'builder_publish', '10_sites', 'multi_domain', 'premium_kits_full', 'export_discount', 'advanced_analytics', 'icons_perks'],
  volynx_teams:  ['builder_editor', 'builder_preview', 'builder_publish', '25_sites', 'workspace', 'shared_assets', 'central_billing', 'icons_pool', 'priority_support'],

  // Daily
  daily_free:    ['daily_myday', 'daily_scanner_basic', 'daily_summary_basic', 'daily_vault_basic', 'daily_writing_basic', 'daily_decision_basic'],
  daily_pro:     ['daily_myday', 'daily_scanner_full', 'daily_summary_full', 'daily_vault_full', 'daily_writing_full', 'daily_decision_full', 'daily_sync', 'daily_export', 'daily_cloud'],
  daily_diamond: ['daily_myday', 'daily_scanner_full', 'daily_summary_full', 'daily_vault_full', 'daily_writing_full', 'daily_decision_full', 'daily_sync', 'daily_export', 'daily_cloud', 'daily_api', 'daily_priority', 'daily_shared_vaults', 'daily_team_notes', 'daily_analytics'],

  // CVitae
  cvitae_free:     ['cvitae_editor', 'cvitae_preview', 'cvitae_1_cv', 'cvitae_cloud_sync', 'cvitae_export_vx'],
  cvitae_business: ['cvitae_editor', 'cvitae_preview', 'cvitae_unlimited_cvs', 'cvitae_cloud_sync', 'cvitae_templates', 'cvitae_export_included'],
};

// ── Helpers ─────────────────────────────────────────────────

/** Resolve legacy Stripe prefix to canonical plan_key */
export function resolvePlanKey(stripeLookupPrefix: string): string {
  return LEGACY_PREFIX_MAP[stripeLookupPrefix] || stripeLookupPrefix;
}

/** Get product + tier info for a plan_key */
export function getPlanTier(planKey: string): PlanTier | null {
  const resolved = resolvePlanKey(planKey);
  return PLAN_TIERS[resolved] || null;
}

/** Returns the profile column updates for activating a plan or bundle */
export function getProfileUpdates(planKey: string): Record<string, string> {
  const resolved = resolvePlanKey(planKey);

  // Bundle — sets multiple product columns
  const bundle = BUNDLES[resolved];
  if (bundle) {
    const updates: Record<string, string> = { plan: 'pro' };
    for (const grant of bundle.grants) {
      const product = PRODUCTS[grant.product];
      if (product) updates[product.profileField] = grant.tier;
    }
    return updates;
  }

  // Single product plan
  const tier = PLAN_TIERS[resolved];
  if (!tier) return {};

  const product = PRODUCTS[tier.product];
  if (!product) return {};

  const updates: Record<string, string> = {
    [product.profileField]: tier.tier,
  };

  // Any paid subscription grants tool access
  if (tier.rank >= 1) {
    updates.plan = 'pro';
  }

  return updates;
}

/** Returns profile column updates for downgrading (cancellation/expiry) */
export function getDowngradeUpdates(planKey: string): Record<string, string> {
  const resolved = resolvePlanKey(planKey);

  const bundle = BUNDLES[resolved];
  if (bundle) {
    const updates: Record<string, string> = {};
    for (const grant of bundle.grants) {
      const product = PRODUCTS[grant.product];
      if (product) updates[product.profileField] = 'free';
    }
    return updates;
  }

  const tier = PLAN_TIERS[resolved];
  if (!tier) return {};

  const product = PRODUCTS[tier.product];
  if (!product) return {};

  return { [product.profileField]: 'free' };
}

/** Check if a lookup prefix is a subscription (vs one-time payment) */
export function isSubscriptionPrefix(prefix: string): boolean {
  const resolved = resolvePlanKey(prefix);
  // All plan subscriptions
  if (PLAN_TIERS[resolved] && PLAN_TIERS[resolved].rank >= 1) return true;
  // Bundles
  if (BUNDLES[resolved]) return true;
  // Legacy
  if (prefix === 'addon_extra_slot') return true;
  return false;
}
