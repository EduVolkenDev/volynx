# PropertyFlow — Tier Configuration (for Codex / implementation)

This document is the technical source of truth for how PropertyFlow differentiates between the three purchase tiers at build and runtime. **Everything here is automated — no manual intervention, no human-in-the-loop steps.**

---

## 1. Tier enum

Single source of truth:

```ts
// config/tiers.ts
export type Tier = "starter" | "professional" | "white-label";

export const TIER_CONFIG = {
  starter: {
    id: "starter",
    label: "Starter",
    priceGBP: 187,
    priceEUR: 217,
    priceBRL: 1290,
    stripeProductId: "prod_SRxxxStarter",
    features: STARTER_FEATURES,
  },
  professional: {
    id: "professional",
    label: "Professional",
    priceGBP: 447,
    priceEUR: 519,
    priceBRL: 3090,
    stripeProductId: "prod_SRxxxPro",
    features: PROFESSIONAL_FEATURES,
  },
  "white-label": {
    id: "white-label",
    label: "White-Label",
    priceGBP: 897,
    priceEUR: 1039,
    priceBRL: 6190,
    stripeProductId: "prod_SRxxxWL",
    features: WHITE_LABEL_FEATURES,
  },
} as const;
```

---

## 2. Feature flags per tier

```ts
// config/features.ts

export const STARTER_FEATURES = {
  // Core (always on)
  catalogue: true,
  filters: true,
  i18n: true,
  responsive: true,

  // Data
  staticData: true,         // JSON file as source
  supabase: false,
  adminDashboard: false,

  // Display
  galleryModal: false,
  propertyDetailPage: "basic",  // simple, no modal

  // Capture
  enquiryForm: false,

  // Templates (grid layouts)
  templates: ["classic", "magazine", "compact"],  // 3 of 15
  templateLock: ["gallery-hero", "split-view", "masonry", /* ...9 more */],

  // Commercial
  whiteLabel: false,
  multiTenant: false,
  agencyDelivery: false,

  // Advanced
  analyticsModule: "basic",   // just page views
  crmIntegrations: [],
};

export const PROFESSIONAL_FEATURES = {
  ...STARTER_FEATURES,

  staticData: true,           // still available as fallback
  supabase: true,
  adminDashboard: true,

  galleryModal: true,
  propertyDetailPage: "full",

  enquiryForm: true,

  templates: [
    ...STARTER_FEATURES.templates,
    "gallery-hero", "split-view", "masonry"  // 6 of 15
  ],
  templateLock: [/* 9 White-Label-only templates */],

  agencyDelivery: true,       // deliver to 1 client as a service

  analyticsModule: "standard", // per-property metrics
  crmIntegrations: [],         // manual webhook config only
};

export const WHITE_LABEL_FEATURES = {
  ...PROFESSIONAL_FEATURES,

  templates: [
    ...PROFESSIONAL_FEATURES.templates,
    "editorial", "minimalist", "card-stack", "timeline",
    "map-first", "grouped", "story-mode", "showroom", "catalog"
    // 15 of 15
  ],
  templateLock: [],

  whiteLabel: true,
  multiTenant: true,
  agencyDelivery: true,        // unlimited clients

  analyticsModule: "advanced",  // per-tenant, per-agent, trends, exports
  crmIntegrations: ["hubspot", "pipedrive", "salesforce"],  // pre-wired
};
```

---

## 3. Runtime tier resolution

The tier is set once at build/deploy time via environment variable:

```bash
# .env.production
PROPERTYFLOW_TIER=starter        # or "professional" or "white-label"
```

At runtime:

```ts
// lib/tier.ts
import { TIER_CONFIG } from "@/config/tiers";

const tierId = import.meta.env.VITE_PROPERTYFLOW_TIER as Tier;
export const TIER = TIER_CONFIG[tierId];
export const FEATURES = TIER.features;

// usage anywhere:
import { FEATURES } from "@/lib/tier";

if (FEATURES.adminDashboard) {
  // render admin route
}

if (FEATURES.whiteLabel) {
  // strip VOLYNX attribution from footer
}
```

Single env var, everything downstream is derived. No tier-detection at runtime beyond reading this one value.

