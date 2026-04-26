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
  "action item",
  "action items",
  "next step",
  "next steps",
  "preciso",
  "lembrar",
  "follow up",
  "follow-up",
  "reply",
  "enviar",
  "fazer",
  "call",
  "deadline"
]

const writingSignals = ["escreva", "write", "draft", "post", "email", "thread", "artigo", "copy", "texto"]
const strongWritingSignals = ["escreva", "write", "draft"]
const decisionSignals = ["decidir", "decide", "escolher", "choose", "vs", "versus", "opção", "option", "pros", "cons"]
const summarySignals = ["resuma", "summarize", "summary", "resumo", "tldr", "tl;dr"]
const searchSignals = ["find", "search", "lookup", "look up", "where did", "where is", "show me", "pull up"]
const taskSectionSignals = [/^action items?[:\s]*$/i, /^next steps?[:\s]*$/i, /^follow[- ]ups?[:\s]*$/i, /^tasks?[:\s]*$/i, /^todos?[:\s]*$/i]
const taskPrefixPattern = /^((?:[-*]|\d+\.)\s+|\[[ x]\]\s*|(?:todo|task|action item|action items|next step|next steps|follow[- ]up|follow[- ]ups)\s*:\s*)/i
const taskStarterPattern = /^(send|review|book|schedule|call|email|reply|follow up|follow-up|update|confirm|prepare|fix|check|draft|write|share|ship|upload|pay|plan|compare|decide)\b/i
const nonTaskHeadings = [/^meeting notes?[:\s]*$/i, /^notes?[:\s]*$/i, /^summary[:\s]*$/i, /^context[:\s]*$/i, /^background[:\s]*$/i, /^decision[:\s]*$/i]
const weekdayPattern = /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
const relativeDatePattern = /\b(today|tomorrow|tonight|eod|end of day|next week)\b/i
const isoDatePattern = /\b(\d{4}-\d{2}-\d{2})\b/
const slashDatePattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/
const weekdayIndexes: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

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

  return signals.some((signal) => {
    const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    if (/^[a-z0-9 -]+$/i.test(signal)) {
      return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(lower)
    }

    return lower.includes(signal)
  })
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
  } else if (hasAnySignal(cleaned, searchSignals)) {
    intent = "search"
    confidence = 0.57
    reason = "The input looks like a context retrieval request."
  } else if (hasAnySignal(cleaned, decisionSignals)) {
    intent = "decision"
    confidence = 0.58
    reason = "Decision-oriented keywords were detected locally."
  } else if (hasAnySignal(cleaned, strongWritingSignals)) {
    intent = "writing"
    confidence = 0.63
    reason = "Explicit drafting language was detected locally."
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

export function createFallbackTasks(rawContent: string, referenceDate = new Date()): TaskExtractionContract {
  const cleaned = cleanDailyContent(rawContent)
  const candidates = collectTaskCandidates(rawContent)
  const seen = new Set<string>()
  const tasks = candidates
    .map((candidate) => normalizeTaskCandidate(candidate, referenceDate))
    .filter((task): task is { title: string; dueDate: string | null } => Boolean(task?.title))
    .filter((task) => {
      const key = `${task.title.toLowerCase()}::${task.dueDate ?? ""}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  if (!tasks.length && cleaned) {
    return {
      tasks: [{
        title: createDailyTitle(cleaned, "Review capture"),
        dueDate: null
      }]
    }
  }

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

function collectTaskCandidates(rawContent: string) {
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const candidates: string[] = []
  let inTaskSection = false

  for (const line of lines) {
    if (taskSectionSignals.some((pattern) => pattern.test(line))) {
      inTaskSection = true
      continue
    }

    if (nonTaskHeadings.some((pattern) => pattern.test(line))) {
      inTaskSection = false
      continue
    }

    if (inTaskSection || isLikelyTaskCandidate(line)) {
      candidates.push(line)
    }
  }

  if (candidates.length) {
    return candidates
  }

  return rawContent
    .split(/[\n.;]+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment && isLikelyTaskCandidate(fragment))
}

function isLikelyTaskCandidate(line: string) {
  if (!line || nonTaskHeadings.some((pattern) => pattern.test(line))) return false
  if (taskPrefixPattern.test(line)) return true
  if (taskStarterPattern.test(stripTaskPrefix(line))) return true
  if (hasAnySignal(line, taskSignals)) return true
  if (relativeDatePattern.test(line) || weekdayPattern.test(line) || isoDatePattern.test(line) || slashDatePattern.test(line)) return true
  if (/^[-*]\s+\[[ x]\]/i.test(line)) return true

  return false
}

function normalizeTaskCandidate(candidate: string, referenceDate: Date) {
  const stripped = stripTaskPrefix(candidate)
  const dated = extractDueDate(stripped, referenceDate)
  const title = cleanupTaskTitle(dated.text)

  if (!title || title.length < 3) return null
  if (nonTaskHeadings.some((pattern) => pattern.test(title))) return null

  return {
    title,
    dueDate: dated.dueDate
  }
}

function stripTaskPrefix(value: string) {
  return value
    .replace(/^[-*]\s+\[[ x]\]\s*/i, "")
    .replace(/^[-*]\s*/i, "")
    .replace(/^\d+\.\s*/i, "")
    .replace(/^(?:todo|task|tasks|action item|action items|next step|next steps|follow[- ]up|follow[- ]ups)\s*:\s*/i, "")
    .trim()
}

function cleanupTaskTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[—–:,\-]+\s*/, "")
    .replace(/\s*[—–:,\-]+\s*$/, "")
    .trim()
}

function extractDueDate(value: string, referenceDate: Date) {
  const base = startOfUtcDay(referenceDate)

  const isoMatch = value.match(isoDatePattern)
  if (isoMatch) {
    return {
      dueDate: isoMatch[1],
      text: cleanupTaskTitle(value.replace(isoMatch[0], ""))
    }
  }

  const slashMatch = value.match(slashDatePattern)
  if (slashMatch) {
    const parsed = parseSlashDate(slashMatch[1], slashMatch[2], slashMatch[3], base)
    if (parsed) {
      return {
        dueDate: parsed,
        text: cleanupTaskTitle(value.replace(slashMatch[0], ""))
      }
    }
  }

  const relativeMatch = value.match(relativeDatePattern)
  if (relativeMatch) {
    const keyword = relativeMatch[1].toLowerCase()
    const dueDate = keyword === "tomorrow"
      ? formatIsoDate(addUtcDays(base, 1))
      : keyword === "next week"
        ? formatIsoDate(addUtcDays(base, 7))
        : formatIsoDate(base)

    return {
      dueDate,
      text: cleanupTaskTitle(value.replace(relativeMatch[0], ""))
    }
  }

  const weekdayMatch = value.match(weekdayPattern)
  if (weekdayMatch) {
    const weekday = weekdayMatch[2].toLowerCase()
    const nextWeek = Boolean(weekdayMatch[1])
    const dueDate = formatIsoDate(resolveWeekday(base, weekday, nextWeek))

    return {
      dueDate,
      text: cleanupTaskTitle(value.replace(weekdayMatch[0], ""))
    }
  }

  return { dueDate: null, text: value }
}

function startOfUtcDay(referenceDate: Date) {
  return new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  ))
}

function addUtcDays(referenceDate: Date, days: number) {
  const next = new Date(referenceDate)
  next.setUTCDate(next.getUTCDate() + days)
  return startOfUtcDay(next)
}

function formatIsoDate(referenceDate: Date) {
  return referenceDate.toISOString().slice(0, 10)
}

function resolveWeekday(referenceDate: Date, weekday: string, nextWeek: boolean) {
  const targetDay = weekdayIndexes[weekday]
  const currentDay = referenceDate.getUTCDay()
  let delta = (targetDay - currentDay + 7) % 7

  if (delta === 0 || nextWeek) {
    delta += 7
  }

  return addUtcDays(referenceDate, delta)
}

function parseSlashDate(dayValue: string, monthValue: string, yearValue: string | undefined, referenceDate: Date) {
  const day = Number(dayValue)
  const month = Number(monthValue)
  const currentYear = referenceDate.getUTCFullYear()
  const parsedYear = yearValue
    ? Number(yearValue.length === 2 ? `20${yearValue}` : yearValue)
    : currentYear

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(parsedYear)) {
    return null
  }

  const candidate = new Date(Date.UTC(parsedYear, month - 1, day))
  if (
    candidate.getUTCFullYear() !== parsedYear ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null
  }

  return formatIsoDate(candidate)
}
