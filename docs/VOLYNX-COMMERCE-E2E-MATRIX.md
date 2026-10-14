# VOLYNX commerce E2E matrix

This is the release checklist for payment → webhook → entitlement → delivery.
It is intentionally organized by fulfillment branch, not by the number of
Stripe prices. The live catalog currently contains several currencies for the
same offer, so repeating the same branch for every currency is unnecessary
unless currency-specific behavior changes.

## Automated read-only gate

Run:

```bash
npm run monetization:check:live
npm run commerce:e2e:check
```

The gate checks the live catalog, pending reconciliation actions, mapping
coverage in the webhook, delivery routes, and existing successful Checkout
Sessions. It never creates a product, Checkout Session, payment, entitlement,
or delivery record.

## Required representative tests

| Family | Representative test | Evidence to verify |
|---|---|---|
| Volynx subscription | Launch or Pro | `profiles.builder_plan`, `subscriptions`, `purchase_events` |
| Higher Volynx tier | Studio or Teams | correct rank and access limits |
| Daily/CVitae | one product-specific subscription | corresponding profile field and access |
| Bundle | one bundle | both product entitlements and `active_bundles` |
| Dev Journey | Pro or Bundle | `profiles.devjourney_tier`, email/onboarding |
| Tokens | one token pack | atomic balance credit and `token_transactions` |
| Icons | one current single or pack | `addons_purchased`, signed URL, downloadable asset |
| Kit | one current kit tier | `addons_purchased`, project/preset, ZIP URL, email |
| PropertyFlow | one current tier | `addons_purchased`, signed ZIP URL, email |
| Subscription lifecycle | Test Clock | renewal, cancellation, failed payment, downgrade |

The existing R$0.50 `checkout_smoke_test` proves the live Checkout and
`checkout.session.completed` path, but it is not an entitlement or delivery
test. It must remain separate from the product-family matrix.

The private R$0.50 `pf_starter_e2e_brl` offer is the representative
PropertyFlow delivery test. It is intentionally absent from public pricing.
Checkout canonicalizes it to `pf_starter`. Two real purchases on 2026-09-17
and 2026-09-28 each produced a completed `purchase_events` row, an active
Starter entitlement, a published three-template workspace, and a signed
`v1.1.0` ZIP URL. This is payment → entitlement → workspace → link issuance
proof. It is not evidence of an opened ZIP, delivered email, or the later
`v1.1.3` recovery/download path. Do not repeat the charge just to recreate
already verified checkout evidence. If a new controlled test is explicitly
needed, start it only from the internal URL below while authenticated:

```text
https://volynx.world/checkout/?lookup_key=pf_starter_e2e&currency=brl&next=/products/propertyflow/
```

## Safety boundary

Do not create a public “all products” combo. The current Checkout path is
single-offer oriented, and a mixed cart requires explicit multi-line-item
fulfillment and idempotency handling. Any future internal rehearsal must be
admin-only, non-discoverable, and must not change the public catalog.