---

## 4. How tier gating works per feature

### 4.1 Routes

```ts
// router.tsx — conditional routes
import { FEATURES } from "@/lib/tier";

const routes = [
  { path: "/", element: <Home /> },
  { path: "/properties", element: <Listings /> },
  { path: "/properties/:id", element: <PropertyDetail /> },
];

if (FEATURES.adminDashboard) {
  routes.push(
    { path: "/admin", element: <AdminHome /> },
    { path: "/admin/properties", element: <AdminProperties /> },
    { path: "/admin/leads", element: <AdminLeads /> },
  );
}

if (FEATURES.multiTenant) {
  routes.push(
    { path: "/admin/tenants", element: <AdminTenants /> },
  );
}
```

### 4.2 UI components

Locked templates are shown with a lock icon + upgrade tooltip, not hidden:

```tsx
function TemplatePicker() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {ALL_TEMPLATES.map(t => {
        const locked = !FEATURES.templates.includes(t.id);
        return (
          <TemplateCard
            key={t.id}
            template={t}
            locked={locked}
            onClick={locked ? showUpgradeModal : () => selectTemplate(t.id)}
          />
        );
      })}
    </div>
  );
}
```

Upgrade modal CTAs link to **https://volynx.world/products/propertyflow/** with a `ref=inapp_upgrade_{tier}` query param for attribution.

### 4.3 Footer attribution

```tsx
// components/Footer.tsx
import { FEATURES } from "@/lib/tier";

export function Footer() {
  return (
    <footer>
      <p>© 2026 {BRAND.name}</p>
      {!FEATURES.whiteLabel && (
        <p>Built on <a href="https://volynx.world">VOLYNX PropertyFlow</a></p>
      )}
    </footer>
  );
}
```

### 4.4 Data layer

```ts
// lib/data.ts
import { FEATURES } from "@/lib/tier";

export async function getProperties(): Promise<Property[]> {
  if (FEATURES.supabase) {
    return supabase.from("properties").select().then(r => r.data ?? []);
  }
  // Starter: static JSON fallback
  const data = await import("@/data/properties.json");
  return data.default;
}
```

---

## 5. Build commands per tier

```bash
# Starter build (smallest bundle, no Supabase)
PROPERTYFLOW_TIER=starter npm run build

# Professional build
PROPERTYFLOW_TIER=professional npm run build

# White-Label build
PROPERTYFLOW_TIER=white-label npm run build
```

Tree-shaking strips features flagged `false`. Starter bundle should be ~40% smaller than White-Label.

**CI pipeline suggestion:**

```yaml
# .github/workflows/build-tiers.yml
jobs:
  build:
    strategy:
      matrix:
        tier: [starter, professional, white-label]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: PROPERTYFLOW_TIER=${{ matrix.tier }} npm run build
      - name: Package
        run: |
          cd dist
          zip -r ../propertyflow-${{ matrix.tier }}-v$(node -p "require('../package.json').version").zip .
      - uses: actions/upload-artifact@v4
        with:
          name: propertyflow-${{ matrix.tier }}
          path: propertyflow-${{ matrix.tier }}-*.zip
```

Three ZIPs produced per release, each named `propertyflow-{tier}-v{version}.zip`.

---

## 6. Delivery mapping (post-Stripe webhook)

```ts
// api/webhooks/stripe.ts
import { TIER_CONFIG } from "@/config/tiers";

async function handleStripeCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Resolve tier from Stripe product ID
  const productId = session.line_items.data[0].price.product;

  const tier = Object.values(TIER_CONFIG).find(
    t => t.stripeProductId === productId
  );

  if (!tier) throw new Error(`Unknown product: ${productId}`);

  // Record purchase
  await db.insert(addons_purchased).values({
    user_id: session.metadata.user_id,
    product: "propertyflow",
    tier: tier.id,
    stripe_session_id: session.id,
    purchased_at: new Date(),
    version: CURRENT_VERSION,
  });

  // Trigger automated onboarding sequence (no human in the loop)
  await scheduleOnboardingEmails(session.metadata.user_id, tier.id);

  // For White-Label, send Discord invite link
  if (tier.id === "white-label") {
    await sendDiscordInvite(session.metadata.user_email);
  }
}
```

