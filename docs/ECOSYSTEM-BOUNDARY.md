# Volynx Ecosystem Boundary

This repo is the public-facing layer of the Volynx ecosystem.

## VOLYNX owns

- storefront pages
- product marketing
- pricing and CTA surfaces
- public previews and merchandising assets
- customer-facing browsing and account experience

## VolynxOS owns

- operational source of truth
- Builder supply layer
- product manifests, protected docs and delivery rules
- private bundles and download entitlement logic
- reusable internal templates that feed the platform

## PropertyFlow rule

- The public product page lives in `VOLYNX`
- The operational bundle logic lives in `VolynxOS`

That means:

- public copy, launch framing and sales CTA stay here
- tier manifests, delivery docs, ZIP metadata and protected delivery stay in `VolynxOS`

## Near-term migration targets into VolynxOS

- CV / CVitae base templates
- icons store source catalog and pack metadata
- shared operational manifests for product delivery

## Guardrail

If the file's job is to sell or present the product, keep it in `VOLYNX`.

If the file's job is to feed, validate, deliver or operate the product, move it to `VolynxOS`.
