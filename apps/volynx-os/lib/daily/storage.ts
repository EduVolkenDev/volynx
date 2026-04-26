import { createClient } from "@supabase/supabase-js"
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
export const DAILY_SYNC_UPDATED_EVENT = "volynx-daily:sync-updated"

const DAILY_SYNC_STATE_STORAGE_KEY = "volynx-daily:v1:sync-state"
const DAILY_SYNC_DEBOUNCE_MS = 900
const DAILY_REMOTE_VERSION = 1

type DailySyncMode = "local" | "syncing" | "synced" | "error"

export type DailySyncState = {
  mode: DailySyncMode
  message: string
  lastSyncedAt: string | null
}

type DailyWriteOptions = {
  skipRemoteSync?: boolean
}

type DailyRemoteKind = "items" | "decisions" | "summaries" | "tasks" | "writings"

type DailyRemoteRow = {
  tool_name: string
  data: unknown
  updated_at?: string | null
}

type DailyRemotePayload<T> = {
  version: number
  records: T[]
  syncedAt: string
}

const defaultDailySyncState: DailySyncState = {
  mode: "local",
  message: "Local cache only.",
  lastSyncedAt: null
}

const dailyRemoteMeta: Record<DailyRemoteKind, { toolName: string }> = {
  items: { toolName: "daily_items" },
  decisions: { toolName: "daily_decisions" },
  summaries: { toolName: "daily_summaries" },
  tasks: { toolName: "daily_tasks" },
  writings: { toolName: "daily_writings" }
}

const remoteSyncTimers = new Map<DailyRemoteKind, number>()
let remoteHydrationPromise: Promise<void> | null = null

export type CreateDailyItemInput = {
  id?: DailyId
  userId?: DailyId
  rawContent: string
  source?: DailyCaptureSource
  accessToken?: string | null
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
    source: input.source,
    accessToken: input.accessToken
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

export async function hydrateDailyLocalStateFromRemote() {
  if (typeof window === "undefined") return
  if (remoteHydrationPromise) return remoteHydrationPromise

  const accessToken = getStoredVolynxAccessToken()
  const userId = accessToken ? getUserIdFromAccessToken(accessToken) : null

  if (!accessToken || !userId) {
    updateDailySyncState(defaultDailySyncState)
    return
  }

  remoteHydrationPromise = (async () => {
    updateDailySyncState({
      mode: "syncing",
      message: "Syncing Daily workspace...",
      lastSyncedAt: readDailySyncState().lastSyncedAt
    })

    const client = createDailyDataClient(accessToken)
    if (!client) {
      updateDailySyncState({
        mode: "error",
        message: "Supabase is not configured for Daily sync.",
        lastSyncedAt: readDailySyncState().lastSyncedAt
      })
      return
    }

    const toolNames = Object.values(dailyRemoteMeta).map((entry) => entry.toolName)
    const { data, error } = await client
      .from("daily_data")
      .select("tool_name,data,updated_at")
      .in("tool_name", toolNames)

    if (error) {
      updateDailySyncState({
        mode: "error",
        message: error.message || "Daily sync failed.",
        lastSyncedAt: readDailySyncState().lastSyncedAt
      })
      return
    }

    const rows = (data || []) as DailyRemoteRow[]

    mergeRemoteCollection({
      kind: "items",
      rows,
      userId,
      readLocal: readDailyItemsFromLocalStorage,
      writeLocal: writeDailyItemsToLocalStorage,
      validator: isDailyItemLike
    })
    mergeRemoteCollection({
      kind: "decisions",
      rows,
      userId,
      readLocal: readDailyDecisionsFromLocalStorage,
      writeLocal: writeDailyDecisionsToLocalStorage,
      validator: isDailyDecisionLike
    })
    mergeRemoteCollection({
      kind: "summaries",
      rows,
      userId,
      readLocal: readDailySummariesFromLocalStorage,
      writeLocal: writeDailySummariesToLocalStorage,
      validator: isDailySummaryLike
    })
    mergeRemoteCollection({
      kind: "tasks",
      rows,
      userId,
      readLocal: readDailyTasksFromLocalStorage,
      writeLocal: writeDailyTasksToLocalStorage,
      validator: isDailyTaskLike
    })
    mergeRemoteCollection({
      kind: "writings",
      rows,
      userId,
      readLocal: readDailyWritingsFromLocalStorage,
      writeLocal: writeDailyWritingsToLocalStorage,
      validator: isDailyWritingLike
    })

    const now = new Date().toISOString()
    updateDailySyncState({
      mode: "synced",
      message: "Daily synced to your account.",
      lastSyncedAt: now
    })

    scheduleAllDailyRemoteSync()
  })().finally(() => {
    remoteHydrationPromise = null
  })

  return remoteHydrationPromise
}

export function readDailySyncState(): DailySyncState {
  if (typeof window === "undefined") return defaultDailySyncState

  try {
    const raw = window.localStorage.getItem(DAILY_SYNC_STATE_STORAGE_KEY)
    if (!raw) return defaultDailySyncState

    const parsed = JSON.parse(raw) as Partial<DailySyncState>

    return {
      mode: isValidDailySyncMode(parsed.mode) ? parsed.mode : defaultDailySyncState.mode,
      message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : defaultDailySyncState.message,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null
    }
  } catch {
    return defaultDailySyncState
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

export function writeDailyItemsToLocalStorage(items: DailyItem[], options: DailyWriteOptions = {}) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_ITEMS_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(DAILY_ITEMS_UPDATED_EVENT, { detail: { items } }))
  if (!options.skipRemoteSync) scheduleDailyRemoteSync("items")
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

export function writeDailyDecisionsToLocalStorage(decisions: DailyDecision[], options: DailyWriteOptions = {}) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_DECISIONS_STORAGE_KEY, JSON.stringify(decisions))
  window.dispatchEvent(new CustomEvent(DAILY_DECISIONS_UPDATED_EVENT, { detail: { decisions } }))
  if (!options.skipRemoteSync) scheduleDailyRemoteSync("decisions")
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

export function writeDailySummariesToLocalStorage(summaries: DailySummary[], options: DailyWriteOptions = {}) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_SUMMARIES_STORAGE_KEY, JSON.stringify(summaries))
  window.dispatchEvent(new CustomEvent(DAILY_SUMMARIES_UPDATED_EVENT, { detail: { summaries } }))
  if (!options.skipRemoteSync) scheduleDailyRemoteSync("summaries")
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

