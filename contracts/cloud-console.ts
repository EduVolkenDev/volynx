export const CLOUD_CONSOLE_ROLES = [
  "volynx_admin",
  "volynx_operator",
  "client_admin",
  "client_viewer",
] as const

export type CloudConsoleRole = (typeof CLOUD_CONSOLE_ROLES)[number]

export const CLOUD_STATUS_VALUES = [
  "operational",
  "degraded",
  "incident",
  "maintenance",
  "unknown",
  "not_configured",
] as const

export type CloudStatus = (typeof CLOUD_STATUS_VALUES)[number]

export type OperationalSnapshot = {
  status: CloudStatus
  source: string | null
  checkedAt: string | null
  stale: boolean
  failureCode?: string | null
}

export type ProductHealth = OperationalSnapshot & {
  productId: string
  environmentId: string
  components: Array<{
    key: string
    label: string
    status: CloudStatus
    source: string | null
    checkedAt: string | null
  }>
  activeIncidentIds: string[]
}

export type ProviderResult<T> =
  | { ok: true; value: T; source: string; checkedAt: string }
  | { ok: false; errorCode: string; message: string; source: string; checkedAt: string }
