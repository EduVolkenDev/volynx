import type { DailyCaptureSource, DailyDecision, DailyId, DailyItem, DailySummary, DailyTask, DailyWriting } from "@/types/daily"
import { cleanDailyContent, createDailyTitle, detectDailyInputType } from "@/lib/daily/fallback"
import { classifyDailyIntent } from "@/lib/daily/intent-engine"

export const DAILY_LOCAL_USER_ID = "local-user"
export const DAILY_ITEMS_STORAGE_KEY = "volynx-daily:v1:items"
export const DAILY_DECISIONS_STORAGE_KEY = "volynx-daily:v1:decisions"
export const DAILY_SUMMARIES_STORAGE_KEY = "volynx-daily:v1:summaries"
export const DAILY_TASKS_STORAGE_KEY = "volynx-daily:v1:tasks"
export const DAILY_WRITINGS_STORAGE_KEY = "volynx-daily:v1:writings"
export const DAILY_ITEMS_UPDATED_EVENT = "volynx-daily:items-updated"
export const DAILY_DECISIONS_UPDATED_EVENT = "volynx-daily:decisions-updated"
export const DAILY_SUMMARIES_UPDATED_EVENT = "volynx-daily:summaries-updated"
export const DAILY_TASKS_UPDATED_EVENT = "volynx-daily:tasks-updated"
export const DAILY_WRITINGS_UPDATED_EVENT = "volynx-daily:writings-updated"

export type CreateDailyItemInput = {
  id?: DailyId
  userId?: DailyId
  rawContent: string
  source?: DailyCaptureSource
}

export function createDailyId(prefix = "daily"): DailyId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export async function createDailyItemRecord(input: CreateDailyItemInput): Promise<DailyItem> {
  const now = new Date().toISOString()
  const cleanContent = cleanDailyContent(input.rawContent)
  const intent = await classifyDailyIntent({
    rawContent: input.rawContent,
    source: input.source
  })

  return {
    id: input.id ?? createDailyId("item"),
    userId: input.userId ?? DAILY_LOCAL_USER_ID,
    type: detectDailyInputType(input.rawContent, input.source),
    title: createDailyTitle(input.rawContent),
    rawContent: input.rawContent,
    cleanContent,
    intent,
    status: "ready",
    source: input.source,
    createdAt: now,
    updatedAt: now
  }
}

export function readDailyItemsFromLocalStorage(): DailyItem[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(DAILY_ITEMS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed) ? (parsed.filter(isDailyItemLike) as DailyItem[]) : []
  } catch {
    return []
  }
}

export function writeDailyItemsToLocalStorage(items: DailyItem[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_ITEMS_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(DAILY_ITEMS_UPDATED_EVENT, { detail: { items } }))
}

export function upsertDailyItemLocal(item: DailyItem) {
  const current = readDailyItemsFromLocalStorage()
  const withoutExisting = current.filter((existing) => existing.id !== item.id)
  const next = [item, ...withoutExisting]

  writeDailyItemsToLocalStorage(next)

  return next
}

export function removeDailyItemLocal(itemId: DailyId) {
  const next = readDailyItemsFromLocalStorage().filter((item) => item.id !== itemId)

  writeDailyItemsToLocalStorage(next)

  return next
}

export function readDailyDecisionsFromLocalStorage(): DailyDecision[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(DAILY_DECISIONS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed) ? (parsed.filter(isDailyDecisionLike) as DailyDecision[]) : []
  } catch {
    return []
  }
}

export function writeDailyDecisionsToLocalStorage(decisions: DailyDecision[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_DECISIONS_STORAGE_KEY, JSON.stringify(decisions))
  window.dispatchEvent(new CustomEvent(DAILY_DECISIONS_UPDATED_EVENT, { detail: { decisions } }))
}

export function upsertDailyDecisionLocal(decision: DailyDecision) {
  const current = readDailyDecisionsFromLocalStorage()
  const withoutExisting = current.filter((existing) => existing.id !== decision.id)
  const next = [decision, ...withoutExisting]

  writeDailyDecisionsToLocalStorage(next)

  return next
}

export function readDailySummariesFromLocalStorage(): DailySummary[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(DAILY_SUMMARIES_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed) ? (parsed.filter(isDailySummaryLike) as DailySummary[]) : []
  } catch {
    return []
  }
}

export function writeDailySummariesToLocalStorage(summaries: DailySummary[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_SUMMARIES_STORAGE_KEY, JSON.stringify(summaries))
  window.dispatchEvent(new CustomEvent(DAILY_SUMMARIES_UPDATED_EVENT, { detail: { summaries } }))
}