export function writeDailyTasksToLocalStorage(tasks: DailyTask[], options: DailyWriteOptions = {}) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(tasks))
  window.dispatchEvent(new CustomEvent(DAILY_TASKS_UPDATED_EVENT, { detail: { tasks } }))
  if (!options.skipRemoteSync) scheduleDailyRemoteSync("tasks")
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

export function writeDailyWritingsToLocalStorage(writings: DailyWriting[], options: DailyWriteOptions = {}) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_WRITINGS_STORAGE_KEY, JSON.stringify(writings))
  window.dispatchEvent(new CustomEvent(DAILY_WRITINGS_UPDATED_EVENT, { detail: { writings } }))
  if (!options.skipRemoteSync) scheduleDailyRemoteSync("writings")
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

function isValidDailySyncMode(value: unknown): value is DailySyncMode {
  return value === "local" || value === "syncing" || value === "synced" || value === "error"
}

function updateDailySyncState(state: DailySyncState) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(DAILY_SYNC_STATE_STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(DAILY_SYNC_UPDATED_EVENT, { detail: { state } }))
}

function scheduleAllDailyRemoteSync() {
  scheduleDailyRemoteSync("items")
  scheduleDailyRemoteSync("decisions")
  scheduleDailyRemoteSync("summaries")
  scheduleDailyRemoteSync("tasks")
  scheduleDailyRemoteSync("writings")
}

function scheduleDailyRemoteSync(kind: DailyRemoteKind) {
  if (typeof window === "undefined") return

  const accessToken = getStoredVolynxAccessToken()
  const userId = accessToken ? getUserIdFromAccessToken(accessToken) : null

  if (!accessToken || !userId) {
    updateDailySyncState(defaultDailySyncState)
    return
  }

  const existing = remoteSyncTimers.get(kind)
  if (existing) {
    clearTimeout(existing)
  }

  updateDailySyncState({
    mode: "syncing",
    message: "Syncing Daily workspace...",
    lastSyncedAt: readDailySyncState().lastSyncedAt
  })

  const timeout = window.setTimeout(() => {
    remoteSyncTimers.delete(kind)
    void syncDailyRemoteCollection(kind, accessToken, userId)
  }, DAILY_SYNC_DEBOUNCE_MS)

  remoteSyncTimers.set(kind, timeout)
}

