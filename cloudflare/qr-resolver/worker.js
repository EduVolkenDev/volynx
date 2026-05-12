/**
 * VOLYNX QR resolver — Cloudflare Worker
 *
 * Hosts: qr.volynx.world/*
 * Proxies dynamic QR slugs to Supabase edge function `qr-resolve`,
 * forwarding Cloudflare-injected headers (cf-connecting-ip, cf-ipcountry).
 *
 * Deploy:
 *   1. cd cloudflare/qr-resolver/
 *   2. npx wrangler deploy
 *   (or paste worker.js into Cloudflare dashboard → Workers → Quick edit)
 *
 * DNS:
 *   - In Cloudflare DNS for volynx.world: add CNAME `qr` → any (e.g. 192.0.2.1)
 *     proxied (orange cloud). Worker route below intercepts before origin lookup.
 *   - OR: skip DNS, attach Worker via Workers dashboard → Custom domains → qr.volynx.world
 */

const DEFAULT_FN_URL = "https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/qr-resolve";
const FALLBACK_HOME = "https://volynx.world/volynx-lab/qr-gen/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const slug = url.pathname.slice(1).split("/")[0];

    // Root or empty → send to QR generator
    if (!slug) {
      return Response.redirect(FALLBACK_HOME, 302);
    }

    // Filter common bot/browser noise that won't ever be a real slug
    if (slug === "favicon.ico" || slug === "robots.txt" || slug === "sitemap.xml") {
      return new Response("Not found", { status: 404 });
    }

    const fnBase = env.SUPABASE_FN_URL || DEFAULT_FN_URL;
    const target = `${fnBase}/${encodeURIComponent(slug)}`;

    const headers = new Headers();
    headers.set("user-agent", request.headers.get("user-agent") || "");
    const referer = request.headers.get("referer");
    if (referer) headers.set("referer", referer);

    const ip = request.headers.get("cf-connecting-ip") || "";
    if (ip) {
      headers.set("cf-connecting-ip", ip);
      headers.set("x-forwarded-for", ip);
    }
    const country = request.cf?.country || request.headers.get("cf-ipcountry") || "";
    if (country) headers.set("cf-ipcountry", country);

    let response;
    try {
      response = await fetch(target, {
        method: "GET",
        headers,
        redirect: "manual",
      });
    } catch (err) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Erro</title><meta charset="utf-8"></head><body style="background:#0a0a0a;color:#e8e8e8;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><h1>Erro temporário</h1><p style="opacity:.7">Tente novamente em alguns segundos.</p></div></body></html>`,
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Pass response through unchanged (status, headers, body)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
