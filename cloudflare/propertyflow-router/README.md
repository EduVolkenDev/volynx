# Property Flow tenant routing

## Active integration: existing VOLYNX publisher

The wildcard route is owned by **volynx-publisher**. Do not deploy the standalone
`worker.js`/`wrangler.toml` below over it: doing so would replace Builder hosting
and other publisher behavior.

`publisher-route.mjs` is the active integration module. In the existing
publisher, import `routePublishedPropertyFlow` and invoke it only when the
legacy `SITES.get(slug + '/index.html')` has no object, before returning
`Not published`. Return its response when non-null; retain the legacy fallback.
This preserves existing Builder sites and all API/payment handlers. It resolves
published tenants using the public Supabase RPC, then serves the existing Pages
renderer and its assets without forwarding visitor cookies or authorization.

Validate with:

```bash
node --test cloudflare/propertyflow-router/publisher-route.test.mjs
```

### Release safety

The legacy source at `~/volynx-site/volynx-publisher` predates the deployed worker.
Do not deploy it as-is. Start from a fresh download of the active worker using
`wrangler init --from-dash volynx-publisher --no-delegate-c3` in a new temporary
directory; retain its configuration and secrets. Apply only the import and the
fallback integration above, alongside this module. Dry-run the bundle, upload a
version, and deploy that version only with release authorization. Do not assign
a new wildcard route or modify DNS. Verify the actual tenant URL in a browser,
not just the Pages renderer, and retain the preceding version for rollback.

Baseline inspected on 2026-09-17: `2fa60f06-52f5-4a38-9756-925d957dc2eb`.
The deployed source, not the older local TypeScript file, was used for this fix.

Released on 2026-09-17: `18b5a829-784b-42b6-9df2-5d1f1f70df16` (100%).
No routes, DNS records, database content, billing handlers or secrets changed.
The first routing version also required `/config.json` in the asset allowlist;
the final version includes it. Public API keys in that file are the existing
browser configuration, not service-role credentials.

Validation: 14 module tests, 3 integration checks against the recovered worker
bundle (legacy R2 site, anonymous permission API, Property Flow fallback), Worker
bundle dry-run, and a live browser visit to `propertyflow-jp.volynx.world`.
That new workspace loads successfully with zero properties. It is not the
separate Johnny/Parisnez workspace and no Johnny properties were copied.
Unknown tenant hosts retain HTTP 404. The renderer and public configuration
return HTTP 200 for the published tenant. The previous production version above
remains available for rollback.

## Historical standalone candidate (not deployed)

Cloudflare Pages does not accept `*.volynx.world` as a custom domain. This
Worker receives the existing proxied wildcard DNS traffic and serves the
Property Flow public renderer from the `volynx` Pages project.

The route deliberately excludes named VOLYNX platform hosts in code. Exact
Worker routes such as `qr.volynx.world/*` are also more specific than the
wildcard route and therefore take precedence.

## Historical configuration

```bash
npx wrangler deploy --dry-run --config cloudflare/propertyflow-router/wrangler.toml
```

This candidate must not own the wildcard. The active integration returns
`x-volynx-propertyflow-route: publisher` only for a published, matching tenant.
Unknown and unpublished sites retain the publisher's existing 404 behavior.
