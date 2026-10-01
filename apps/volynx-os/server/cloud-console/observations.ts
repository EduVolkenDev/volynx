import type { Observation } from '../../../../contracts/cloud-console-v1'
import { CLOUD_STATUS_VALUES } from '../../../../contracts/cloud-console'

export type ObservationValidation =
  | { ok: true; value: Observation }
  | { ok: false; code: 'malformed_response'; value: Observation }

const unknown: Observation = { status: 'unknown', source: null, lastCheckedAt: null, stale: false }
// PostgREST serializes UTC timestamptz values with +00:00 and up to six fractional digits.
const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/

/** Validate normalized adapter output, not a raw provider payload. No secret echo. */
export function validateObservation(input: unknown, now: Date, maxAgeMs: number): ObservationValidation {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    throw new RangeError('Observation clock and freshness window must be valid')
  }
  const invalid = (): ObservationValidation => ({ ok: false, code: 'malformed_response', value: { ...unknown } })
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid()
  const value = input as Record<string, unknown>
  if (!CLOUD_STATUS_VALUES.includes(value.status as Observation['status'])) return invalid()
  const status = value.status as Observation['status']
  const source = value.source
  const timestamp = value.lastCheckedAt
  if (source !== null && (typeof source !== 'string' || !/^[a-z0-9][a-z0-9_.:-]{0,95}$/i.test(source))) return invalid()
  if (timestamp !== null && (typeof timestamp !== 'string' || !isoUtc.test(timestamp) || !Number.isFinite(Date.parse(timestamp)))) return invalid()
  if (typeof timestamp === 'string' && new Date(timestamp).toISOString().slice(0,19) !== timestamp.slice(0,19)) return invalid()
  if ((source === null) !== (timestamp === null)) return invalid()
  if (status !== 'unknown' && status !== 'not_configured' && (source === null || timestamp === null)) return invalid()
  if (status === 'not_configured' && (source !== null || timestamp !== null)) return invalid()
  if (typeof timestamp === 'string' && Date.parse(timestamp) > now.getTime()) return invalid()
  const stale = typeof timestamp === 'string' && now.getTime() - Date.parse(timestamp) >= maxAgeMs
  return { ok: true, value: { status, source: source as string | null, lastCheckedAt: typeof timestamp === 'string' ? new Date(timestamp).toISOString() : null, stale } }
}
