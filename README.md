# VOLYNX

VOLYNX is a proprietary digital ecosystem for people who want to build, operate and ship useful work.

The platform brings together products, browser-first tools, services, practical education and delivery paths in one ecosystem.

- Website: [volynx.world](https://volynx.world)
- Repository: [github.com/EduVolkenDev/volynx](https://github.com/EduVolkenDev/volynx)
- Local development: Astro + Express + Supabase + Stripe

## What lives in VOLYNX

- **VOLYNX Core** — the unified entry point and platform surface.
- **VOLYNX Lab** — browser tools for images, knowledge, QR projects and local-first workflows.
- **Builder and products** — sites, launch systems, kits, icons and professional delivery paths.
- **VOLYNX Education Lab** — practical learning designed around real work, not empty theory.
- **Dev Journey** — a guided programming path from the first HTML page to published project evidence.
- **Cheatcodes for Devs & Learners** — a growing public reference of mental models, debugging moves, checklists and technical boundaries.
- **VOLYNX OS** — internal operational workspace for manifests, protected documents, delivery rules and customer handoff.

## Repository source of truth

This repository is the primary checkout for `volynx.world`.

- `src/`, `public/`, `functions/`, `supabase/` and `index.js` own the public platform, static routes, server functions and customer-facing flows.
- `apps/volynx-os` is an internal operational workspace that feeds the platform with manifests, delivery rules, protected documents and ZIP payloads.
- `cloudflare/` contains separately deployed Cloudflare Worker surfaces and routing utilities.
- The old standalone `Volynx-OS` repository is a legacy copy during migration, not the source of truth for new platform work.

## Structure

```text
.
├── apps/volynx-os/     # Internal operations, delivery and protected product material
├── cloudflare/         # Separately deployed Worker routes and resolvers
├── functions/          # Platform middleware and server functions
├── public/             # Static assets, headers, redirects and public downloads
├── src/                # Astro pages, components, layouts, routes and product surfaces
├── supabase/           # Database migrations and Edge Functions
├── scripts/            # Asset, education, commerce and delivery utilities
├── package.json        # Root scripts and workspaces
└── TODO.md             # Current project notes
```

## Education model

The educational layer is public-facing but not open source.

### VOLYNX Education Lab

The education hub connects two complementary experiences:

- **Dev Journey** is the structured path. The current curriculum has free Social blocks for web foundations and JavaScript, followed by paid Pro and Bundle paths for React, APIs, integration, deploy and portfolio proof.
- **Cheatcodes** is the free reference layer. It publishes small, useful pieces: concepts, generic examples, debugging patterns, checklists, terminology and honest limits.

Education content is protected VOLYNX material. The public availability of a lesson or reference does not grant permission to copy, resell, redistribute, bulk-download, repackage or turn it into a competing product.

The repository does not currently declare an open-source license. Do not describe the VOLYNX platform, products, brand assets or educational material as open source.

## Local setup

Requirements: Node.js 20 or newer.

```bash
npm install
# Create a local .env with the variables required by your runtime.
npm run dev
```

The Astro development server runs at [http://localhost:4321](http://localhost:4321).

For the separate API process:

```bash
npm run api
```

The API uses port `3000` by default. Never commit secrets. Configure Supabase, Stripe and other credentials only through local environment variables or the deployment provider's secret store.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the VOLYNX Astro development server |
| `npm run build` | Build the static Astro output |
| `npm run preview` | Preview the production build locally |
| `npm run api` | Start the Express compatibility/API server |
| `npm run dev:volynx-os` | Start the internal VOLYNX OS workspace |
| `npm run build:volynx-os` | Build the internal VOLYNX OS workspace |
| `npm run lint:volynx-os` | Lint the internal VOLYNX OS workspace |
| `npm run lab:assets:check` | Check required Lab assets |
| `npm run marketing:check` | Check marketing readiness markers |
| `npm run analytics:check` | Check analytics and consent readiness |
| `npm run commerce:e2e:check` | Check commerce flow readiness |
| `npm run devjourney:package` | Package Dev Journey deliverables |
| `npm run propertyflow:delivery:check` | Check private PropertyFlow delivery state |

## Deployment

The public `volynx.world` surface is published through Cloudflare Pages. The static Astro output is generated in `dist/`, and the repository also contains platform functions and redirects that must remain part of the release workflow.

Before any release:

1. Confirm the authoritative checkout and intended release scope.
2. Preserve unrelated working-tree changes.
3. Run the focused checks required by the change.
4. Run `npm run build` when the requested work is complete or affects site structure.
5. Verify the intended route, assets and deployed HTML after publication.

A successful build, HTTP 200 or Pages deployment does not by itself prove authenticated access, payment, webhook fulfillment or protected download delivery.

## Ownership and reuse

The repository is public for transparency and educational discovery, not as a blanket reuse grant.

Unless a file or package explicitly says otherwise:

- VOLYNX source code, products, architecture, content, brand, designs and assets remain proprietary;
- public educational material is available to read and learn from, but not to copy, resell, redistribute or convert into a competing product;
- third-party dependencies remain under their own licenses;
- customer data, credentials, private delivery payloads and operational records are never part of the public learning surface.

For licensing, commercial use or partnership questions, contact [hello@volynx.world](mailto:hello@volynx.world).

## Status

VOLYNX is actively evolving. Some product, commerce, education and operational paths have different readiness levels; documentation should distinguish local preview, build, deployment, authenticated flow and production evidence.

Built with care by the VOLYNX team.
