export type DailyId = string
export type DailyIsoDate = string

export type DailyInputType = "text" | "link" | "file" | "idea" | "mixed" | "unknown"

export type DailyIntent =
  | "task"
  | "summary"
  | "writing"
  | "vault"
  | "decision"
  | "scanner"
  | "search"
  | "unknown"

export type DailyItemStatus = "captured" | "processing" | "ready" | "needs_review" | "failed" | "archived"

export type DailyTaskStatus = "todo" | "doing" | "done" | "blocked" | "archived"

export type DailyRelationType =
  | "source_of"
  | "derived_from"
  | "mentions"
  | "related_to"
  | "duplicates"
  | "supports"
  | "contradicts"

export type DailyEntityType = "person" | "company" | "project" | "place" | "date" | "topic" | "url" | "file" | "unknown"

export type DailyActionType =
  | "create_task"
  | "summarize"
  | "draft_text"
  | "save_to_vault"
  | "make_decision"
  | "scan_file"
  | "search_context"

export type DailyAiEngine =
  | "intent"
  | "summary"
  | "writing"
  | "task"
  | "decision"
  | "context"
  | "scanner"
  | "fallback"

export type DailyAiStatus = "not_started" | "processing" | "completed" | "fallback" | "failed"

export type DailyAiMeta = {
  engine: DailyAiEngine
  status: DailyAiStatus
  model?: string
  confidence: number
  fallbackUsed: boolean
  reason?: string
  error?: string
  completedAt?: DailyIsoDate
}

export type DailySuggestedAction = {
  type: DailyActionType
  label: string
  confidence: number
  reason: string
}

export type DailyIntentResult = {
  intent: DailyIntent
  confidence: number
  suggestedActions: DailySuggestedAction[]
  entities: DailyEntity[]
  ai: DailyAiMeta
}

export type DailyCaptureSource = {
  kind: DailyInputType
  url?: string
  filename?: string
  mimeType?: string
  sizeBytes?: number
  textExtracted?: boolean
  truncated?: boolean
}

export type DailyItem = {
  id: DailyId
  userId: DailyId
  type: DailyInputType
  title: string
  rawContent: string
  cleanContent: string
  intent: DailyIntentResult
  status: DailyItemStatus
  source?: DailyCaptureSource
  createdAt: DailyIsoDate
  updatedAt: DailyIsoDate
}

export type DailyTask = {
  id: DailyId
  userId: DailyId
  title: string
  status: DailyTaskStatus
  dueDate: DailyIsoDate | null
  sourceItemId: DailyId
  createdAt: DailyIsoDate
  updatedAt: DailyIsoDate
}

export type DailySummary = {
  id: DailyId
  userId: DailyId
  sourceItemId: DailyId
  summaryText: string
  detailedText: string
  bullets: string[]
  ai: DailyAiMeta
  createdAt: DailyIsoDate
  updatedAt: DailyIsoDate
}

export type DailyWriting = {
  id: DailyId
  userId: DailyId
  sourceItemId: DailyId | null
  title: string
  body: string
  version: number
  autosavedAt: DailyIsoDate | null
  ai: DailyAiMeta
  createdAt: DailyIsoDate
  updatedAt: DailyIsoDate
}

export type DailyEntity = {
  id: DailyId
  userId?: DailyId
  type: DailyEntityType
  name: string
  normalizedName: string
  sourceItemId?: DailyId
  confidence: number
  createdAt?: DailyIsoDate
}

export type DailyRelation = {
  id: DailyId
  userId: DailyId
  type: DailyRelationType
  fromItemId: DailyId
  toItemId?: DailyId
  toEntityId?: DailyId
  confidence: number
  reason: string
  createdAt: DailyIsoDate
}

export type DailyDecisionOption = {
  label: string
  pros: string[]
  cons: string[]
}

export type DailyDecision = {
  id: DailyId
  userId: DailyId
  sourceItemId: DailyId
  recommendation: string
  reason: string
  confidence: number
  options: DailyDecisionOption[]
  ai: DailyAiMeta
  createdAt: DailyIsoDate
  updatedAt: DailyIsoDate
}

export type DailyVaultRecord = {
  item: DailyItem
  tasks: DailyTask[]
  summaries: DailySummary[]
  writings: DailyWriting[]
  decisions: DailyDecision[]
  entities: DailyEntity[]
  relations: DailyRelation[]
}

export type DailySearchResult = {
  item: DailyItem
  score: number
  matchedFields: Array<"title" | "rawContent" | "cleanContent" | "entity" | "task" | "summary" | "writing">
  highlights: string[]
}

export type IntentContract = {
  intent: DailyIntent
  confidence: number
  suggestedActions: DailySuggestedAction[]
  entities: DailyEntity[]
}

export type SummaryContract = {
  summary: string
  bullets: string[]
  detailed: string
}

export type WritingContract = {
  title: string
  body: string
  version: number
}

export type TaskExtractionContract = {
  tasks: Array<{
    title: string
    dueDate: DailyIsoDate | null
  }>
}

export type DecisionContract = {
  recommendation: string
  reason: string
  confidence: number
  options: DailyDecisionOption[]
}
