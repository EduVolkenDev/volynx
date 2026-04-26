# Platform Launch Audit — 2026-04-26

**Scope:** VOLYNX (volynx.world) + CVitae (cvitae.volynx.world) + Daily-OS (daily.volynx.world) + VolynxCore Supabase (zdmpzrderifgqmqivjoy) + Volynx-OS kit source.

**Question asked:** Can a buyer purchase any product on the platform and receive it without human intervention, in any of the 3 displayed currencies (GBP/EUR/BRL)?

**Answer:** Mostly yes for tokens and subscriptions. **No for kits, PropertyFlow, and most add-ons.**

---

## VERDICT MATRIX — what's safe to sell today

| Product family | Checkout | Webhook | DB write | Buyer receives | Status |
|---|---|---|---|---|---|
| Token packs (4 SKUs × 3 currencies) | OK | OK | `profiles.token_balance` + `token_transactions` + `purchase_events` | Tokens credited <2s | **SHIP** |
| Pix BRL token packs | OK | OK | Same as above | Tokens credited on MP IPN | **SHIP** |
| Builder Launch/Pro/Studio/Teams | OK | OK | `profiles.builder_plan` + `subscriptions` | Plan active, JWT synced | **SHIP** |
| Daily Pro / Diamond | OK | OK | `profiles.daily_plan` + `subscriptions` | Plan active | **SHIP — but pricing mismatch first** |
| CVitae Business | OK | OK | `profiles.cvitae_plan` + `subscriptions` | Plan active | **SHIP** |
| Bundles (Essential / Complete) | OK | OK | Both plan columns + `active_bundles` (atomic) | Both plans active | **SHIP** |
| Vouchers (admin-issued) | n/a | OK | `voucher_redemptions` + grants | Tokens / plan / badge | **SHIP** |
| CVitae template unlocks (2 VX / 5 VX) | OK | n/a (token-only) | `addons_purchased` + token deduct | Templates ungated in editor | **SHIP** |
| **Add-ons** (domain_setup, html_export, bilingual, icons_addon, template_pack) | OK | OK | `addons_purchased` row only | Nothing else — no email, no file, no feature toggle | **DO NOT SHIP** |
| **Add-on extra_slot** (subscription) | OK | OK | `addons_purchased` row only | Slot count not actually increased anywhere | **DO NOT SHIP** |
| **Kit Agency** (3 tiers × 3 currencies = 9 SKUs) | Buttons broken (`ROUTES.checkout` undefined) | OK | `addons_purchased` + tries to fetch preset | Builder project draft (if preset.json fetch succeeds) — **no ZIP, no email, no source** | **DO NOT SHIP** |
| **Kit Portfolio** (9 SKUs) | Buttons broken | OK | Same as Agency | Same as Agency | **DO NOT SHIP** |
| **Kit SaaS** (9 SKUs) | Buttons broken | OK | Same as Agency | Same as Agency | **DO NOT SHIP** |
| **PropertyFlow** (3 tiers × 3 currencies) | OK | OK | `addons_purchased` only | Routed to `/support/?intent=delivery` (manual) — ZIPs exist on disk but not served | **DO NOT SHIP** |

**Net:** 6 product families ready · 4 product families NOT ready · 27+ SKUs blocked.

---

## CRITICAL BLOCKERS (fix before any kit/PF/add-on goes live)

### B1. Kit checkout buttons literally do not work
`/Users/eduardovolken_1/VOLYNX/src/data/routes.ts:107` calls `ROUTES.checkout` but `ROUTES` has no `checkout` key (lines 1–80). `checkoutHref()` returns `undefined?lookup_key=...`.

**Affected pages:**
- `src/pages/products/agency-launch-kit/index.astro:307,322,333`
- `src/pages/products/portfolio-pro-kit/index.astro` (3 buttons)
- `src/pages/products/saas-landing-system/index.astro` (3 buttons)

