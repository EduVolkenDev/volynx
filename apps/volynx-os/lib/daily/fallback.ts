import type {
  DailyActionType,
  DailyAiMeta,
  DailyCaptureSource,
  DailyInputType,
  DailyIntent,
  DailyIntentResult,
  DecisionContract,
  SummaryContract,
  TaskExtractionContract,
  WritingContract
} from "@/types/daily"

const taskSignals = [
  "todo",
  "to do",
  "preciso",
  "lembrar",
  "follow up",
  "enviar",
  "fazer",
  "call",
  "reunião",
  "meeting",
  "deadline"
]

const writingSignals = ["escreva", "write", "draft", "post", "email", "thread", "artigo", "copy", "texto"]
const decisionSignals = ["decidir", "decide", "escolher", "choose", "vs", "versus", "opção", "option", "pros", "cons"]
const summarySignals = ["resuma", "summarize", "summary", "resumo", "tldr", "tl;dr"]

function nowIso() {
  return new Date().toISOString()
}

function fallbackAi(engine: DailyAiMeta["engine"], confidence: number, reason: string): DailyAiMeta {
  return {
    engine,
    status: "fallback",
    confidence,
    fallbackUsed: true,
    reason,
    completedAt: nowIso()
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function hasAnySignal(value: string, signals: string[]) {
  const lower = value.toLowerCase()

  return signals.some((signal) => lower.includes(signal))
}

function actionForIntent(intent: DailyIntent): { type: DailyActionType; label: string } {
  if (intent === "task") return { type: "create_task", label: "Create task" }
  if (intent === "summary") return { type: "summarize", label: "Summarize" }
  if (intent === "writing") return { type: "draft_text", label: "Draft text" }
  if (intent === "decision") return { type: "make_decision", label: "Make decision" }
  if (intent === "scanner") return { type: "scan_file", label: "Scan file" }
  if (intent === "search") return { type: "search_context", label: "Search context" }

  return { type: "save_to_vault", label: "Save to Vault" }
}

export function cleanDailyContent(rawContent: string) {
  return normalizeWhitespace(rawContent)
}

export function createDailyTitle(rawContent: string, fallback = "Untitled capture") {
  const cleaned = cleanDailyContent(rawContent)
  if (!cleaned) return fallback

  return cleaned.length > 72 ? `${cleaned.slice(0, 69).trim()}...` : cleaned
}

export function detectDailyInputType(rawContent: string, source?: DailyCaptureSource): DailyInputType {
  if (source?.kind === "file" || source?.filename) return "file"

  const cleaned = cleanDailyContent(rawContent)
  if (!cleaned) return "unknown"

  const hasUrl = /https?:\/\/\S+/i.test(cleaned)
  const onlyUrl = /^https?:\/\/\S+$/i.test(cleaned)

  if (onlyUrl) return "link"
  if (hasUrl) return "mixed"
  if (cleaned.length < 180 && !/[.!?]\s/.test(cleaned)) return "idea"

  return "text"
}

export function createFallbackIntent(rawContent: string, source?: DailyCaptureSource): DailyIntentResult {
  const cleaned = cleanDailyContent(rawContent)
  const inputType = detectDailyInputType(cleaned, source)
  let intent: DailyIntent = "vault"
  let confidence = 0.45
  let reason = "No AI result was available, so the item was saved to Vault."

  if (inputType === "file") {
    intent = "scanner"
    confidence = 0.62
    reason = "File input should be scanned before actions are generated."
  } else if (hasAnySignal(cleaned, decisionSignals)) {
    intent = "decision"
    confidence = 0.58
    reason = "Decision-oriented keywords were detected locally."
  } else if (hasAnySignal(cleaned, taskSignals) || /^[-*]\s+\[[ x]\]/im.test(cleaned)) {
    intent = "task"
    confidence = 0.61
    reason = "Task-oriented keywords were detected locally."
  } else if (hasAnySignal(cleaned, summarySignals) || cleaned.length > 900 || inputType === "link") {
    intent = "summary"
    confidence = 0.55
    reason = "The input looks like source material for summarization."
  } else if (hasAnySignal(cleaned, writingSignals)) {
    intent = "writing"
    confidence = 0.56
    reason = "Writing-oriented keywords were detected locally."
  }

  const action = actionForIntent(intent)

  return {
    intent,
    confidence,
    suggestedActions: [
      {
        type: action.type,
        label: action.label,
        confidence,
        reason
      }
    ],
    entities: [],
    ai: fallbackAi("fallback", confidence, reason)
  }
}

export function createFallbackSummary(rawContent: string): SummaryContract {
  const cleaned = cleanDailyContent(rawContent)
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  const bullets = sentences.slice(0, 3).map((sentence) => sentence.slice(0, 180).trim()).filter(Boolean)
  const summary = cleaned ? (cleaned.length > 280 ? `${cleaned.slice(0, 277).trim()}...` : cleaned) : "No content to summarize yet."

  return {
    summary,
    bullets: bullets.length ? bullets : [summary],
    detailed: cleaned || summary
  }
}

export function createFallbackWriting(rawContent: string): WritingContract {
  const cleaned = cleanDailyContent(rawContent)
  const title = createDailyTitle(cleaned, "Untitled draft")

  return {
    title,
    body: cleaned ? `${cleaned}\n\nDraft note: this version was preserved locally and can be expanded when AI is available.` : "",
    version: 1
  }
}

export function createFallbackTasks(rawContent: string): TaskExtractionContract {
  const cleaned = cleanDailyContent(rawContent)
  const taskLines = rawContent
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+\[[ x]\]\s*/i, "").replace(/^[-*]\s*/, "").trim())
    .filter((line) => line && (hasAnySignal(line, taskSignals) || line.length < 120))

  const tasks = (taskLines.length ? taskLines : cleaned ? [createDailyTitle(cleaned, "Review capture")] : []).map((title) => ({
    title,
    dueDate: null
  }))

  return { tasks }
}

export function createFallbackDecision(rawContent: string): DecisionContract {
  const cleaned = cleanDailyContent(rawContent)

  return {
    recommendation: "Save this decision for review.",
    reason: cleaned
      ? "AI was unavailable, so VOLYNX Daily preserved the decision context and marked it for human review."
      : "No decision context was provided yet.",
    confidence: 0.35,
    options: []
  }
}

