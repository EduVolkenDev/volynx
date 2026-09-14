import { createClient } from "jsr:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://volynx.world",
  "https://www.volynx.world",
  "https://daily.volynx.world",
  "https://cvitae.volynx.world",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
];

function configuredOrigins(): string[] {
  const configured = (Deno.env.get("VOLYNX_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured])];
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const normalized = new URL(origin).origin;
    return configuredOrigins().includes(normalized);
  } catch {
    return false;
  }
}

export function isAllowedReturnUrl(value: unknown, fallbackOrigin: string): boolean {
  if (typeof value !== "string" || !value) return false;
  try {
    const target = new URL(value);
    const fallback = new URL(fallbackOrigin);
    return (target.protocol === fallback.protocol && target.origin === fallback.origin)
      || configuredOrigins().includes(target.origin);
  } catch {
    return false;
  }
}

export function corsHeaders(req: Request, methods = "POST, OPTIONS"): HeadersInit {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods,
    "Vary": "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function jsonResponse(
  req: Request,
  data: JsonObject,
  status = 200,
  methods = "POST, OPTIONS",
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req, methods), "Content-Type": "application/json" },
  });
}

export function rejectUnexpectedOrigin(req: Request): Response | null {
  const origin = req.headers.get("Origin");
  if (!origin || isAllowedOrigin(origin)) return null;
  return jsonResponse(req, { error: "Origin not allowed" }, 403);
}

export type AuthenticatedRequest = {
  token: string;
  user: { id: string; email?: string | null };
};

export async function requireAuthenticatedUser(req: Request): Promise<AuthenticatedRequest | null> {
  const token = (req.headers.get("Authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) return null;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { token, user: data.user };
}

export async function parseJsonObject(req: Request, maxBytes: number): Promise<JsonObject> {
  const contentLength = Number(req.headers.get("Content-Length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("request_too_large");
  }

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new Error("request_too_large");
  }

  const value = JSON.parse(raw || "{}");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_request");
  }
  return value as JsonObject;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
