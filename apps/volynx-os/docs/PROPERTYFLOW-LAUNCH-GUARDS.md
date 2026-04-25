# VOLYNX launch guards

This repo now uses Next.js server routes for Stripe Checkout, protected ZIP delivery and the VOLYNX Daily tool layer. It is no longer a pure static export because paid digital delivery needs server-side verification.

## Checkout

- Route: `POST /api/checkout/propertyflow`.
- The public pricing buttons send `{ tier, currency }` to the checkout API.
- The checkout API creates a Stripe Checkout Session in `mode=payment` with tier, currency, version and filename metadata.
- Success URL: `/dashboard/purchases/propertyflow?session_id={CHECKOUT_SESSION_ID}&tier={tier}`.
- Run one low-value live purchase before launch and verify the receipt, webhook, purchase tier and delivery URL.

## Platform routes

- Public product catalog: `https://volynx.world/products/`.
- Local platform hub: `/dashboard`.
- Post-purchase hub: `/dashboard/purchases`.
- Support recovery hub: `/support`.
- Daily execution OS: `/daily`.

## Delivery

- Route: `/dashboard/purchases/propertyflow`.
- Preview mode: `/dashboard/purchases/propertyflow?tier=white-label&preview=1`.
- Production unlock requires a paid Stripe Checkout Session ID.
- The delivery client verifies entitlement with `GET /api/downloads/propertyflow/entitlement?session_id=...`.
- The download button calls `POST /api/downloads/propertyflow`, then opens the protected GET URL.
- ZIPs live in `storage/propertyflow`, not `public`, so they cannot be downloaded by guessing a public URL.
- Production rejects unpaid, incomplete, wrong-product, wrong-price and test-mode sessions.
- Webhook endpoint: `POST /api/webhooks/stripe`.
- Discount-safe entitlement: verification compares the catalog subtotal to the tier price, so a paid session with an allowed promotion code still unlocks delivery.

## Icons Store delivery

- Route: `/icons-store`.
- Checkout route: `POST /api/checkout/icons`.
- Delivery route: `/dashboard/purchases/icons`.
- The delivery API verifies a paid Stripe Checkout Session, detects the purchased pack from metadata or line item product data, then builds the icon ZIP from the stored pack files.
- Preview mode: `/dashboard/purchases/icons?pack=metal-blue-premium2&preview=1`.
- Production preview mode must stay disabled unless explicitly needed for a controlled support incident.

## VOLYNX Daily AI

- Daily UI route: `/daily`.
- Local capture route: `POST /api/daily/capture`.
- Output routes: `POST /api/daily/summary`, `/api/daily/writing`, `/api/daily/tasks`, `/api/daily/decision`.
- AI bridge: Supabase Edge Function `ai-tools`.
- Token flow: `/deduct-tokens`, optional `/check-permission` lite mode, then `/ai-tools`.
- No browser access token means local fallback only. Inputs must still be preserved locally.
- Launch smoke test: create one capture, one task, one summary, one writing draft and one decision with no token to confirm fallback does not break the page.

## Tier ZIPs

- `propertyflow-starter-v1.0.0.zip`: Starter README, license, setup/customization docs and local source placeholder.
- `propertyflow-professional-v1.0.0.zip`: Professional README, license, setup/customization/admin/Supabase docs and local source placeholder.
- `propertyflow-white-label-v1.0.0.zip`: White-Label README, license, tier config, all docs, tools/templates placeholders and local source placeholder.

The `propertyflow-complete-FINAL.zip` source package is stored in `storage/propertyflow` for audit and rebuilds.

## Required env vars

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DAILY_AI_FUNCTIONS_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `PROPERTYFLOW_ENABLE_PREVIEW_DOWNLOADS=false`
- `ICON_PACK_ENABLE_PREVIEW_DOWNLOADS=false`

## Final smoke checklist

- `/` loads.
- `/dashboard` loads.
- `/dashboard/purchases` loads.
- `/support` loads and links to Purchases.
- `/icons-store` loads and failed/cancelled checkout states are visible.
- `/dashboard/purchases/icons?pack=hyper-icons-premium&preview=1` loads in non-production preview.
- `/products/propertyflow` loads pricing and tier samples.
- `/dashboard/purchases/propertyflow?tier=white-label&preview=1` loads in non-production preview.
- `/daily` loads and local fallback preserves input when AI auth is missing.
