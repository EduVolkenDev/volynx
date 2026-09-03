import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const QR_HOST = "qr.volynx.world";
const MAX_CONTENT_LENGTH = 4096;
const MAX_LOGO_LENGTH = 700000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_RANK: Record<string, number> = {
  free: 0,
  launch: 1,
  pro: 2,
  business: 2,
  diamond: 2,
  studio: 3,
  teams: 4,
  enterprise: 5,
};

type ExportRequest = {
  content?: string;
  mode?: string;
  dynamicShortUrl?: string;
  exportFormat?: string;
  exportSize?: number | string;
  margin?: number | string;
  colorMode?: string;
  dotsType?: string;
  cornerStyle?: string;
  dotColor?: string;
  dotColor2?: string;
  metallicPreset?: string;
  bgColor?: string;
  transparent?: boolean;
  logoDataUrl?: string;
  logoSize?: number | string;
  logoMargin?: number | string;
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizePlan(value: unknown): string {
  const plan = String(value || "free").toLowerCase();
  return Object.prototype.hasOwnProperty.call(PLAN_RANK, plan) ? plan : "free";
}

function requiredPlan(request: ExportRequest): "free" | "launch" | "pro" {
  const format = String(request.exportFormat || "png").toLowerCase();
  const size = Number(request.exportSize || 1024);
  const colorMode = String(request.colorMode || "solid").toLowerCase();
  const dotsType = String(request.dotsType || "square").toLowerCase();
  const cornerStyle = String(request.cornerStyle || "square").toLowerCase();

  if (
    format === "svg" ||
    size >= 4096 ||
    colorMode === "metallic" ||
    dotsType === "extra-rounded" ||
    cornerStyle === "dot" ||
    request.transparent === true ||
    Boolean(request.logoDataUrl)
  ) {
    return "pro";
  }

  if (
    format === "png-hd" ||
    size >= 2048 ||
    colorMode === "gradient" ||
    dotsType === "classy"
  ) {
    return "launch";
  }

  return "free";
}

function safeHex(value: unknown, fallback: string): string {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function safeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] || character,
  );
}

function validLogoDataUrl(value: unknown): string {
  const logo = String(value || "");
  if (!logo || logo.length > MAX_LOGO_LENGTH) return "";
  return /^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=]+$/i.test(logo)
    ? logo
    : "";
}

function gradientStops(request: ExportRequest): string[] {
  const palettes: Record<string, string[]> = {
    chrome: ["#f8fafc", "#94a3b8", "#ffffff", "#475569", "#dbeafe"],
    gold: ["#fff7cc", "#f5c451", "#fff2a8", "#a16207", "#fde68a"],
    rose: ["#ffe4e6", "#fb7185", "#fff1f2", "#9f1239", "#fecdd3"],
    volynx: ["#eaffff", "#7df9ff", "#20e3b2", "#148ea9", "#f8fafc"],
  };
  if (String(request.colorMode || "").toLowerCase() === "metallic") {
    return (
      palettes[String(request.metallicPreset || "chrome")] || palettes.chrome
    );
  }
  return [
    safeHex(request.dotColor, "#111827"),
    safeHex(request.dotColor2, "#20e3b2"),
  ];
}

