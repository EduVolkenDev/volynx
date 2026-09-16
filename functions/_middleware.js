const PLATFORM_HOSTS = new Set([
  "volynx.world",
  "www.volynx.world",
  "daily.volynx.world",
  "cvitae.volynx.world",
  "api.volynx.world",
  "qr.volynx.world",
]);

function isPropertyFlowHostname(hostname) {
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return false;
  if (PLATFORM_HOSTS.has(hostname) || hostname.endsWith(".pages.dev")) return false;
  if (hostname.endsWith(".volynx.world")) return true;

  // A custom domain only reaches this Pages project after its DNS is pointed
  // here, so an unknown production hostname is a Property Flow candidate.
  return hostname.includes(".");
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return context.next();
  }

  if (!isPropertyFlowHostname(url.hostname.toLowerCase())) {
    return context.next();
  }

  url.pathname = "/propertyflow/site/";
  const asset = await context.env.ASSETS.fetch(new Request(url, context.request));
  const headers = new Headers(asset.headers);
  headers.set("x-volynx-propertyflow-route", "subdomain");

  return new Response(asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers,
  });
}