---

## 7. Delivery page tier awareness

The delivery page (`/dashboard/purchases/propertyflow/`) renders tier-specific content:

```tsx
// pages/dashboard/purchases/propertyflow.tsx
import { TIER_CONFIG, type Tier } from "@/config/tiers";

export default function PropertyFlowDelivery({ purchase }: { purchase: Purchase }) {
  const tier = TIER_CONFIG[purchase.tier];

  return (
    <>
      <Hero tier={tier.label} />
      <MetaStrip
        tier={tier.label}
        license={tier.id === "white-label" ? "Agency · unlimited" : "Commercial · 1 org"}
        version={purchase.version}
        purchased={purchase.purchased_at}
      />
      <DownloadCard
        filename={`propertyflow-${tier.id}-${purchase.version}.zip`}
        downloadAction={() => requestSignedURL(purchase.id)}
      />
      <WhatsInside features={tier.features} />  {/* filters cards by tier */}
      {tier.id !== "starter" && <AdminSection />}
      {tier.id === "white-label" && <MultiTenantSection />}
      <DocsRow tier={tier.id} />  {/* links to tier-specific docs */}
      <SupportCard tier={tier.id} />  {/* different response SLA text */}
    </>
  );
}
```

---

## 8. Automated onboarding emails (no human intervention)

Three sequences, triggered by Stripe webhook:

```ts
// email/onboarding.ts
const SEQUENCES = {
  starter: [
    { delayHours: 0, template: "starter-welcome" },
    { delayHours: 2, template: "starter-delivery-check" },
    { delayHours: 48, template: "starter-customization-tips" },
    { delayDays: 7, template: "starter-review-request" },
  ],
  professional: [
    { delayHours: 0, template: "pro-welcome" },
    { delayHours: 2, template: "pro-delivery-check" },
    { delayHours: 24, template: "pro-supabase-walkthrough" },
    { delayDays: 3, template: "pro-admin-walkthrough" },
    { delayDays: 7, template: "pro-enquiries-tips" },
    { delayDays: 14, template: "pro-review-request" },
  ],
  "white-label": [
    { delayHours: 0, template: "wl-welcome-discord" },
    { delayHours: 2, template: "wl-brand-wizard" },
    { delayHours: 24, template: "wl-day-1-loom" },
    { delayDays: 2, template: "wl-migration-toolkit" },
    { delayDays: 4, template: "wl-first-tenant" },
    { delayDays: 7, template: "wl-crm-integrations" },
    { delayDays: 14, template: "wl-community-intro" },
    { delayDays: 30, template: "wl-review-request" },
  ],
};
```

Zero manual scheduling. Set once, runs forever.

---

## 9. Re-download + version updates

- `addons_purchased.version` updates when a new minor version ships *and* the user's tier is within its free-update window (see LICENSE section 7).
- Delivery page always serves the latest version the user has access to.
- Cron job nightly: re-build ZIPs for each tier at latest version, stage to storage.
- Signed URLs are generated on-demand (15-min TTL), never pre-generated.

---

## 10. Checklist for Codex

Before merging tier system changes:

- [ ] `VITE_PROPERTYFLOW_TIER` env var documented in `.env.example`
- [ ] Three CI matrix builds produce three distinct ZIPs
- [ ] Starter build bundle size < Professional < White-Label
- [ ] Starter build has no Supabase client imported (tree-shaking confirmed)
- [ ] Admin dashboard routes 404 on Starter build
- [ ] White-Label footer has no VOLYNX attribution when `whiteLabel: true`
- [ ] Locked templates show lock icon + upgrade modal, never crash
- [ ] Stripe webhook maps product IDs to tier correctly (smoke test all 3 tiers in test mode)
- [ ] Automated email sequences trigger at Stripe webhook, not at signup
- [ ] Delivery page gates content based on `addons_purchased.tier`

---

*This document is the contract between the commercial page, the Stripe setup, the codebase, and the delivery flow. Keep them in sync. If you change a price, a feature flag, or a Stripe product, update this file.*