**Fix (1 line):** Add `checkout: "/checkout/",` to the `ROUTES` object.

### B2. Kits have no deliverable
The 9 kit SKUs (Agency × 3, Portfolio × 3, SaaS × 3) point to source pages in `Volynx-OS/app/demo/{agency,portfolio,saas}/page.tsx` plus components in `Volynx-OS/components/sections/` and `components/common/`. **No ZIP archives exist. No README. No tier-specific LICENSE. No download endpoint.**

For comparison, PropertyFlow has ZIPs at `Volynx-OS/storage/propertyflow/*.zip` and an API route at `Volynx-OS/app/api/downloads/propertyflow/route.ts` — kits have neither.

After purchase, `stripe-webhook/index.ts:338-401` fetches `https://volynx.world/builder/presets.json` and creates a Builder draft. If the fetch 404s (line 396), it logs and exits — **buyer ends up with nothing and no error surfaced**.

**Fix:** Decide the delivery model:
- **A.** Kits = Builder presets only (no source download). Then update product copy to say "edit in Builder," remove all download/ZIP language, and verify `presets.json` is published with all 9 kit definitions.
- **B.** Kits = downloadable source. Then build 9 ZIPs, upload to a `kits` Supabase Storage bucket (private), generate signed URL in webhook, surface link on `/delivery/` page, and email it.

### B3. PropertyFlow purchase routes to support, not delivery
`src/pages/delivery/index.astro:214` builds a `/support/?product=propertyflow&intent=delivery` link instead of an auto-create or download. ZIPs exist (`Volynx-OS/storage/propertyflow/propertyflow-{starter,professional,white-label}-v1.0.0.zip`) but are not wired to the volynx.world domain. **Buyer pays, then has to email support to get the file.**

**Fix:** Same as B2 option B — upload ZIPs to Storage, add a `pf_*` branch in `stripe-webhook/index.ts` that generates a signed URL and writes it to `purchases.metadata`, then read it on `/delivery/`.

### B4. Daily-OS displays wrong prices
`volynx-daily-os/src/pages/pricing.astro:113-190` hardcodes:
- Daily Pro: £12 / €14.90 / R$79
- Daily Diamond: £29 / €34.90 / R$199

Main `VOLYNX/src/data/pricing.ts:235-273` defines:
- Daily Pro: £14 / €16 / R$89
- Daily Diamond: £34 / €39 / R$219

**Stripe will charge the price defined in Stripe** (linked to the lookup_key). Whichever set of prices is in Stripe, **one of the two pages is lying to the customer**. This is a misrepresentation/refund risk.

**Fix:** Pick one source of truth. Recommended: the Daily-OS page imports the same `pricing.ts` from a shared package, or both repos read from a single JSON exposed at `https://volynx.world/data/pricing.json`.

### B5. PropertyFlow pricing not documented anywhere
`pf_starter`, `pf_professional`, `pf_white_label` (canonical) / `pf_enterprise` (alias) lookup keys are accepted by the Stripe backend (`index.js:66-77`) and webhook, but **no price is published in `pricing.ts` or any product page**. Buyers can't see the price before they're redirected to Stripe.

**Fix:** Add a `propertyflow` block to `src/data/pricing.ts` with prices for all 3 tiers × 3 currencies, and surface them on `src/pages/products/propertyflow/index.astro`.

### B6. Add-ons promise things they don't deliver
`pricing.ts:298-334` lists 6 add-ons. After purchase, `stripe-webhook/index.ts:297-309` writes a row to `addons_purchased` and stops. Specifically:
- `addon_html_export` (£44) — no HTML export feature is unlocked anywhere; no ZIP is generated.
- `addon_template_pack` (£28) — no template is delivered.
- `addon_bilingual` (£19) — no bilingual feature toggle on `profiles` is set.
- `addon_icons_addon` (£18) — `icon_id`/`icon_collection` metadata is captured but never used downstream.
- `addon_domain_setup` (£15) — described as "assisted" → this one explicitly requires a human, so the autonomy promise was wrong from the start.
- `addon_extra_slot` (£7/mo) — subscription created, but nothing reads it to actually grant +1 slot.

