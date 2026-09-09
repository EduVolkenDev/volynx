# Universal Commerce Core architecture

## Product direction

`@volynx/commerce-core` is the reusable commerce engine. VOLYNX is its first
tenant and reference implementation, not a dependency of the engine.

The product should be sellable as an adaptable system for companies selling:

- recurring subscriptions;
- one-time digital products;
- bundles and tier upgrades;
- files, licenses, URLs, workspace access, or manual services;
- credits, quotas, and feature entitlements.

## Layers

| Layer | Responsibility | Brand-specific? |
|---|---|---|
| Core domain | offers, prices, payment events, entitlements, deliveries, idempotency contracts | No |
| Provider adapters | Stripe or another processor, database, storage, email | No, configured |
| Tenant configuration | catalog, currencies, domains, brand, return origins | Yes |
| Product integrations | builder, course, SaaS, file delivery, CRM, fulfillment jobs | Yes |
| Admin and storefront UI | pricing, checkout entry, delivery center, reporting | Theme/configurable |

## Non-negotiable design rules

1. Payment confirmation is not entitlement confirmation.
2. Every paid event is idempotent by provider and event id.
3. Every offer declares its fulfillment contract before it can be published.
4. The public catalog never exposes internal test offers.
5. Tenant data, secrets, branding, and product rules stay outside the core.
6. Live payment changes require a separate release and evidence trail.

## Migration sequence

1. Keep the current VOLYNX path unchanged.
2. Map the current catalog into the provider-neutral `OfferDefinition` contract.
3. Add Stripe, Supabase, Storage, and email adapters.
4. Run shadow validation against representative events without granting access.
5. Migrate one low-risk one-time offer in staging.
6. Migrate subscriptions and bundles after lifecycle tests pass.
7. Package tenant configuration, admin UI, onboarding, and documentation for sale.

## First commercial packaging

The initial sellable version should be a hosted or self-hosted Commerce Core,
not a promise of infinite integrations. It should include:

- catalog and price management;
- Stripe checkout and webhook adapter;
- entitlement and delivery ledger;
- signed-file delivery adapter;
- transactional email adapter;
- admin audit trail and basic analytics;
- tenant onboarding and configuration validation.

More integrations can be added behind adapter interfaces without changing the
domain model.
