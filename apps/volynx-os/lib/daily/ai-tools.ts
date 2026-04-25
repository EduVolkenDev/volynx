export type DailyAiTool = "summary" | "writing" | "decision"
export type DailyAiActionClass = "light" | "medium" | "pro"

type AuthorizeInput = {
  tool: DailyAiTool
  actionClass: DailyAiActionClass
  accessToken?: string | null
}

type CallAiInput = {
  tool: DailyAiTool
  input: Record<string, string>
  lite: boolean
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

  const functionsUrl = getDailyFunctionsUrl()

  try {
    const response = await fetch(`${functionsUrl}/deduct-tokens`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.accessToken}`
      },
      body: JSON.stringify({
        tool: input.tool,
        action_class: input.actionClass,
        description: `AI ${input.tool}`
      })
    })
    const data = (await response.json()) as { ok?: boolean; error?: string }

    if (data.ok) {
      return { allowed: true, lite: false }
    }

    if (data.error === "insufficient_balance") {
      const permissionResponse = await fetch(`${functionsUrl}/check-permission`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${input.accessToken}`
        },
        body: JSON.stringify({ tool: input.tool })
      })
      const permission = (await permissionResponse.json()) as { allowed?: boolean; remaining?: number }

      if (permission.allowed && (permission.remaining ?? 0) > 0) {
        return { allowed: true, lite: true }
      }

      return { allowed: false, reason: "tokens" as const, lite: false }
    }

    return { allowed: true, lite: false }
  } catch {
    return { allowed: true, lite: false }
  }
}

export async function callDailyAiTool(input: CallAiInput) {
  const functionsUrl = getDailyFunctionsUrl()
  const response = await fetch(`${functionsUrl}/ai-tools`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tool: input.tool,
      input: input.input,
      lite: input.lite
    })
  })
  const data = (await response.json()) as AiToolsResponse

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
    lite: authorization.lite
  })
}
