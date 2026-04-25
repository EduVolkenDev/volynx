import type { DailyActionType, DailyItem } from "@/types/daily"

export type DailyRouteKind = "task" | "summary" | "writing" | "decision" | "vault"

export type DailyRoute = {
  kind: DailyRouteKind
  action: DailyActionType
  label: string
  reason: string
  confidence: number
}

export type ParsedDecisionInput = {
  optionA: string
  optionB: string
  criteria: string
}

export function routeDailyItem(item: DailyItem): DailyRoute {
  const suggested = item.intent.suggestedActions[0]

  if (item.intent.intent === "task" || suggested?.type === "create_task") {
    return {
      kind: "task",
      action: "create_task",
      label: "Create task",
      reason: suggested?.reason ?? "The input looks actionable.",
      confidence: Math.max(item.intent.confidence, suggested?.confidence ?? 0)
    }
  }

  if (item.intent.intent === "decision" || parseDecisionInput(item.cleanContent)) {
    return {
      kind: "decision",
      action: "make_decision",
      label: "Compare options",
      reason: suggested?.reason ?? "The input appears to compare options.",
      confidence: Math.max(item.intent.confidence, suggested?.confidence ?? 0.55)
    }
  }

  if (item.intent.intent === "writing" || suggested?.type === "draft_text") {
    return {
      kind: "writing",
      action: "draft_text",
      label: "Draft text",
      reason: suggested?.reason ?? "The input looks like material for writing.",
      confidence: Math.max(item.intent.confidence, suggested?.confidence ?? 0)
    }
  }

  if (item.intent.intent === "summary" || suggested?.type === "summarize") {
    return {
      kind: "summary",
      action: "summarize",
      label: "Summarize",
      reason: suggested?.reason ?? "The input looks like source material.",
      confidence: Math.max(item.intent.confidence, suggested?.confidence ?? 0)
    }
  }

  return {
    kind: "vault",
    action: "save_to_vault",
    label: "Save to Vault",
    reason: suggested?.reason ?? "The input was preserved for later use.",
    confidence: Math.max(item.intent.confidence, suggested?.confidence ?? 0.4)
  }
}

export function parseDecisionInput(content: string): ParsedDecisionInput | null {
  const normalized = content.trim()
  if (!normalized) return null

  const versusMatch = normalized.match(/^(.+?)\s+(?:vs\.?|versus|ou)\s+(.+?)(?:\s+(?:porque|considerando|criteria:|critério:)\s+(.+))?$/i)
  if (!versusMatch) return null

  const optionA = versusMatch[1]?.trim()
  const optionB = versusMatch[2]?.trim()
  const criteria = versusMatch[3]?.trim() ?? ""

  if (!optionA || !optionB || optionA.length > 120 || optionB.length > 120) return null

  return { optionA, optionB, criteria }
}

