import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Public endpoint (verify_jwt: false) — called via Cloudflare Worker on qr.volynx.world
// Path format: /qr-resolve/<slug>
// Returns 302 redirect for active QRs, HTML interstitial for grace, HTML error pages for paused/expired/blocked.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const IP_SALT = "volynx_qr_salt_v1";

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + IP_SALT);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
  });
}

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0a0a;color:#e8e8e8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:480px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 32px;text-align:center;backdrop-filter:blur(12px)}
  .icon{font-size:44px;margin-bottom:14px;filter:grayscale(.2)}
  h1{font-size:21px;font-weight:600;margin-bottom:10px;letter-spacing:-.01em}
  p{color:rgba(255,255,255,.65);line-height:1.55;margin:6px 0}
  .footer{margin-top:26px;font-size:12px;color:rgba(255,255,255,.4)}
  a{color:#7ab8ff;text-decoration:none}
  a:hover{text-decoration:underline}
  .cta{display:inline-block;margin-top:18px;padding:11px 22px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#fff;text-decoration:none;font-weight:500;transition:background .15s}
  .cta:hover{background:rgba(255,255,255,.12);text-decoration:none}
`;

function htmlPage(opts: {
  status: number;
  title: string;
  icon: string;
  heading: string;
  body: string;
  refresh?: string;
  accent?: "warn" | "neutral";
}): Response {
  const refreshTag = opts.refresh
    ? `<meta http-equiv="refresh" content="3;url=${escapeHtml(opts.refresh)}">`
    : "";
  const cardAccent = opts.accent === "warn"
    ? "border-color:rgba(255,200,80,.25);background:linear-gradient(180deg,rgba(255,200,80,.06),rgba(255,255,255,.02))"
    : "";
  const html = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refreshTag}<title>${escapeHtml(opts.title)} · VOLYNX</title><style>${BASE_CSS}</style></head><body><div class="card" style="${cardAccent}"><div class="icon">${opts.icon}</div><h1>${escapeHtml(opts.heading)}</h1>${opts.body}<div class="footer">VOLYNX · <a href="https://volynx.world">volynx.world</a></div></div></body></html>`;
  return new Response(html, {
    status: opts.status,
    headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1] || "";

    if (!slug || !/^[a-zA-Z0-9_-]{4,32}$/.test(slug)) {
      return htmlPage({
        status: 404,
        title: "QR inválido",
        icon: "&#9888;",
        heading: "QR inválido",
        body: `<p>Este código não tem um formato válido.</p>`,
      });
    }

    const xff = req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") || "";
    const ip = (xff.split(",")[0] || "unknown").trim();
    const userAgent = req.headers.get("user-agent") || "";
    const country = req.headers.get("cf-ipcountry") || null;
    const referer = req.headers.get("referer") || null;
    const ipHash = await hashIp(ip);

    const { data, error } = await supabase.rpc("resolve_qr_slug", {
      p_slug: slug,
      p_ip_hash: ipHash,
      p_user_agent: userAgent.slice(0, 500),
      p_country: country,
      p_referer: referer ? referer.slice(0, 500) : null,
    });

    if (error) {
      console.error("[qr-resolve] rpc error:", error.message);
      return htmlPage({
        status: 500,
        title: "Erro",
        icon: "&#9888;",
        heading: "Erro temporário",
        body: `<p>Tente novamente em alguns segundos.</p>`,
      });
    }

    if (!data?.found) {
      return htmlPage({
        status: 404,
        title: "QR não encontrado",
        icon: "&#128269;",
        heading: "QR não encontrado",
        body: `<p>Este código pode ter sido removido ou nunca existiu.</p><p style="margin-top:18px;font-size:13px"><a href="https://volynx.world/volynx-lab/qr-gen/">Crie o seu QR →</a></p>`,
      });
    }

    const status = data.status as string;
    const target = data.target_url as string | undefined;

    switch (status) {
      case "active": {
        if (!target) return new Response("Missing target", { status: 500 });
        return Response.redirect(target, 302);
      }

      case "grace": {
        const graceUntil = new Date(data.grace_until);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((graceUntil.getTime() - now.getTime()) / 86400000));
        const dayLabel = daysLeft === 1 ? "dia" : "dias";
        return htmlPage({
          status: 200,
          title: "Redirecionando",
          icon: "&#9203;",
          heading: "Redirecionando em 3s…",
          body: `<p>Este QR expira em <strong style="color:#ffd483">${daysLeft} ${dayLabel}</strong> e será desativado.</p><a href="${escapeHtml(target!)}" class="cta">Continuar agora →</a><p style="margin-top:22px;font-size:12px;color:rgba(255,255,255,.45)">É seu QR? <a href="https://volynx.world/profile/qr-codes/">Renove no painel</a></p>`,
          refresh: target!,
          accent: "warn",
        });
      }

      case "paused":
        return htmlPage({
          status: 410,
          title: "QR pausado",
          icon: "&#9208;",
          heading: "QR temporariamente pausado",
          body: `<p>O dono pausou este QR. Tente novamente em alguns dias.</p>`,
        });

      case "expired":
        return htmlPage({
          status: 410,
          title: "QR expirado",
          icon: "&#8987;",
          heading: "QR expirado",
          body: `<p>Este QR não está mais ativo.</p><p style="margin-top:18px;font-size:13px">Quer criar o seu? <br><a href="https://volynx.world/volynx-lab/qr-gen/">volynx.world/volynx-lab/qr-gen</a></p>`,
        });

      case "admin_blocked":
        return htmlPage({
          status: 410,
          title: "QR bloqueado",
          icon: "&#128683;",
          heading: "QR bloqueado",
          body: `<p>Este QR foi bloqueado por violar nossos termos de uso.</p>`,
        });

      default:
        console.error("[qr-resolve] unknown status:", status);
        return htmlPage({
          status: 500,
          title: "Status desconhecido",
          icon: "&#9888;",
          heading: "Erro",
          body: `<p>Status desconhecido: ${escapeHtml(status)}.</p>`,
        });
    }
  } catch (err) {
    console.error("[qr-resolve] exception:", (err as Error).message);
    return htmlPage({
      status: 500,
      title: "Erro",
      icon: "&#9888;",
      heading: "Erro inesperado",
      body: `<p>Tente novamente em alguns segundos.</p>`,
    });
  }
});
