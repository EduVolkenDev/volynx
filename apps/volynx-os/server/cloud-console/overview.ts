import { randomUUID } from 'node:crypto'
import { CLOUD_CONSOLE_CONTRACT_VERSION } from '../../../../contracts/cloud-console-v1'
import type {
  ApiResponse, CloudConsoleRole, CloudOverview, Deployment, Incident, ModuleState,
  OperationError, ProductIdentity, ResourceHealth, BackupCapability, CarePlan
} from '../../../../contracts/cloud-console-v1'
import { validateObservation } from './observations'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const noCache = { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json; charset=utf-8', 'Vary': 'Authorization' }
const asObject = (v: unknown): Record<string, unknown> | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null
const string = (v: unknown): v is string => typeof v === 'string'
const nullableString = (v: unknown): v is string | null => v === null || string(v)
const finiteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const safeSource = (v: unknown): v is string => string(v) && /^[a-z0-9][a-z0-9_.:-]{0,95}$/i.test(v)

export type ConsoleSource = {
  verify(token: string): Promise<{ userId: string | null; unavailable: boolean }>
  one(table: string, columns: string, filters: Record<string, string>): Promise<unknown | null>
  many(table: string, columns: string, filters: Record<string, string | null>, limit: number, order?: string): Promise<unknown[]>
}
export type OverviewDependencies = {
  source(token: string): ConsoleSource
  now?: () => Date
  referenceId?: () => string
}

class ReadFailure extends Error {
  constructor(readonly code: 'database_unavailable' | 'malformed_response') { super(code) }
}
function error(code: OperationError['code'], at: string, referenceId: string): OperationError {
  const labels: Record<OperationError['code'], string> = {
    invalid_request: 'Product and environment IDs must be valid UUIDs.',
    invalid_session: 'Your session has expired or is invalid.',
    permission_denied: 'You do not have access to this product.',
    not_found: 'Product or environment not found.',
    not_configured: 'Data source is not configured.',
    provider_unavailable: 'Provider is unavailable.',
    timeout: 'Data source timed out.',
    credential_expired: 'Provider credentials expired.',
    rate_limited: 'Provider rate limit reached.',
    malformed_response: 'Data source returned an invalid response.',
    database_unavailable: 'Console data is temporarily unavailable.',
    operation_failed: 'The operation failed.'
  }
  return { code, reason: labels[code], at, referenceId, retryable: ['database_unavailable','timeout','provider_unavailable','rate_limited'].includes(code) }
}
function respond<T>(status: number, body: ApiResponse<T>): Response {
  return new Response(JSON.stringify(body), { status, headers: noCache })
}
function notReady<T>(): ModuleState<T> { return { state: 'pending', data: null } }
function moduleError<T>(code: 'database_unavailable' | 'malformed_response', at: string, ref: string): ModuleState<T> {
  return { state: 'error', data: null, error: error(code,at,ref) }
}
function readIssue(failure: unknown): 'database_unavailable' | 'malformed_response' {
  return failure instanceof ReadFailure ? failure.code : 'database_unavailable'
}

function productRow(value: unknown) {
  const v=asObject(value)
  if (!v || !string(v.id) || !string(v.platform_organization_id) || !string(v.client_id) || !string(v.volynx_id) || !string(v.name) || !nullableString(v.production_url)) throw new ReadFailure('malformed_response')
  if (v.production_url) {
    try {
      const url=new URL(v.production_url)
      if (!['https:','http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('unsafe URL')
    } catch { throw new ReadFailure('malformed_response') }
  }
  return { id:v.id, orgId:v.platform_organization_id, clientId:v.client_id, vlxId:v.volynx_id, name:v.name, productionUrl:v.production_url }
}
function environmentRow(value: unknown) {
  const v=asObject(value)
  if (!v || !string(v.id) || !string(v.platform_organization_id) || !string(v.product_id) || !string(v.environment_key) || !string(v.name) || !string(v.kind)) throw new ReadFailure('malformed_response')
  return { id:v.id, orgId:v.platform_organization_id, productId:v.product_id, key:v.environment_key, name:v.name, kind:v.kind }
}
async function role(source: ConsoleSource, orgId: string, clientId: string, userId: string): Promise<CloudConsoleRole> {
  const platform = asObject(await source.one('cloud_console_members','role',{platform_organization_id:orgId,user_id:userId}))
  if (platform) {
    if (platform.role === 'volynx_admin' || platform.role === 'volynx_operator') return platform.role
    throw new ReadFailure('malformed_response')
  }
  const client = asObject(await source.one('cloud_client_members','role',{client_id:clientId,user_id:userId}))
  if (client?.role === 'client_admin' || client?.role === 'client_viewer') return client.role
  throw new ReadFailure('malformed_response')
}

function resource(row: unknown, productId: string, environmentId: string, now: Date): ResourceHealth {
  const v=asObject(row)
  if (!v || v.product_id !== productId || v.environment_id !== environmentId || !string(v.id) || !string(v.provider) || !string(v.resource_kind) || !string(v.name)) throw new ReadFailure('malformed_response')
  const result=validateObservation({status:v.status,source:v.source,lastCheckedAt:v.checked_at},now,5*60*1000)
  if (!result.ok) throw new ReadFailure('malformed_response')
  return { ...result.value, resource:{id:v.id,name:v.name}, type:v.resource_kind, provider:v.provider }
}
function deployment(row: unknown, productId: string, environmentId: string, operator: boolean): Deployment {
  const v=asObject(row)
  if (!v || v.product_id !== productId || v.environment_id !== environmentId || !string(v.id) || !string(v.provider) || !string(v.status) || !string(v.created_at) || !nullableString(v.commit_sha) || !nullableString(v.started_at) || !nullableString(v.finished_at) || !nullableString(v.source) || !nullableString(v.checked_at) || !nullableString(v.failure_code)) throw new ReadFailure('malformed_response')
  const statuses: Deployment['status'][]=['queued','running','succeeded','failed','cancelled','unknown']
  if (!statuses.includes(v.status as Deployment['status'])) throw new ReadFailure('malformed_response')
  if (v.source !== null && !safeSource(v.source)) throw new ReadFailure('malformed_response')
  if (v.status !== 'unknown' && (!v.source || !v.checked_at)) throw new ReadFailure('malformed_response')
  const duration=v.started_at && v.finished_at ? Date.parse(v.finished_at)-Date.parse(v.started_at) : null
  if (duration !== null && (!finiteNumber(duration) || duration < 0)) throw new ReadFailure('malformed_response')
  return {
    id:v.id,status:v.status as Deployment['status'],
    source:{repo:null,commitSha:operator?v.commit_sha:null,branch:null,author:null},
    createdAt:v.created_at,durationMs:duration,triggeredBy:null,lastCheckedAt:v.checked_at,providerSource:v.source,
    error:v.status === 'failed' ? error('operation_failed',v.finished_at ?? v.created_at,v.id) : null
  }
}
function backup(row: unknown, productId: string, environmentId: string, now: Date): BackupCapability {
  const v=asObject(row)
  if (!v || v.product_id !== productId || v.environment_id !== environmentId || !string(v.id) || !string(v.resource_id) || !string(v.provider) || !nullableString(v.last_success_at) || !string(v.verification_status) || (v.retention_days !== null && !finiteNumber(v.retention_days)) || typeof v.restore_supported !== 'boolean') throw new ReadFailure('malformed_response')
  const result=validateObservation({status:v.capability_status,source:v.source,lastCheckedAt:v.checked_at},now,24*60*60*1000)
  if (!result.ok || !['verified','unverified','failed','unknown'].includes(v.verification_status)) throw new ReadFailure('malformed_response')
  return { ...result.value,resource:{id:v.resource_id,name:null},provider:v.provider,
    enabled:result.value.status === 'not_configured' ? false : null,lastSuccessfulAt:v.last_success_at,
    retentionDays:v.retention_days as number | null,restoreCapability:v.restore_supported,verificationStatus:v.verification_status as BackupCapability['verificationStatus'] }
}
function incident(row: unknown, productId: string, environmentId: string): Incident {
  const v=asObject(row)
  if (!v || v.product_id !== productId || (v.environment_id !== environmentId && v.environment_id !== null) || !string(v.id) || !string(v.title) || !string(v.severity) || !string(v.status) || !string(v.detected_at)) throw new ReadFailure('malformed_response')
  if (!['minor','major','critical'].includes(v.severity) || !['detected','investigating','mitigating','resolved','postmortem'].includes(v.status)) throw new ReadFailure('malformed_response')
  return { id:v.id,title:v.title,severity:v.severity as Incident['severity'],status:v.status as Incident['status'],startedAt:v.detected_at,updates:null,postmortemUrl:null }
}
function care(row: unknown, clientId: string): CarePlan {
  const v=asObject(row)
  if (!v || v.client_id !== clientId || !string(v.plan_key) || !string(v.status)) throw new ReadFailure('malformed_response')
  return { name:v.plan_key,tier:v.plan_key,includes:null,supportChannel:null,slaHours:null }
}

async function readModule<T>(work: () => Promise<T[]>, at: string, ref: string): Promise<ModuleState<T[]>> {
  try {
    const values=await work()
    return values.length ? {state:'ready',data:values} : notReady()
  } catch (failure) { return moduleError(readIssue(failure),at,ref) }
}

/** The route never uses a service key. Each read is scoped by IDs and database RLS. */
export async function readOverview(request: Request, deps: OverviewDependencies): Promise<Response> {
  const now=(deps.now ?? (()=>new Date()))()
  const at=now.toISOString()
  const ref=(deps.referenceId ?? randomUUID)()
  const fail=(status:number,code:OperationError['code'])=>respond<never>(status,{version:CLOUD_CONSOLE_CONTRACT_VERSION,referenceId:ref,at,ok:false,error:error(code,at,ref)})
  const url=new URL(request.url)
  const productId=url.searchParams.get('productId')
  const environmentId=url.searchParams.get('environmentId')
  if (!productId || !environmentId || !uuid.test(productId) || !uuid.test(environmentId)) return fail(400,'invalid_request')
  const authorization=request.headers.get('authorization')
  if (!authorization || !/^Bearer [^\s]+$/.test(authorization)) return fail(401,'invalid_session')
  let source: ConsoleSource
  try { source=deps.source(authorization.slice(7)) } catch { return fail(503,'not_configured') }
  let verified: Awaited<ReturnType<ConsoleSource['verify']>>
  try { verified=await source.verify(authorization.slice(7)) } catch { return fail(503,'database_unavailable') }
  if (verified.unavailable) return fail(503,'database_unavailable')
  if (!verified.userId || !uuid.test(verified.userId)) return fail(401,'invalid_session')
  try {
    const rawProduct=await source.one('cloud_products','id,platform_organization_id,client_id,volynx_id,name,production_url',{id:productId})
    if (!rawProduct) return fail(404,'not_found')
    const product=productRow(rawProduct)
    if (product.id !== productId) throw new ReadFailure('malformed_response')
    const rawEnvironment=await source.one('cloud_environments','id,platform_organization_id,product_id,environment_key,name,kind',{id:environmentId,product_id:productId,platform_organization_id:product.orgId})
    if (!rawEnvironment) return fail(404,'not_found')
    const environment=environmentRow(rawEnvironment)
    if (environment.id !== environmentId || environment.productId !== productId || environment.orgId !== product.orgId) throw new ReadFailure('malformed_response')
    const activeRole=await role(source,product.orgId,product.clientId,verified.userId)
    const operator=activeRole==='volynx_operator' || activeRole==='volynx_admin'
    const scope={platform_organization_id:product.orgId,product_id:productId,environment_id:environmentId}
    const [resources,deployments,backups,incidents,carePlan]=await Promise.all([
      readModule(async()=> (await source.many('cloud_resources','id,product_id,environment_id,provider,resource_kind,name,status,source,checked_at',scope,50)).map(v=>resource(v,productId,environmentId,now)),at,ref),
      readModule(async()=> (await source.many('cloud_deployments','id,product_id,environment_id,provider,commit_sha,status,started_at,finished_at,failure_code,source,checked_at,created_at',scope,20,'created_at')).map(v=>deployment(v,productId,environmentId,operator)),at,ref),
      readModule(async()=> (await source.many('cloud_backup_capabilities','id,product_id,environment_id,resource_id,provider,capability_status,retention_days,last_success_at,restore_supported,verification_status,source,checked_at',scope,50)).map(v=>backup(v,productId,environmentId,now)),at,ref),
      readModule(async()=> {
        const columns='id,product_id,environment_id,title,severity,status,detected_at'
        const [inEnvironment,acrossProduct]=await Promise.all([
          source.many('cloud_incidents',columns,scope,30,'detected_at'),
          source.many('cloud_incidents',columns,{platform_organization_id:product.orgId,product_id:productId,environment_id:null},30,'detected_at')
        ])
        return [...inEnvironment,...acrossProduct].map(v=>incident(v,productId,environmentId))
          .sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,30)
      },at,ref),
      (async():Promise<ModuleState<CarePlan>>=>{
        try {
          const rows=await source.many('cloud_care_plans','client_id,plan_key,status',{platform_organization_id:product.orgId,client_id:product.clientId,status:'active'},1)
          return rows.length ? {state:'ready',data:care(rows[0],product.clientId)} : notReady()
        } catch (failure) { return moduleError(readIssue(failure),at,ref) }
      })()
    ])
    const identity:ProductIdentity={id:product.id,vlxId:product.vlxId,name:product.name,clientId:product.clientId,productionUrl:product.productionUrl,environments:[{id:environment.id,key:environment.key,name:environment.name,kind:environment.kind}]}
    const data:CloudOverview={identity,environment:{id:environment.id,key:environment.key,name:environment.name,kind:environment.kind},
      health:notReady(),domain:notReady(),deployments,resources,backups,security:notReady(),incidents,care:carePlan}
    return respond(200,{version:CLOUD_CONSOLE_CONTRACT_VERSION,referenceId:ref,at,ok:true,
      context:{organizationId:product.orgId,clientId:product.clientId,productId,environmentId,role:activeRole},data})
  } catch (failure) {
    if (failure instanceof ReadFailure) return fail(503,failure.code)
    return fail(503,'database_unavailable')
  }
}