function addPremiumSvgPresentation(
  svg: string,
  request: ExportRequest,
): string {
  const transparent = request.transparent === true;
  const colorMode = String(request.colorMode || "solid").toLowerCase();
  const useGradient = colorMode === "gradient" || colorMode === "metallic";
  const darkColor = safeHex(request.dotColor, "#111827");
  const background = safeHex(request.bgColor, "#ffffff");
  const stops = gradientStops(request);
  const defs = useGradient
    ? `<defs><linearGradient id="qrgen-premium-gradient" x1="0" y1="0" x2="1" y2="1">${stops.map((color, index) => `<stop offset="${Math.round((index * 100) / (stops.length - 1))}%" stop-color="${color}"/>`).join("")}</linearGradient></defs>`
    : "";

  let output = svg.replace(/<svg\b([^>]*)>/i, `<svg$1>${defs}`);
  if (useGradient) {
    output = output.replace(
      new RegExp(`stroke=["']${darkColor}["']`, "gi"),
      'stroke="url(#qrgen-premium-gradient)"',
    );
  }
  if (transparent) {
    output = output.replace(
      /<path\s+fill=["']#(?:fff|ffffff)["'][^>]*\/>/i,
      "",
    );
  } else if (!useGradient) {
    output = output.replace(
      /<path\s+fill=["']#(?:fff|ffffff)["']/i,
      `<path fill="${background}"`,
    );
  }

  const logo = validLogoDataUrl(request.logoDataUrl);
  if (logo) {
    const viewBox = output.match(/viewBox=["']0 0 ([\d.]+) ([\d.]+)["']/i);
    const width = Number(viewBox?.[1] || 37);
    const height = Number(viewBox?.[2] || width);
    const imageSize =
      safeNumber(request.logoSize, 0.22, 0.12, 0.4) * Math.min(width, height);
    const imageMargin =
      (safeNumber(request.logoMargin, 10, 4, 24) * Math.min(width, height)) /
      320;
    const x = (width - imageSize) / 2;
    const y = (height - imageSize) / 2;
    const backing = transparent ? "#0b1020" : background;
    const logoMarkup = `<rect x="${x - imageMargin}" y="${y - imageMargin}" width="${imageSize + imageMargin * 2}" height="${imageSize + imageMargin * 2}" rx="${imageMargin}" fill="${backing}"/><image href="${escapeXml(logo)}" x="${x}" y="${y}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet"/>`;
    output = output.replace(/<\/svg>\s*$/i, `${logoMarkup}</svg>`);
  }
  return output;
}

function dynamicSlug(value: unknown): string {
  try {
    const url = new URL(String(value || ""));
    if (url.hostname !== QR_HOST || url.protocol !== "https:") return "";
    const slug = url.pathname.split("/").filter(Boolean).pop() || "";
    return /^[a-zA-Z0-9_-]{4,32}$/.test(slug) ? slug : "";
  } catch (_) {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = (req.headers.get("Authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return json({ error: "Authentication required" }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);
    if (authError || !userData.user)
      return json({ error: "Invalid or expired token" }, 401);

    const body = await req.json().catch(() => ({}));
    const request = (body.request || {}) as ExportRequest;
    const content = String(request.content || "").trim();
    if (!content || content.length > MAX_CONTENT_LENGTH)
      return json({ error: "Invalid QR content" }, 400);

    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      },
    );
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("builder_plan,is_admin,is_black_diamond")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError || !profile)
      return json({ error: "Profile unavailable" }, 503);

    const isAdmin =
      profile.is_admin === true || profile.is_black_diamond === true;
    const plan = normalizePlan(profile.builder_plan);
    const required = requiredPlan(request);
    if (!isAdmin && (PLAN_RANK[plan] || 0) < (PLAN_RANK[required] || 0)) {
      return json(
        { error: "plan_required", required_plan: required, allowed: false },
        403,
      );
    }

    if (String(request.mode || "static") === "dynamic") {
      const slug = dynamicSlug(request.dynamicShortUrl);
      if (!slug) return json({ error: "Invalid dynamic QR" }, 400);
      const { data: qr, error: qrError } = await serviceClient
        .from("qr_codes")
        .select("id")
        .eq("owner_id", userData.user.id)
        .eq("slug", slug)
        .in("status", ["active", "paused", "grace"])
        .maybeSingle();
      if (qrError || !qr)
        return json({ error: "Dynamic QR is not owned by this account" }, 403);
    }

    const format = String(request.exportFormat || "png").toLowerCase();
    if (!["png", "png-hd", "svg"].includes(format))
      return json({ error: "Unsupported export format" }, 400);
    const size = safeNumber(
      request.exportSize,
      format === "png" ? 1024 : 2048,
      240,
      4096,
    );
    const qrSvg = await QRCode.toString(content, {
      type: "svg",
      width: size,
      margin: safeNumber(request.margin, 12, 0, 36),
      errorCorrectionLevel: "H",
      color: {
        dark: safeHex(request.dotColor, "#111827"),
        light:
          request.transparent === true
            ? "#00000000"
            : safeHex(request.bgColor, "#ffffff"),
      },
    });
    const svg = addPremiumSvgPresentation(qrSvg, request);

    return json({
      ok: true,
      format,
      size,
      filename: `volynx-qrgen-${format === "svg" ? "premium" : "hd"}.${format === "svg" ? "svg" : "png"}`,
      svg,
    });
  } catch (error) {
    console.error(
      "[qrgen-export] Error:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "Premium export unavailable" }, 500);
  }
});
