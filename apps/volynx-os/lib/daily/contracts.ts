import type {
  DailyActionType,
  DailyDecisionOption,
  DailyEntity,
  DailyEntityType,
  DailyIntent,
  DailySuggestedAction,
  DecisionContract,
  IntentContract,
  SummaryContract,
  TaskExtractionContract,
  WritingContract
} from "@/types/daily"

export type ContractParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const dailyIntents = new Set<DailyIntent>([
  "task",
  "summary",
  "writing",
  "vault",
  "decision",
  "scanner",
  "search",
  "unknown"
])

const actionTypes = new Set<DailyActionType>([
  "create_task",
  "summarize",
  "draft_text",
  "save_to_vault",
  "make_decision",
  "scan_file",
  "search_context"
])

const entityTypes = new Set<DailyEntityType>([
  "person",
  "company",
  "project",
  "place",
  "date",
  "topic",
  "url",
  "file",
  "unknown"
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseObject(value: unknown): ContractParseResult<Record<string, unknown>> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown

      return isRecord(parsed) ? { ok: true, data: parsed } : { ok: false, error: "Contract JSON must be an object." }
    } catch {
      return { ok: false, error: "Contract payload is not valid JSON." }
    }
  }

  return isRecord(value) ? { ok: true, data: value } : { ok: false, error: "Contract payload must be an object." }
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clampConfidence(value: unknown) {
  return Math.max(0, Math.min(1, asNumber(value, 0)))
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map((item) => asString(item)).filter(Boolean)
}

function asIntent(value: unknown): DailyIntent {
  const intent = asString(value)

  return dailyIntents.has(intent as DailyIntent) ? (intent as DailyIntent) : "unknown"
}

function asActionType(value: unknown): DailyActionType {
  const action = asString(value)

  return actionTypes.has(action as DailyActionType) ? (action as DailyActionType) : "save_to_vault"
}

function asEntityType(value: unknown): DailyEntityType {
  const type = asString(value)

  return entityTypes.has(type as DailyEntityType) ? (type as DailyEntityType) : "unknown"
}

function parseSuggestedActions(value: unknown): DailySuggestedAction[] {
  if (!Array.isArray(value)) return []

  return value.filter(isRecord).map((item) => ({
    type: asActionType(item.type),
    label: asString(item.label, "Save to Vault"),
    confidence: clampConfidence(item.confidence),
    reason: asString(item.reason, "Suggested by the structured contract.")
  }))
}

function parseEntities(value: unknown): DailyEntity[] {
  if (!Array.isArray(value)) return []

  return value.filter(isRecord).map((item, index) => {
    const name = asString(item.name, "Unknown")

    return {
      id: asString(item.id, `entity-${index}`),
      type: asEntityType(item.type),
      name,
      normalizedName: asString(item.normalizedName, name.toLowerCase()),
      confidence: clampConfidence(item.confidence)
    }
  })
}

function parseDecisionOptions(value: unknown): DailyDecisionOption[] {
  if (!Array.isArray(value)) return []

  return value.filter(isRecord).map((item) => ({
    label: asString(item.label, "Option"),
    pros: asStringArray(item.pros),
    cons: asStringArray(item.cons)
  }))
}

function requireString(value: string, field: string): ContractParseResult<string> {
  return value ? { ok: true, data: value } : { ok: false, error: `${field} is required.` }
}

export function parseIntentContract(value: unknown): ContractParseResult<IntentContract> {
  const parsed = parseObject(value)
  if (!parsed.ok) return parsed

  return {
    ok: true,
    data: {
      intent: asIntent(parsed.data.intent),
      confidence: clampConfidence(parsed.data.confidence),
      suggestedActions: parseSuggestedActions(parsed.data.suggestedActions),
      entities: parseEntities(parsed.data.entities)
    }
  }
}

export function parseSummaryContract(value: unknown): ContractParseResult<SummaryContract> {
  const parsed = parseObject(value)
  if (!parsed.ok) return parsed

  const summary = requireString(asString(parsed.data.summary), "summary")
  if (!summary.ok) return summary

  return {
    ok: true,
    data: {
      summary: summary.data,
      bullets: asStringArray(parsed.data.bullets),
      detailed: asString(parsed.data.detailed, summary.data)
    }
  }
}

export function parseWritingContract(value: unknown): ContractParseResult<WritingContract> {
  const parsed = parseObject(value)
  if (!parsed.ok) return parsed

  const body = requireString(asString(parsed.data.body), "body")
  if (!body.ok) return body

  return {
    ok: true,
    data: {
      title: asString(parsed.data.title, "Untitled draft"),
      body: body.data,
      version: Math.max(1, Math.floor(asNumber(parsed.data.version, 1)))
    }
  }
}

export function parseTaskExtractionContract(value: unknown): ContractParseResult<TaskExtractionContract> {
  const parsed = parseObject(value)
  if (!parsed.ok) return parsed

  const tasks = Array.isArray(parsed.data.tasks)
    ? parsed.data.tasks.filter(isRecord).map((item) => ({
        title: asString(item.title),
        dueDate: asString(item.dueDate) || null
      })).filter((item) => item.title)
    : []

  return { ok: true, data: { tasks } }
}

export function parseDecisionContract(value: unknown): ContractParseResult<DecisionContract> {
  const parsed = parseObject(value)
  if (!parsed.ok) return parsed

  const recommendation = requireString(asString(parsed.data.recommendation), "recommendation")
  if (!recommendation.ok) return recommendation

  return {
    ok: true,
    data: {
      recommendation: recommendation.data,
      reason: asString(parsed.data.reason, "Generated from the structured decision contract."),
      confidence: clampConfidence(parsed.data.confidence),
      options: parseDecisionOptions(parsed.data.options)
    }
  }
}

export const dailyContractExamples = {
  intent: {
    intent: "task",
    confidence: 0.82,
    suggestedActions: [
      {
        type: "create_task",
        label: "Create task",
        confidence: 0.82,
        reason: "The input contains an explicit action."
      }
    ],
    entities: []
  },
  summary: {
    summary: "Short summary.",
    bullets: ["Key point"],
    detailed: "Detailed summary."
  },
  writing: {
    title: "Draft title",
    body: "Draft body.",
    version: 1
  },
  tasks: {
    tasks: [{ title: "Follow up", dueDate: null }]
  },
  decision: {
    recommendation: "Choose the lower-risk option.",
    reason: "It preserves optionality.",
    confidence: 0.7,
    options: []
  }
} as const

