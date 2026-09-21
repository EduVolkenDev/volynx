/**
 * VOLYNX internal AI gateway.
 *
 * This endpoint is server-to-server only. Product routes remain responsible
 * for user auth and billing; the gateway authenticates a private service
 * token and forwards a bounded, provider-neutral request.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AiCapability,
  AiProduct,
  callAiProvider,
} from "../_shared/ai-provider.ts";
import {
  corsHeaders,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
} from "../_shared/edge-security.ts";

const CAPABILITIES = new Set<AiCapability>([
  "intent", "summary", "writing", "task", "decision", "lumina", "cvitae", "builder", "lume", "reading",
]);
const PRODUCTS = new Set<AiProduct>(["pdu", "volynx"]);
const PRODUCT_CAPABILITIES: Record<AiProduct, Set<AiCapability>> = {
  pdu: new Set<AiCapability>(["lume", "reading"]),
  volynx: CAPABILITIES,
};
const MAX_REQUEST_BYTES = 170_000;

function tokenMatches(received: string, expected: string): boolean {
  if (!received || received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

function authorized(req: Request, product: AiProduct): boolean {
  const specificSecret = product === "pdu" ? Deno.env.get("AI_GATEWAY_TOKEN_PDU") : Deno.env.get("AI_GATEWAY_TOKEN_VOLYNX");
  const configured = specificSecret?.trim() || Deno.env.get("AI_GATEWAY_TOKEN")?.trim() || "";
  const received = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(configured) && tokenMatches(received, configured);
}

Deno.serve(async (req: Request) => {
  const blockedOrigin = rejectUnexpectedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  const respond = (data: Record<string, unknown>, status = 200) => jsonResponse(req, data, status);
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const body = await parseJsonObject(req, MAX_REQUEST_BYTES);
    const product = String(body.product || "").trim().toLowerCase() as AiProduct;
    const capability = String(body.capability || "").trim().toLowerCase() as AiCapability;
    const system = typeof body.system === "string" ? body.system : "";
    const user = typeof body.user === "string" ? body.user : "";
    const maxTokens = Number(body.max_tokens || 1_024);
    const temperature = body.temperature === undefined ? undefined : Number(body.temperature);
    const requestId = typeof body.request_id === "string" ? body.request_id : undefined;

    if (!PRODUCTS.has(product) || !CAPABILITIES.has(capability) || !PRODUCT_CAPABILITIES[product].has(capability)) {
      return respond({ error: "Invalid product or capability" }, 400);
    }
    if (!authorized(req, product)) return respond({ error: "Gateway authentication required" }, 401);
    if (!user.trim()) return respond({ error: "Missing user prompt" }, 400);
    if (system.length > 40_000 || user.length > 120_000) return respond({ error: "Prompt is too large" }, 413);
    if (!Number.isFinite(maxTokens) || maxTokens < 1 || maxTokens > 8_192) {
      return respond({ error: "Invalid max_tokens" }, 400);
    }
    if (temperature !== undefined && (!Number.isFinite(temperature) || temperature < 0 || temperature > 1)) {
      return respond({ error: "Invalid temperature" }, 400);
    }

    const text = await callAiProvider({
      product,
      capability,
      system,
      user,
      maxTokens,
      temperature,
      requestId,
    });
    return respond({ ok: true, text, capability });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "server_error";
    console.error("[ai-gateway] request failed", message);
    const status = message === "request_too_large" ? 413 : message === "invalid_request" ? 400 : 503;
    return respond({ error: "AI gateway could not complete this request" }, status);
  }
});