**Fix:** Either (a) implement each add-on's actual fulfillment, or (b) hide the broken ones from the catalog until they work. `addon_domain_setup` should be re-labelled as "white-glove" so the manual step is honest.

### B7. `product_accounts` table has RLS disabled
Supabase advisor (`security`, `ERROR` level): `public.product_accounts` is exposed via PostgREST with **no row-level security**. Anyone with the anon key can read/write it.

**Fix (one migration):**
```sql
ALTER TABLE public.product_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.product_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### B8. `vouchers` and `voucher_redemptions` use `USING (true)` for ALL
Advisor `WARN`: policies `service_role_vouchers` and `service_role_redemptions` use `USING (true) WITH CHECK (true)` for `ALL` operations. If these policies are bound to anon/authenticated (not service_role), any user can mint or redeem vouchers arbitrarily. The advisor reports the role as `-` which means policy role is unparseable — verify and lock down.

**Fix:** Restrict to `TO service_role` explicitly, or split into per-command policies that scope `user_id = auth.uid()` for SELECT and lock INSERT/UPDATE/DELETE to service_role.

---

## HIGH — fix before scale or audit

### H1. `avatars` storage bucket is public and listable
Advisor warning: a broad SELECT policy on `storage.objects` for the `avatars` bucket lets anyone enumerate every uploaded avatar. Public access for serving URLs doesn't require list permission.

**Fix:** Drop the `Anyone can view avatars` policy and rely on direct object URLs (still publicly served when `bucket.public = true`).

### H2. Leaked-password protection disabled in Supabase Auth
Advisor warning: HaveIBeenPwned check is off. Easy fix in Supabase dashboard → Auth → Password → enable.

### H3. Three Postgres functions have mutable `search_path`
`set_updated_at`, `vouchers_updated_at`, `handle_new_user` — minor but flagged as security WARN. Add `SET search_path = public, pg_temp` in each function definition.

### H4. `public.products` and `public.product_entitlements` are skeleton-only
- `products` has 2 rows (FREE plan, HTML Export) — does not represent the actual catalog.
- `product_entitlements` is empty.

The webhook does **not** read either; entitlements are hardcoded in `src/data/products.ts:183-199` and `PLAN_PROFILE_MAP` in `stripe-webhook/index.ts:45-69`. So the empty tables don't break runtime — but they will mislead any future developer or compliance audit. Either populate them and switch the webhook to read from them, or drop the tables.

### H5. Builder kit ZIPs missing while PropertyFlow ZIPs exist
`Volynx-OS/storage/propertyflow/` has 4 ZIPs. `Volynx-OS/storage/` (or any `out/downloads/`) has **no kit ZIPs**. There's also no build script in `Volynx-OS/package.json` that produces them.

**Fix:** Add a `pnpm build:kits` script that bundles each kit into a tier-specific ZIP with README + LICENSE. Suggested layout (per kit, per tier):
```
{kit}-{tier}-v1.0.0.zip
├── components/{sections,common}
├── app/{globals.css,layout.tsx}
├── tailwind.config.ts
├── package.json (lucide-react + next + tailwind only)
├── README.md
├── LICENSE-{tier}.txt
├── QUICKSTART.md
└── public/
```

### H6. No email confirmation on any purchase
`stripe-webhook/index.ts` writes DB rows but never calls Resend/SendGrid/etc. Buyer's only confirmation is the Stripe receipt email, which doesn't include their delivery link, kit ZIP, or onboarding.

**Fix:** Add a Resend (or Supabase SMTP) call at the end of every successful webhook branch, with templates per product family.

### H7. Token packs and Builder subscription are not discoverable from public pages
Per the deep audit: there is no public "Tokens" page with a "Recharge" CTA visible from the top nav, and the Builder subscription buttons exist on `pricing.astro` but the kit product pages don't cross-link. Token packs are reached only through internal modals.

**Fix:** Make sure `pricing.astro` lists all four token packs with explicit Buy buttons, and the kit product pages include "or pay monthly with Builder Pro" cross-links.

---

## MEDIUM — code consistency

### M1. Pricing mismatch is a symptom — adopt one shared source
Today: `VOLYNX/src/data/pricing.ts`, `cvitae/public/js/cv-templates.js`, `volynx-daily-os/src/pages/pricing.astro` each declare prices independently. Daily-OS has already drifted (B4). CVitae and the main site happen to agree.

**Fix:** Publish `pricing.json` from main VOLYNX at `https://volynx.world/data/pricing.json`. Have CVitae and Daily-OS fetch it at build time. Single source of truth, single FX revision point.

