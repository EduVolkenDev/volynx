export const DAILY_METRICS_STORAGE_KEY = "volynx-daily:v1:metrics"
export const DAILY_METRICS_UPDATED_EVENT = "volynx-daily:metrics-updated"

export type DailyLocalMetrics = {
  captures: number
  outputs: number
  routed: number
  lastLatencyMs: number | null
  updatedAt: string | null
}

const emptyMetrics: DailyLocalMetrics = {
  captures: 0,
  outputs: 0,
  routed: 0,
  lastLatencyMs: null,
  updatedAt: null
}

export function readDailyMetrics(): DailyLocalMetrics {
  if (typeof window === "undefined") return emptyMetrics

  try {
    const raw = window.localStorage.getItem(DAILY_METRICS_STORAGE_KEY)
    if (!raw) return emptyMetrics

    const parsed = JSON.parse(raw) as Partial<DailyLocalMetrics>

    return {
      captures: Number(parsed.captures ?? 0),
      outputs: Number(parsed.outputs ?? 0),
      routed: Number(parsed.routed ?? 0),
      lastLatencyMs: typeof parsed.lastLatencyMs === "number" ? parsed.lastLatencyMs : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    }
  } catch {
    return emptyMetrics
  }
}

export function updateDailyMetrics(patch: Partial<DailyLocalMetrics>) {
  if (typeof window === "undefined") return emptyMetrics

  const next = {
    ...readDailyMetrics(),
    ...patch,
    updatedAt: new Date().toISOString()
  }

  window.localStorage.setItem(DAILY_METRICS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(DAILY_METRICS_UPDATED_EVENT, { detail: { metrics: next } }))

  return next
}

export function incrementDailyMetrics(patch: Partial<Pick<DailyLocalMetrics, "captures" | "outputs" | "routed">> & {
  lastLatencyMs?: number
}) {
  const current = readDailyMetrics()

  return updateDailyMetrics({
    captures: current.captures + (patch.captures ?? 0),
    outputs: current.outputs + (patch.outputs ?? 0),
    routed: current.routed + (patch.routed ?? 0),
    lastLatencyMs: patch.lastLatencyMs ?? current.lastLatencyMs
  })
}

