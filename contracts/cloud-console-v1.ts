import type { CloudConsoleRole, CloudStatus } from './cloud-console'

/** Shared UI proposal reconciled with Muse entrega 01. No endpoint is implied. */
export const CLOUD_CONSOLE_CONTRACT_VERSION = '1.0' as const
export type { CloudConsoleRole, CloudStatus }

export type ConsoleContext = {
  organizationId: string
  clientId: string
  productId: string // database UUID; vlxId and slugs never authorize access
  environmentId: string
  role: CloudConsoleRole // resolved on server for this context
}

export type FailureCode =
  | 'invalid_request' | 'invalid_session' | 'permission_denied' | 'not_found' | 'not_configured'
  | 'provider_unavailable' | 'timeout' | 'credential_expired' | 'rate_limited'
  | 'malformed_response' | 'database_unavailable' | 'operation_failed'

export type OperationError = {
  code: FailureCode
  reason: string // server-owned safe text, never a raw provider response
  at: string // ISO 8601 UTC
  referenceId: string
  retryable: boolean
}

export type Observation = {
  status: CloudStatus
  source: string | null // sanitized adapter/check name; not a credential reference
  lastCheckedAt: string | null
  stale: boolean
}

/** Loading belongs to Muse. The API returns all other states explicitly per module. */
export type ModuleState<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'empty'; source: string; lastCheckedAt: string }
  | { state: 'not_configured'; data: null }
  | { state: 'pending'; data: null }
  | { state: 'error'; data: null; error: OperationError }
  | { state: 'stale'; data: T; error: OperationError | null }
  | { state: 'forbidden'; data: null; error: OperationError }

export type ProductIdentity = {
  id: string
  vlxId: string
  name: string
  clientId: string
  productionUrl: string | null
  environments: Array<{ id: string; key: string; name: string; kind: string }>
}

export type ProductHealth = Observation & {
  productId: string
  environmentId: string
  components: Array<Observation & { key: string; name: string }>
  activeIncidentIds: string[] // only complete when incident module is ready/empty
}

export type DomainStatus = Observation & {
  domain: string
  dnsOk: boolean | null // null = not observed, not failure
  ssl: Observation & { issuer: string | null; expiresAt: string | null }
  cdn: { provider: string | null; source: string | null; lastCheckedAt: string | null }
}

export type Deployment = {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'unknown'
  source: { repo: string | null; commitSha: string | null; branch: string | null; author: string | null }
  createdAt: string
  durationMs: number | null
  triggeredBy: string | null
  lastCheckedAt: string | null
  providerSource: string | null
  error: OperationError | null
  // repo/author/triggeredBy must be redacted server-side for client views.
}

export type ResourceHealth = Observation & {
  resource: { id: string; name: string }
  type: string
  provider: string
}

export type BackupCapability = Observation & {
  resource: { id: string; name: string | null }
  provider: string
  enabled: boolean | null
  lastSuccessfulAt: string | null
  retentionDays: number | null
  restoreCapability: boolean | null // capability is distinct from permission to invoke it
  verificationStatus: 'verified' | 'unverified' | 'failed' | 'unknown'
}

export type SecurityPosture = {
  claims: Array<{
    key: 'https' | 'waf' | 'ddos' | 'rateLimit'
    state: CloudStatus
    evidence: { source: string; explanation: string } | null
    lastEvaluatedAt: string | null
    stale: boolean
  }>
}

export type Incident = {
  id: string
  title: string
  severity: 'minor' | 'major' | 'critical'
  status: 'detected' | 'investigating' | 'mitigating' | 'resolved' | 'postmortem'
  startedAt: string
  updates: Array<{ at: string; by: string | null; text: string; internal: boolean }> | null
  postmortemUrl: string | null
  // Internal updates must be excluded from client responses, not hidden with CSS.
}

export type CarePlan = {
  name: string
  tier: string
  includes: string[] | null
  supportChannel: { label: string; url: string | null } | null
  slaHours: number | null // only from the contracted plan; never inferred
}

export type SupportRequest = {
  id: string
  subject: string
  status: 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed'
  createdAt: string
  messages: Array<{ id: string; at: string; by: string | null; text: string }>
}

export type AuditEvent = {
  id: string
  action: string
  actor: string | null
  at: string
  outcome: 'success' | 'failure'
  metadata: { changedFields: string[] } // allowlisted projection, not arbitrary JSON
}

export type ApiResponse<T> = {
  version: typeof CLOUD_CONSOLE_CONTRACT_VERSION
  referenceId: string
  at: string
} & ({ ok: true; context: ConsoleContext; data: T } | { ok: false; error: OperationError })

export type CloudOverview = {
  identity: ProductIdentity
  environment: { id: string; key: string; name: string; kind: string }
  health: ModuleState<ProductHealth>
  domain: ModuleState<DomainStatus>
  deployments: ModuleState<Deployment[]>
  resources: ModuleState<ResourceHealth[]>
  backups: ModuleState<BackupCapability[]>
  security: ModuleState<SecurityPosture>
  incidents: ModuleState<Incident[]>
  care: ModuleState<CarePlan>
}

/** RLS-scoped navigation choices. IDs are used for routes, never as authorization. */
export type CloudCatalog = {
  entries: Array<{
    client: { id: string; name: string }
    product: { id: string; name: string; vlxId: string }
    environment: { id: string; key: string; name: string; kind: string }
  }>
}

export type CatalogResponse = {
  version: typeof CLOUD_CONSOLE_CONTRACT_VERSION
  referenceId: string
  at: string
} & ({ ok: true; data: CloudCatalog } | { ok: false; error: OperationError })