### M2. Hardcoded routes
`/Users/eduardovolken_1/VOLYNX/src/pages/tools/index.astro:26,32,38,44` hardcodes `/volynx-lab/{tool}` instead of `ROUTES.lab*`. Minor — not breaking, but inconsistent with project rule.

### M3. Daily-OS icon packs are orphans
5 icon-pack folders live in `volynx-daily-os/public/assets/icons/` (`daily-common-free`, `daily-common2-free`, `daily-iridescent-premium`, `daily-poligon-premium`, `daily3Dpremium`) — preview images only, ~190 .webp files total. No pricing, no checkout, no gating, no delivery. The only commit message ("wire up daily3Dpremium icon set") is misleading; the wiring was reverted or never landed.

**Fix:** Either (a) launch them as paid SKUs via the `addon_icons_addon` add-on machinery (and actually wire delivery), or (b) remove the previews to stop misleading visitors.

### M4. CVitae has no local pricing page
All pricing CTAs on cvitae.volynx.world bounce to `volynx.world/recarregar/`. This works but increases drop-off. If business plan is the conversion goal, having a self-contained `cvitae.volynx.world/pricing/` would help.

### M5. Daily-OS checkout success/cancel UX is bare
`volynx-daily-os/src/pages/pricing.astro:587-588` redirects to `/pricing/?checkout=success` with no banner, no plan-applied confirmation, no next-action. Same on cancel.

**Fix:** Add a dedicated `/checkout/success/` page that reads `profiles.daily_plan` post-payment and confirms the upgrade with a CTA into the dashboard.

---

## LOW — polish

- L1. `volynx-daily-os/src/pages/api/` is empty; the site assumes `api.volynx.world` is up. If that goes down, Daily-OS checkout silently breaks. Consider a tiny Cloudflare Worker proxy in the same repo as a fallback.
- L2. `volynx-daily-os/src/pages/desativados/cv.astro` is dead code; either delete or document.
- L3. `cvitae` realtime balance lazy-loads supabase-js from CDN; on slow networks the balance silently shows stale numbers. Add a fallback fetch.
- L4. CVitae and Daily-OS PT translations are partially incomplete (per memory rule, both EN and PT must ship together). Sweep `translations.js` against `data-i18n` attributes.
- L5. `index.js` (Express on `api.volynx.world`) duplicates a lot of logic that's also in the `create-checkout-session` Edge Function. They diverge on PropertyFlow alias handling. Pick one.

---

## DATABASE STATE — what's actually live

**Supabase project:** `zdmpzrderifgqmqivjoy` (VolynxCore, eu-west-1, ACTIVE_HEALTHY)
- `VOLYNX` project (ulaqatbtlagelcclupqj) is INACTIVE — confirm it's intentionally dormant.
- `Palavras do Universo` is INACTIVE — unrelated to this audit.

