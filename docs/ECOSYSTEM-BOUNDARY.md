# Volynx Ecosystem Boundary

`VOLYNX` is the main repo and source of truth for the platform.

Inside it, `apps/volynx-os` is the internal operational workspace that feeds the public platform.

## VOLYNX owns

- storefront pages
- product marketing
- pricing and CTA surfaces
- public previews and merchandising assets
- customer-facing browsing, account and support experience
- checkout entrypoints and post-purchase routing

## apps/volynx-os owns

- product operational source of truth
- Builder supply layer
- product manifests, protected docs and delivery rules
- private bundles and download entitlement logic
- reusable internal templates that feed the platform

## Product rule

- The public product page, preview and commercial promise live in `VOLYNX`
- The protected operational payload lives in `apps/volynx-os`

That means:

- public copy, launch framing and sales CTA stay here
- tier manifests, delivery docs, ZIP metadata and protected delivery stay in `apps/volynx-os`

## Repository rule

- New platform work should happen in this monorepo so public and operational layers stay aligned.
- The old standalone `Volynx-OS` repo is legacy migration residue, not the primary repo for active changes.

## Guardrail

If the file's job is to sell, preview or route the customer, keep it in `VOLYNX`.

If the file's job is to feed, validate, deliver or operate the product, move it to `apps/volynx-os`.
