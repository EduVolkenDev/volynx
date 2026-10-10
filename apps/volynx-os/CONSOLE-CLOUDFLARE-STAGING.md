# Cloud Console staging on Cloudflare Workers

This is a Console-only staging target. It does not deploy the existing Astro site or claim to support the other Volynx OS commerce and Daily routes. The staging Worker returns 404 for those routes, including webhooks and checkout. Do not point production traffic or Stripe webhooks at it.

## Local validation

Use Node.js 22 or newer. From the repository root, install workspace dependencies first; then install the app locally so OpenNext can trace its own Next.js package:

```sh
npm ci
cd apps/volynx-os
npm ci --no-workspaces
```

With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` explicitly set to the intended data source, run:

```sh
npm test
npm run lint
npm run build:cloudflare:console
npm run check:cloudflare:console
npm run preview:cloudflare:console
```

The Wrangler configuration runs the Worker before static assets so `console-staging-worker.mjs` can restrict every path. Only `/console`, `/console/*`, the two Cloud Console API routes, and the Console's static assets are reachable. An unauthenticated catalog request should return 401; unsupported app routes should return 404.

The isolated `console-release-prep` checkout was validated from the PR #8 head plus only Console/Worker and required Next 15 compatibility changes: 30 app tests passed (4 opt-in tests skipped), 66 PostgreSQL/RLS/observation tests passed, lint and TypeScript passed, the OpenNext build completed, and `wrangler deploy --dry-run` passed. Two delivery breadcrumb files and the PropertyFlow document pages have only Next 15 compatibility changes; no PropertyFlow feature change was brought over. Both root and app lockfiles are updated for reproducible installs.

### Disposable Docker + local Worker proof — 2026-09-30

Built OpenNext with the isolated local Supabase API URL/public anon key, then ran `wrangler dev --local --ip 127.0.0.1 --port 8787` (no tunnel or deploy). `scripts/check-console-local-e2e.mjs` exercised Auth, catalog and overview through the local Worker with 3 synthetic users in 3 clients / 2 organizations. Each user saw only their own catalog and overview; all 6 cross-client overview requests returned 404, including same-organization access. The database rejected an operational resource without source/time; the evidenced resource returned ready. The Worker served `/console/preview` and returned 404 outside the Console fence. Browser sign-in, catalog selection, overview, resource evidence and sign-out also worked. The release-prep checkout repeated these API checks with the **exact PR #8 migration** (16 Cloud tables), and Data API requests with all 3 client JWTs were denied access to private `commit_sha`. The disposable databases and local Workers were stopped after testing. This does **not** demonstrate the remotely deployed Worker with populated data.

## Hosted staging — 2026-09-30

- URL: `https://volynx-console-staging-probe.9nfr9wyp42.workers.dev/console/preview`.
- Worker: `volynx-console-staging-probe` on the existing Volynx Cloudflare account, Workers Free. Previous version: `85dcaf48-66a1-40af-9d52-c36528ae3579`. Current version: `c36297ab-9a37-46bf-9080-fbbf18d074cd` (published 2026-09-30 from this release-prep checkout). No custom domain, production route, or R2 binding was added.
- Worker-level Cloudflare Access applies to **all traffic** on every Worker URL, with the preconfigured **Cloudflare account members** allow policy and a 24-hour session. Preview URLs are disabled in `wrangler.jsonc`. The path fence is defense in depth, not authentication. Keep this Access policy in place before every future deployment; it lives in the Cloudflare dashboard, not this checkout.
- This zero-extra-cost probe points to the existing Volynx Core Supabase project (`zdmpzrderifgqmqivjoy`) using only its public URL and anon key at build time. It is **not** an isolated database staging environment. No service-role key is shipped to the Worker or browser. Do not put production users or data into test fixtures.
- Hosted checks: without Access, Console/preview/API paths redirect to Cloudflare Access; after authorized Cloudflare sign-in, `/console/preview` and `/console` render. A synthetic Supabase user signed in to the hosted Console and saw the honest empty catalog; the user, profile, organization, and audit records were removed and cleanup verified. The hosted Worker dashboard showed 25 invocations, 0 errors, and 0 exceeded-CPU events at the time of inspection. These observations do not prove sustained traffic fits the Workers Free 10 ms CPU/request limit.
- For this published version, the OpenNext bundle was rebuilt with the hosted Supabase public URL/anon key, not the Docker-local URL. A fresh browser session rendered `/console/preview` and the `/console` sign-in page. Anonymous requests to those paths, `/api/cloud/v1/catalog`, and an out-of-scope webhook route still redirected to Cloudflare Access. No populated hosted tenant workflow was repeated for this version.

## Remaining gates

1. Keep this Worker separate from `volynx.world`, the Astro site, checkout, Daily, and Stripe webhooks. Do not route production traffic or webhooks here.
2. Keep PR #8 in draft until its updated checks and the staging-only scope are reviewed. Publishing this Worker does not merge or release the Console on `volynx.world`.
3. The PostgREST UTC timestamp parsing fix and positive Auth/catalog/overview path are verified against Docker and the **local Worker runtime**. This does **not** prove the hosted Worker with populated staging data; a separate hosted Supabase environment would need a cost decision. Never leave synthetic tenants in production for a demo.
4. Monitor CPU and error metrics under realistic use before considering the Workers Free plan sufficient. Do not upgrade to Workers Paid without explicit approval.