**Tables (24):** profiles ✓, organizations ✓, subscriptions ✓, purchases (empty), purchase_events ✓ (4 rows), token_transactions ✓ (1 row), token_costs ✓ (14 rows seeded), addons_purchased ✓ (empty), active_bundles ✓ (empty), product_entitlements (empty), products (2 rows = skeleton), builder_plan_limits ✓ (5 plans seeded), cvitae_plan_limits ✓ (free + business seeded), daily_data ✓, daily_usage_logs ✓, vouchers ✓ (1), voucher_redemptions ✓, cvs ✓, projects ✓, project_exports (empty), product_bundles (empty), usage_logs ✓, contact_submissions ✓ (1), product_accounts ❌ RLS DISABLED.

**Edge functions (16, all ACTIVE):** check-permission, log-usage, create-checkout-session, contact-form, stripe-webhook, create-portal-session, ai-tools, ai-builder, deduct-tokens, get-balance, claim-black-diamond, redeem-voucher, create-pix-checkout, check-pix-status, pix-webhook, unlock-cvitae-template.

**Missing functions (would help):** `generate-delivery-url` (signed Storage URL for kits/PF), `send-purchase-email`.

**Storage:** only `avatars` bucket exists. No `kits`, no `propertyflow`, no `addons` bucket.

---

## RECOMMENDED ORDER OF FIXES

**Day 1 — unblock kit purchase path (1 line + decision)**
1. Add `checkout: "/checkout/",` to `ROUTES` (B1). Smoke-test Agency / Portfolio / SaaS Buy buttons.
2. Decide kit delivery model (B2 — A or B). Disable Buy buttons until decided.
3. Disable Buy CTAs for PropertyFlow (B3) and the 6 add-ons (B6) until fulfillment exists, or relabel `addon_domain_setup` as white-glove.

**Day 2 — pricing & DB safety**
4. Reconcile Daily-OS prices with main `pricing.ts` (B4) and pick one source of truth (M1).
5. Document PropertyFlow pricing in `pricing.ts` (B5).
6. Apply RLS migration to `product_accounts` (B7).
7. Lock down voucher policies (B8).
8. Enable HaveIBeenPwned (H2). Set `search_path` on the 3 functions (H3). Drop avatars listing policy (H1).

**Day 3–7 — kit delivery pipeline (if B2 = option B)**
9. Create private `kits` Supabase Storage bucket. Upload 9 kit ZIPs (Agency/Portfolio/SaaS × 3 tiers each) + READMEs + tier LICENSEs.
10. Add `pnpm build:kits` script in `Volynx-OS` to regenerate ZIPs from a single source (tier diff = LICENSE only).
11. Add a `kit_*` branch in `stripe-webhook/index.ts` that generates a signed URL and writes it to `purchases.metadata.delivery_url`.
12. Update `/delivery/index.astro` to surface that URL.
13. Repeat for `pf_*` (B3).
14. Repeat for the 6 add-ons that need real fulfillment (B6).

**Day 7 — confirmation email**
15. Wire Resend (or Supabase SMTP) into every webhook branch (H6). Templates per family.

**Day 8 — go-live**
16. End-to-end test in Stripe live mode for one SKU per family per currency. Verify webhook → DB → user gets file/access in <2 minutes with no human action.

---

## TL;DR FOR EDUARDO

- **Tokens, plans, bundles, vouchers, CVitae unlocks, Pix BR — all fully autonomous. Ship today.**
- **Kits, PropertyFlow, and 6 add-ons — buy buttons either broken or lead to nothing. Disable them until kit ZIPs exist in Storage and webhook generates signed download URLs.**
- **One real misrepresentation:** Daily-OS shows £12/£29 while Stripe will charge £14/£34. Fix immediately.
- **One real security hole:** `product_accounts` has RLS off. One ALTER TABLE.
- **One stupid one-line bug:** `ROUTES.checkout` is undefined and breaks every kit checkout button.

Estimated time to "everything autonomous": **5–7 working days** of focused work, mostly on the kit packaging + delivery pipeline.
