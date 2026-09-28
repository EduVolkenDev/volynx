import { randomUUID } from 'node:crypto'
import { CLOUD_CONSOLE_CONTRACT_VERSION } from '../../../../contracts/cloud-console-v1'
import type { CatalogResponse, CloudCatalog, OperationError } from '../../../../contracts/cloud-console-v1'
import type { ConsoleSource } from './overview'

const headers = { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json; charset=utf-8', Vary: 'Authorization' }
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0

type CatalogDeps = {
  source(token: string): ConsoleSource
  now?: () => Date
  referenceId?: () => string
}

function respond(status: number, body: CatalogResponse): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

/** Only rows visible through the caller's JWT and Cloud RLS are considered. */
export async function readCatalog(request: Request, deps: CatalogDeps): Promise<Response> {
  const at = (deps.now ?? (() => new Date()))().toISOString()
  const referenceId = (deps.referenceId ?? randomUUID)()
  function fail(status: number, code: OperationError['code'], reason: string, retryable = false): Response {
    return respond(status, {
      version: CLOUD_CONSOLE_CONTRACT_VERSION, referenceId, at, ok: false,
      error: { code, reason, at, referenceId, retryable }
    })
  }
  const authorization = request.headers.get('authorization')
  if (!authorization || !/^Bearer [^\s]+$/.test(authorization)) {
    return fail(401, 'invalid_session', 'Your session has expired or is invalid.')
  }
  const token = authorization.slice(7)
  let source: ConsoleSource
  try { source = deps.source(token) }
  catch { return fail(503, 'not_configured', 'Console data source is not configured.') }
  try {
    const verified = await source.verify(token)
    if (verified.unavailable) return fail(503, 'database_unavailable', 'Console data is temporarily unavailable.', true)
    if (!verified.userId) return fail(401, 'invalid_session', 'Your session has expired or is invalid.')

    const [clients, products, environments] = await Promise.all([
      source.many('cloud_clients', 'id,platform_organization_id,name', { status: 'active' }, 100),
      source.many('cloud_products', 'id,platform_organization_id,client_id,name,volynx_id', { status: 'active' }, 100),
      source.many('cloud_environments', 'id,platform_organization_id,product_id,environment_key,name,kind', {}, 100)
    ])
    // A bounded V1 read must fail visibly instead of silently omitting a tenant.
    if ([clients, products, environments].some(rows => rows.length === 100)) {
      return fail(503, 'operation_failed', 'Console catalog exceeds the current page limit.')
    }
    const clientMap = new Map<string, { id: string; orgId: string; name: string }>()
    for (const raw of clients) {
      if (!isRecord(raw) || !isString(raw.id) || !isString(raw.platform_organization_id) || !isString(raw.name)) {
        return fail(503, 'malformed_response', 'Console data source returned an invalid response.')
      }
      clientMap.set(raw.id, { id: raw.id, orgId: raw.platform_organization_id, name: raw.name })
    }
    const productMap = new Map<string, { id: string; orgId: string; clientId: string; name: string; vlxId: string }>()
    for (const raw of products) {
      if (!isRecord(raw) || !isString(raw.id) || !isString(raw.platform_organization_id) || !isString(raw.client_id) || !isString(raw.name) || !isString(raw.volynx_id)) {
        return fail(503, 'malformed_response', 'Console data source returned an invalid response.')
      }
      const client = clientMap.get(raw.client_id)
      if (!client || client.orgId !== raw.platform_organization_id) continue
      productMap.set(raw.id, { id: raw.id, orgId: raw.platform_organization_id, clientId: raw.client_id, name: raw.name, vlxId: raw.volynx_id })
    }
    const entries: CloudCatalog['entries'] = []
    for (const raw of environments) {
      if (!isRecord(raw) || !isString(raw.id) || !isString(raw.platform_organization_id) || !isString(raw.product_id) || !isString(raw.environment_key) || !isString(raw.name) || !isString(raw.kind)) {
        return fail(503, 'malformed_response', 'Console data source returned an invalid response.')
      }
      const product = productMap.get(raw.product_id)
      if (!product || product.orgId !== raw.platform_organization_id) continue
      const client = clientMap.get(product.clientId)
      if (!client) continue
      entries.push({
        client: { id: client.id, name: client.name },
        product: { id: product.id, name: product.name, vlxId: product.vlxId },
        environment: { id: raw.id, key: raw.environment_key, name: raw.name, kind: raw.kind }
      })
    }
    entries.sort((a, b) => `${a.client.name}/${a.product.name}/${a.environment.name}`.localeCompare(`${b.client.name}/${b.product.name}/${b.environment.name}`))
    return respond(200, { version: CLOUD_CONSOLE_CONTRACT_VERSION, referenceId, at, ok: true, data: { entries } })
  } catch {
    return fail(503, 'database_unavailable', 'Console data is temporarily unavailable.', true)
  }
}
