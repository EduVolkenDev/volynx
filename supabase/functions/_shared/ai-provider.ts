/**
 * Provider-neutral AI contract for VOLYNX Edge Functions.
 *
 * Product endpoints own authentication, authorization, and billing. This
 * module owns provider selection, bounded inputs, and provider transports so
 * those concerns do not drift between functions.
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
const DEFAULT_OPENAI_BUILDER_MODEL = "gpt-4o-mini";
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

function providerFor(request: Pick<AiProviderRequest, "product" | "capability">): "anthropic" | "openai" {
  // The pilot cannot change PDU/Lume or any other VOLYNX capability.
  if (request.product !== "volynx" || request.capability !== "builder") return "anthropic";
  const configured = Deno.env.get("AI_PROVIDER_BUILDER")?.trim().toLowerCase() || "anthropic";
  if (configured !== "anthropic" && configured !== "openai") {
    throw new Error("AI Builder provider configuration is invalid");
  }
  return configured;
}

export function assertAiProviderConfigured(request: Pick<AiProviderRequest, "product" | "capability">): void {
  const provider = providerFor(request);
  const key = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  if (!Deno.env.get(key)?.trim()) throw new Error("AI provider is not configured");
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

function textFromOpenAiResponse(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const response = value as { status?: unknown; output?: unknown };
  if (response.status !== "completed" || !Array.isArray(response.output)) return "";
  return response.output
    .filter((item): item is { type?: unknown; content?: unknown } => Boolean(item) && typeof item === "object")
    .filter((item) => item.type === "message" && Array.isArray(item.content))
    .flatMap((item) => item.content as unknown[])
    .filter((part): part is { type?: unknown; text?: unknown } => Boolean(part) && typeof part === "object")
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text as string)
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

  assertAiProviderConfigured(request);
  const provider = providerFor(request);
  const apiKey = Deno.env.get(provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY")!.trim();

  const temperature = boundedTemperature(request.temperature);
  if (provider === "openai") {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(request.requestId ? { "X-Client-Request-Id": request.requestId } : {}),
        },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_MODEL_BUILDER")?.trim() || DEFAULT_OPENAI_BUILDER_MODEL,
          input: [
            { role: "developer", content: `${request.system}\n\nRespond with a JSON object.` },
            { role: "user", content: request.user },
          ],
          max_output_tokens: boundedTokenCount(request.maxTokens),
          text: { format: { type: "json_object" } },
          store: false,
          ...(temperature === undefined ? {} : { temperature }),
        }),
      },
      providerTimeoutMs(),
    );
    if (!response.ok) throw new Error(`AI provider error ${response.status}`);
    const text = textFromOpenAiResponse(await response.json());
    if (!text) throw new Error("AI provider returned an empty or incomplete response");
    return text;
  }

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
