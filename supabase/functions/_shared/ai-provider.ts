/**
 * Provider-neutral AI contract for VOLYNX Edge Functions.
 *
 * Product endpoints own authentication, authorization, and billing. This
 * module owns only provider selection, bounded inputs, and the Anthropic
 * transport so those concerns do not drift between functions.
 */

export type AiProduct = "pdu" | "volynx";
export type AiCapability =
  | "intent"
  | "summary"
  | "writing"
  | "task"
  | "decision"
  | "lumina"
  | "cvitae"
  | "builder"
  | "lume"
  | "reading";

export type AiProviderRequest = {
  product: AiProduct;
  capability: AiCapability;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  requestId?: string;
};

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_SYSTEM_CHARS = 40_000;
const MAX_USER_CHARS = 120_000;

function providerTimeoutMs(): number {
  const parsed = Number(Deno.env.get("AI_PROVIDER_TIMEOUT_MS"));
  if (!Number.isFinite(parsed)) return 30_000;
  return Math.min(60_000, Math.max(5_000, Math.trunc(parsed)));
}

function modelFor(capability: AiCapability): string {
  const envKey = `AI_MODEL_${capability.toUpperCase()}`;
  return Deno.env.get(envKey)?.trim() || Deno.env.get("AI_MODEL")?.trim() || DEFAULT_MODEL;
}

function boundedTokenCount(value: number): number {
  if (!Number.isFinite(value)) return 1_024;
  return Math.min(8_192, Math.max(1, Math.floor(value)));
}

function boundedTemperature(value?: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

function textFromResponse(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block): block is { text?: unknown } => Boolean(block) && typeof block === "object")
    .map((block) => typeof block.text === "string" ? block.text : "")
    .join("")
    .trim();
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function callAiProvider(request: AiProviderRequest): Promise<string> {
  if (!request.user.trim()) throw new Error("AI prompt is empty");
  if (request.system.length > MAX_SYSTEM_CHARS || request.user.length > MAX_USER_CHARS) {
    throw new Error("AI prompt is too large");
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim() || "";
  if (!apiKey) throw new Error("AI provider is not configured");

  const temperature = boundedTemperature(request.temperature);
  const body = {
    model: modelFor(request.capability),
    max_tokens: boundedTokenCount(request.maxTokens),
    messages: [{ role: "user", content: request.user }],
    ...(request.system.trim() ? { system: request.system } : {}),
    ...(temperature === undefined ? {} : { temperature }),
  };

  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        ...(request.requestId ? { "x-client-request-id": request.requestId } : {}),
      },
      body: JSON.stringify(body),
    },
    providerTimeoutMs(),
  );

  if (!response.ok) {
    throw new Error(`AI provider error ${response.status}`);
  }

  const text = textFromResponse(await response.json());
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
}
