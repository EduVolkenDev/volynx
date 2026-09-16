/**
 * Property Flow tenant router.
 *
 * Cloudflare Pages does not support wildcard custom domains. This Worker owns
 * the wildcard route and proxies tenant hosts to the published Pages renderer.
 * More-specific VOLYNX routes still win; the explicit platform allowlist is a
 * second guard for hosts that resolve through ordinary DNS records.
 */

const PLATFORM_HOSTS = new Set([
  "www.volynx.world",
  "daily.volynx.world",
  "cvitae.volynx.world",
  "api.volynx.world",
  "qr.volynx.world",
]);

const DEFAULT_PAGES_ORIGIN = "https://volynx.pages.dev";

function isTenantHost(hostname) {
  return hostname.endsWith(".volynx.world") && !PLATFORM_HOSTS.has(hostname);
}

function tenantAssetUrl(requestUrl, pagesOrigin) {
  const upstream = new URL(requestUrl);
  const origin = new URL(pagesOrigin);

  upstream.protocol = origin.protocol;
  upstream.hostname = origin.hostname;
  upstream.port = origin.port;

  if (upstream.pathname === "/" || upstream.pathname === "/index.html") {
    upstream.pathname = "/propertyflow/site/";
  }

  return upstream;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();

    if (!isTenantHost(hostname)) {
      return fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    const upstreamUrl = tenantAssetUrl(
      request.url,
      env.PAGES_ORIGIN || DEFAULT_PAGES_ORIGIN,
    );
    const upstreamRequest = new Request(upstreamUrl, request);
    const response = await fetch(upstreamRequest);
    const headers = new Headers(response.headers);

    headers.set("x-volynx-propertyflow-route", "tenant-worker");
    headers.set("x-content-type-options", "nosniff");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export { isTenantHost, tenantAssetUrl };