async function syncDailyRemoteCollection(kind: DailyRemoteKind, accessToken: string, userId: string) {
  const client = createDailyDataClient(accessToken)
  if (!client) {
    updateDailySyncState({
      mode: "error",
      message: "Supabase is not configured for Daily sync.",
      lastSyncedAt: readDailySyncState().lastSyncedAt
    })
    return
  }

  const now = new Date().toISOString()
  const payload = {
    version: DAILY_REMOTE_VERSION,
    records: normalizeRecordsForUser(readLocalRecordsForRemote(kind), userId),
    syncedAt: now
  }

  const { error } = await client
    .from("daily_data")
    .upsert({
      user_id: userId,
      tool_name: dailyRemoteMeta[kind].toolName,
      data: payload,
      updated_at: now
    }, {
      onConflict: "user_id,tool_name"
    })

  if (error) {
    updateDailySyncState({
      mode: "error",
      message: error.message || "Daily sync failed.",
      lastSyncedAt: readDailySyncState().lastSyncedAt
    })
    return
  }

  updateDailySyncState({
    mode: "synced",
    message: "Daily synced to your account.",
    lastSyncedAt: now
  })
}

function mergeRemoteCollection<T extends { id: string; userId: string }>(input: {
  kind: DailyRemoteKind
  rows: DailyRemoteRow[]
  userId: string
  readLocal: () => T[]
  writeLocal: (records: T[], options?: DailyWriteOptions) => void
  validator: (value: unknown) => value is T
}) {
  const remoteRow = input.rows.find((row) => row.tool_name === dailyRemoteMeta[input.kind].toolName)
  const remoteRecords = normalizeRecordsForUser(parseRemoteRecords(remoteRow?.data, input.validator), input.userId)
  const localRecords = normalizeRecordsForUser(input.readLocal(), input.userId)
  const merged = mergeDailyRecordCollections(localRecords, remoteRecords)

  input.writeLocal(merged, { skipRemoteSync: true })
}

function mergeDailyRecordCollections<T extends {
  id: string
  updatedAt?: string
  autosavedAt?: string | null
  createdAt?: string
}>(localRecords: T[], remoteRecords: T[]) {
  const map = new Map<string, T>()

  for (const record of [...remoteRecords, ...localRecords]) {
    const existing = map.get(record.id)
    if (!existing || getDailyRecordSortTime(record) >= getDailyRecordSortTime(existing)) {
      map.set(record.id, record)
    }
  }

  return [...map.values()].sort((left, right) => getDailyRecordSortTime(right) - getDailyRecordSortTime(left))
}

function parseRemoteRecords<T>(value: unknown, validator: (entry: unknown) => entry is T) {
  const payload = isPersistedDailyPayload(value) ? value.records : Array.isArray(value) ? value : []

  return payload.filter(validator)
}

function isPersistedDailyPayload<T>(value: unknown): value is DailyRemotePayload<T> {
  return typeof value === "object" && value !== null && Array.isArray((value as DailyRemotePayload<T>).records)
}

function normalizeRecordsForUser<T extends { userId: string }>(records: T[], userId: string) {
  return records.map((record) => record.userId === userId ? record : { ...record, userId })
}

function readLocalRecordsForRemote(kind: DailyRemoteKind): Array<Record<string, unknown> & { userId: string }> {
  if (kind === "items") return readDailyItemsFromLocalStorage()
  if (kind === "decisions") return readDailyDecisionsFromLocalStorage()
  if (kind === "summaries") return readDailySummariesFromLocalStorage()
  if (kind === "tasks") return readDailyTasksFromLocalStorage()
  return readDailyWritingsFromLocalStorage()
}

function getDailyRecordSortTime(record: { updatedAt?: string; autosavedAt?: string | null; createdAt?: string }) {
  const value = record.updatedAt || record.autosavedAt || record.createdAt || ""
  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : 0
}

function getStoredVolynxAccessToken() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem("volynx_access_token") || ""
}

function getUserIdFromAccessToken(accessToken: string) {
  const parts = accessToken.split(".")
  if (parts.length < 2) return null

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { sub?: string }
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return decodeURIComponent(Array.from(window.atob(padded)).map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""))
  }

  return Buffer.from(padded, "base64").toString("utf8")
}

function createDailyDataClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}
