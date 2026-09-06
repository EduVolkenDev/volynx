export type DailyAiTool = "intent" | "summary" | "writing" | "task" | "decision"
export type DailyAiActionClass = "light" | "medium" | "pro"

type AuthorizeInput = {
  tool: DailyAiTool
  actionClass: DailyAiActionClass
  accessToken?: string | null
}

type CallAiInput = {
  tool: DailyAiTool
  input: Record<string, string>
  actionClass: DailyAiActionClass
  accessToken: string
}

type RunAiInput = AuthorizeInput & {
  input: Record<string, string>
}

type AiToolsResponse = {
  result?: string
  lite?: boolean
  error?: string
}

export class DailyAiAuthorizationError extends Error {
  reason: "login" | "tokens"

  constructor(reason: "login" | "tokens") {
    super(reason === "login" ? "AI access token is missing." : "Insufficient AI tokens.")
    this.name = "DailyAiAuthorizationError"
    this.reason = reason
  }
}

export function getDailyFunctionsUrl() {
  const configured =
    process.env.DAILY_AI_FUNCTIONS_URL ??
    process.env.NEXT_PUBLIC_DAILY_AI_FUNCTIONS_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL

  if (configured) {
    return configured.replace(/\/$/, "")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`
  }

  return "https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1"
}

export async function authorizeDailyAiCall(input: AuthorizeInput) {
  if (!input.accessToken) {
    return { allowed: false, reason: "login" as const, lite: false }
  }
  // The Edge Function is the single authority for free quotas, VX charging,
  // rate limiting and refunds. Never fail open when a billing check is down.
  return { allowed: true, lite: false }
}

export async function callDailyAiTool(input: CallAiInput) {
  const functionsUrl = getDailyFunctionsUrl()
  const response = await fetch(`${functionsUrl}/ai-tools`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`
    },
    body: JSON.stringify({
      tool: input.tool,
      input: input.input,
      action_class: input.actionClass,
      request_id: crypto.randomUUID()
    })
  })
  const data = (await response.json()) as AiToolsResponse

  if (data.error === "insufficient_balance") {
    throw new DailyAiAuthorizationError("tokens")
  }
  if (!response.ok || data.error || !data.result) {
    throw new Error(data.error ?? "AI tool did not return a result.")
  }

  return {
    result: data.result,
    lite: Boolean(data.lite)
  }
}

export async function runDailyAiTool(input: RunAiInput) {
  const authorization = await authorizeDailyAiCall(input)

  if (!authorization.allowed) {
    throw new DailyAiAuthorizationError(authorization.reason ?? "login")
  }

  return callDailyAiTool({
    tool: input.tool,
    input: input.input,
    actionClass: input.actionClass,
    accessToken: input.accessToken!
  })
}
