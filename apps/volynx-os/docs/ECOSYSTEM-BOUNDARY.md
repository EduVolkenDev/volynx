# Volynx Ecosystem Boundary

This repo is the operational layer of the Volynx ecosystem.

## VolynxOS owns

- Builder supply layer: kits, presets, manifests and launch logic
- Product operational source of truth: tiers, licenses, delivery docs and manifests
- Private delivery assets: ZIPs, protected downloads and entitlement checks
- Internal templates and structured content that feed platform products
- Shared operational assets needed to run products, not just market them

## VOLYNX owns

- Public storefront and navigation
- Product pages, pricing surfaces and marketing copy
- Public checkout entrypoints and customer-facing sales flows
- Public preview assets, screenshots and merchandising media
- Customer-facing browsing and account surfaces

## Current launch rule

- `VOLYNX` is the public home of PropertyFlow
- `VolynxOS` keeps the PropertyFlow operational payload:
  - tier definitions
  - protected docs
  - delivery logic
  - ZIP manifests and private bundles

To reduce duplication, `VolynxOS` should not act as a second public product page for PropertyFlow. Internal links that refer to the product page should point back to `https://volynx.world/products/propertyflow/`.

## Migration direction

These items should eventually become operational source of truth inside `VolynxOS`:

- CV / CVitae base templates
- icon catalog source data and pack metadata
- shared product manifests, licenses and delivery bundles

These items should stay in `VOLYNX`:

- public product storytelling
- sales screenshots and merchandising media
- public CTA flows and launch pages

## Guardrail

If a file exists mainly to sell a product, it belongs in `VOLYNX`.

If a file exists mainly to power, deliver, validate or feed a product, it belongs in `VolynxOS`.