export function upsertDailySummaryLocal(summary: DailySummary) {
  const current = readDailySummariesFromLocalStorage()
  const withoutExisting = current.filter((existing) => existing.id !== summary.id)
  const next = [summary, ...withoutExisting]

  writeDailySummariesToLocalStorage(next)

  return next
}

export function readDailyTasksFromLocalStorage(): DailyTask[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(DAILY_TASKS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed) ? (parsed.filter(isDailyTaskLike) as DailyTask[]) : []
  } catch {
    return []
  }
}

export function writeDailyTasksToLocalStorage(tasks: DailyTask[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(tasks))
  window.dispatchEvent(new CustomEvent(DAILY_TASKS_UPDATED_EVENT, { detail: { tasks } }))
}

export function upsertDailyTaskLocal(task: DailyTask) {
  const current = readDailyTasksFromLocalStorage()
  const withoutExisting = current.filter((existing) => existing.id !== task.id)
  const duplicate = withoutExisting.find(
    (existing) => existing.sourceItemId === task.sourceItemId && existing.title.toLowerCase() === task.title.toLowerCase()
  )
  const next = duplicate ? withoutExisting : [task, ...withoutExisting]

  writeDailyTasksToLocalStorage(next)

  return next
}

export function upsertDailyTasksLocal(tasks: DailyTask[]) {
  let next = readDailyTasksFromLocalStorage()

  for (const task of tasks) {
    const withoutExisting = next.filter((existing) => existing.id !== task.id)
    const duplicate = withoutExisting.find(
      (existing) => existing.sourceItemId === task.sourceItemId && existing.title.toLowerCase() === task.title.toLowerCase()
    )
    next = duplicate ? withoutExisting : [task, ...withoutExisting]
  }

  writeDailyTasksToLocalStorage(next)

  return next
}

export function readDailyWritingsFromLocalStorage(): DailyWriting[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(DAILY_WRITINGS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed) ? (parsed.filter(isDailyWritingLike) as DailyWriting[]) : []
  } catch {
    return []
  }
}

export function writeDailyWritingsToLocalStorage(writings: DailyWriting[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_WRITINGS_STORAGE_KEY, JSON.stringify(writings))
  window.dispatchEvent(new CustomEvent(DAILY_WRITINGS_UPDATED_EVENT, { detail: { writings } }))
}

export function upsertDailyWritingLocal(writing: DailyWriting) {
  const current = readDailyWritingsFromLocalStorage()
  const withoutExisting = current.filter((existing) => existing.id !== writing.id)
  const next = [writing, ...withoutExisting]

  writeDailyWritingsToLocalStorage(next)

  return next
}

function isDailyItemLike(value: unknown): value is DailyItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false

  const item = value as Partial<DailyItem>

  return (
    typeof item.id === "string" &&
    typeof item.userId === "string" &&
    typeof item.title === "string" &&
    typeof item.rawContent === "string" &&
    typeof item.cleanContent === "string" &&
    typeof item.createdAt === "string"
  )
}

function isDailyDecisionLike(value: unknown): value is DailyDecision {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false

  const decision = value as Partial<DailyDecision>

  return (
    typeof decision.id === "string" &&
    typeof decision.userId === "string" &&
    typeof decision.sourceItemId === "string" &&
    typeof decision.recommendation === "string" &&
    typeof decision.reason === "string" &&
    typeof decision.confidence === "number" &&
    Array.isArray(decision.options) &&
    typeof decision.createdAt === "string"
  )
}

function isDailySummaryLike(value: unknown): value is DailySummary {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false

  const summary = value as Partial<DailySummary>

  return (
    typeof summary.id === "string" &&
    typeof summary.userId === "string" &&
    typeof summary.sourceItemId === "string" &&
    typeof summary.summaryText === "string" &&
    typeof summary.detailedText === "string" &&
    Array.isArray(summary.bullets) &&
    typeof summary.createdAt === "string"
  )
}

function isDailyTaskLike(value: unknown): value is DailyTask {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false

  const task = value as Partial<DailyTask>

  return (
    typeof task.id === "string" &&
    typeof task.userId === "string" &&
    typeof task.title === "string" &&
    typeof task.status === "string" &&
    typeof task.sourceItemId === "string" &&
    typeof task.createdAt === "string"
  )
}

function isDailyWritingLike(value: unknown): value is DailyWriting {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false

  const writing = value as Partial<DailyWriting>

  return (
    typeof writing.id === "string" &&
    typeof writing.userId === "string" &&
    typeof writing.title === "string" &&
    typeof writing.body === "string" &&
    typeof writing.version === "number" &&
    typeof writing.createdAt === "string"
  )
}
