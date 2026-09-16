# Property Flow tenant router

Cloudflare Pages does not accept `*.volynx.world` as a custom domain. This
Worker receives the existing proxied wildcard DNS traffic and serves the
Property Flow public renderer from the `volynx` Pages project.

The route deliberately excludes named VOLYNX platform hosts in code. Exact
Worker routes such as `qr.volynx.world/*` are also more specific than the
wildcard route and therefore take precedence.

## Validate and deploy

```bash
npx wrangler deploy --dry-run --config cloudflare/propertyflow-router/wrangler.toml
npx wrangler deploy --config cloudflare/propertyflow-router/wrangler.toml
```

After deployment, a random subdomain should return the Property Flow renderer
with `x-volynx-propertyflow-route: tenant-worker`. The renderer itself resolves
the hostname against Supabase and does not expose unpublished tenant content.
