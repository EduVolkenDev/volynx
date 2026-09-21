// Imported by the EXISTING volynx-publisher. Never claim a second wildcard route.
const PLATFORM_HOSTS = new Set([
  'www.volynx.world', 'api.volynx.world', 'daily.volynx.world',
  'cvitae.volynx.world', 'builder.volynx.world', 'qr.volynx.world',
]);
const PAGES_ORIGIN = 'https://volynx.pages.dev';

export async function routePublishedPropertyFlow(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.volynx\.world$/.test(url.hostname)
    || PLATFORM_HOSTS.has(url.hostname)
    || !['GET', 'HEAD'].includes(request.method)) return null;

  const unavailable = () => new Response('Site temporariamente indisponível. Tente novamente.', {
    status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '30' },
  });
  try {
    // Use only the public resolver and anonymous key, never tenant table access.
    const resolved = await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/get_public_property_flow_site`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
      body: JSON.stringify({ p_host: url.hostname }),
      signal: AbortSignal.timeout(5000),
    });
    if (!resolved.ok) return unavailable();
    const sites = await resolved.json();
    const site = Array.isArray(sites) ? sites[0] : null;
    if (!site?.id || site.status !== 'published'
      || ![site.domain, `${site.subdomain}.volynx.world`].includes(url.hostname)) return null;

    if (['/privacy/', '/products/propertyflow/'].includes(url.pathname)) {
      return Response.redirect(`https://volynx.world${url.pathname}`, 302);
    }

    const upstream = new URL(url.pathname + url.search, PAGES_ORIGIN);
    if (['/', '/index.html', '/propertyflow/site/'].includes(url.pathname)) {
      upstream.pathname = '/propertyflow/site/';
    } else if (!/^\/(?:_astro|assets|js|fonts|favicons|propertyflow)\//.test(url.pathname)
      && !['/favicon.ico', '/robots.txt', '/config.json'].includes(url.pathname)) {
      return new Response('Página não encontrada.', { status: 404 });
    }
    // Never forward a visitor's cookies or authorization to the Pages origin.
    const headers = new Headers();
    for (const name of ['accept', 'if-none-match', 'if-modified-since']) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    const response = await fetcher(upstream, {
      method: request.method, headers, redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('set-cookie');
    responseHeaders.set('x-volynx-propertyflow-route', 'publisher');
    responseHeaders.set('x-content-type-options', 'nosniff');
    // Resolve publication again on each visit; do not cache tenant approval.
    responseHeaders.set('cache-control', 'no-store');
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status, headers: responseHeaders,
    });
  } catch {
    return unavailable();
  }
}
