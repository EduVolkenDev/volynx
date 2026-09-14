type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
};

type PayPalRequestOptions = RequestInit & {
  idempotencyKey?: string;
};

export type PayPalLink = {
  href?: string;
  rel?: string;
  method?: string;
};

export type PayPalOrder = {
  id?: string;
  status?: string;
  custom_id?: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: {
      captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }>;
    };
  }>;
  links?: PayPalLink[];
  message?: string;
  details?: Array<{ issue?: string; description?: string }>;
};

export function getPayPalConfig(): PayPalConfig | null {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")?.trim() || "";
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")?.trim() || "";
  const mode = (Deno.env.get("PAYPAL_ENV") || "sandbox").trim().toLowerCase();
  const baseUrl = mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, baseUrl };
}

function errorMessage(payload: PayPalOrder | Record<string, unknown>, status: number): string {
  const details = Array.isArray(payload.details)
    ? payload.details.map((detail) => detail?.issue || detail?.description).filter(Boolean).join(", ")
    : "";
  return details || String(payload.message || `PayPal request failed (${status})`);
}

async function getAccessToken(config: PayPalConfig): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(errorMessage(payload, response.status));
  }
  return payload.access_token;
}

export async function paypalRequest<T = PayPalOrder>(
  path: string,
  options: PayPalRequestOptions = {},
): Promise<T> {
  const config = getPayPalConfig();
  if (!config) throw new Error("PayPal is not configured");

  const token = await getAccessToken(config);
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey) headers.set("PayPal-Request-Id", options.idempotencyKey);

  const { idempotencyKey: _ignored, ...requestInit } = options;
  const response = await fetch(`${config.baseUrl}${path}`, { ...requestInit, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload as T;
}

export function approvalUrl(order: PayPalOrder): string | null {
  const link = order.links?.find((candidate) => candidate.rel === "approve" || candidate.rel === "payer-action");
  return typeof link?.href === "string" ? link.href : null;
}

export function completedCapture(order: PayPalOrder): { id: string; currency: string; value: string } | null {
  const captures = order.purchase_units?.[0]?.payments?.captures || [];
  const capture = captures.find((candidate) => candidate.status === "COMPLETED" && candidate.id);
  if (!capture?.id || !capture.amount?.currency_code || !capture.amount.value) return null;
  return {
    id: capture.id,
    currency: capture.amount.currency_code,
    value: capture.amount.value,
  };
}
