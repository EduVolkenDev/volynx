import { describe, expect, it } from 'vitest'
import { readOverview, type ConsoleSource } from './overview'

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const organization=id(100), client=id(200), product=id(300), environment=id(400), user=id(1)
const now=new Date('2026-09-28T12:00:00.000Z')
const request=(p=product,e=environment,token='valid')=>new Request(`http://localhost/api/cloud/v1/overview?productId=${p}&environmentId=${e}`,{headers:token?{Authorization:`Bearer ${token}`}:{}})
const fixture={
  cloud_products:[{id:product,platform_organization_id:organization,client_id:client,volynx_id:'VLX-TEST-001',name:'Fixture',production_url:null,repository_url:'PRIVATE_REPO'}],
  cloud_environments:[{id:environment,platform_organization_id:organization,product_id:product,environment_key:'production',name:'Production',kind:'production'}],
  cloud_console_members:[],
  cloud_client_members:[{client_id:client,user_id:user,role:'client_viewer'}],
  cloud_resources:[{id:id(500),platform_organization_id:organization,product_id:product,environment_id:environment,provider:'fixture',resource_kind:'database',name:'DB',status:'unknown',source:null,checked_at:null,metadata:{secret:'DO_NOT_ECHO'}}],
  cloud_deployments:[{id:id(600),platform_organization_id:organization,product_id:product,environment_id:environment,provider:'fixture',commit_sha:'PRIVATE_COMMIT',status:'failed',started_at:'2026-09-28T10:00:00Z',finished_at:'2026-09-28T10:01:00Z',failure_code:'failed',source:'fixture-adapter',checked_at:'2026-09-28T10:01:00Z',created_at:'2026-09-28T10:00:00Z',failure_message:'SECRET_PROVIDER_ERROR'}],
  cloud_backup_capabilities:[],cloud_incidents:[],cloud_care_plans:[]
}
type Table=keyof typeof fixture
type Overrides={rows?:Partial<Record<Table,unknown[]>>,userId?:string|null,unavailable?:boolean,failTable?:Table,malformedTable?:Table}
function source(overrides:Overrides={}):ConsoleSource {
  const rows={...fixture,...overrides.rows}
  const query=(table:string,filters:Record<string,string|null>):unknown[]=>{
    if (table===overrides.failTable) throw new Error('UNSAFE_PROVIDER_ERROR')
    if (table===overrides.malformedTable) return [{status:'operational',token:'SECRET'}]
    return ((rows as Record<string,unknown[]>)[table]??[]).filter(row=>Object.entries(filters).every(([key,value])=>(row as Record<string,unknown>)[key]===value))
  }
  return {
    verify:async()=>({userId:overrides.userId===undefined?user:overrides.userId,unavailable:overrides.unavailable??false}),
    one:async(table,_columns,filters)=>query(table,filters)[0]??null,
    many:async(table,_columns,filters,limit)=>query(table,filters).slice(0,limit)
  }
}
async function read(req:Request,overrides:Overrides={}) {
  const response=await readOverview(req,{source:()=>source(overrides),now:()=>now,referenceId:()=>id(900)})
  return {status:response.status,headers:response.headers,body:await response.json()}
}

describe('Cloud overview read boundary',()=>{
  it('rejects a missing or malformed token before querying',async()=>{
    for(const token of ['', 'has spaces']) {
      const result=await read(request(product,environment,token))
      expect(result.status).toBe(401)
      expect(result.body.error.code).toBe('invalid_session')
      expect(result.headers.get('Cache-Control')).toBe('private, no-store')
    }
  })
  it('rejects invalid IDs and expired sessions',async()=>{
    expect((await read(request('bad'))).status).toBe(400)
    const expired=await read(request(),{userId:null})
    expect(expired.status).toBe(401)
    expect(expired.body.error.code).toBe('invalid_session')
  })
  it('treats auth service outage separately from an expired session',async()=>{
    const outage=await read(request(),{unavailable:true})
    expect(outage.status).toBe(503)
    expect(outage.body.error.code).toBe('database_unavailable')
  })
  it('does not reveal whether another client product exists',async()=>{
    const missing=await read(request(),{rows:{cloud_products:[]}})
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('not_found')
    const wrongEnvironment=await read(request(product,id(401)))
    expect(wrongEnvironment.status).toBe(404)
  })
  it('includes product-wide incidents without claiming that timeline updates exist',async()=>{
    const result=await read(request(),{rows:{cloud_incidents:[{id:id(700),platform_organization_id:organization,product_id:product,environment_id:null,title:'Fixture incident',severity:'minor',status:'investigating',detected_at:'2026-09-28T11:00:00Z'}]}})
    expect(result.body.data.incidents.state).toBe('ready')
    expect(result.body.data.incidents.data[0].updates).toBeNull()
  })
  it('rejects a production URL containing a token',async()=>{
    const result=await read(request(),{rows:{cloud_products:[{...fixture.cloud_products[0],production_url:'https://example.test/?token=private'}]}})
    expect(result.status).toBe(503)
    expect(result.body.error.code).toBe('malformed_response')
    expect(JSON.stringify(result.body)).not.toContain('token=private')
  })
  it('keeps the overview unknown when no health provider is configured',async()=>{
    const result=await read(request())
    expect(result.status).toBe(200)
    expect(result.body.data.health.state).toBe('pending')
    expect(result.body.data.security.state).toBe('pending')
    expect(result.body.data.domain.state).toBe('pending')
    expect(result.body.data.incidents.state).toBe('pending')
    expect(result.body.data.resources.data[0].status).toBe('unknown')
    expect(result.body.context.role).toBe('client_viewer')
    expect(JSON.stringify(result.body)).not.toMatch(/PRIVATE_REPO|PRIVATE_COMMIT|SECRET_PROVIDER_ERROR|DO_NOT_ECHO/)
  })
  it('returns a richer operator projection without raw provider errors',async()=>{
    const result=await read(request(),{rows:{cloud_console_members:[{platform_organization_id:organization,user_id:user,role:'volynx_operator'}]}})
    expect(result.body.context.role).toBe('volynx_operator')
    expect(result.body.data.deployments.data[0].source.commitSha).toBe('PRIVATE_COMMIT')
    expect(result.body.data.deployments.data[0].error.referenceId).toBe(id(600))
    expect(JSON.stringify(result.body)).not.toContain('SECRET_PROVIDER_ERROR')
  })
  it('reports one failed module without suppressing valid modules or leaking provider output',async()=>{
    const result=await read(request(),{failTable:'cloud_resources'})
    expect(result.status).toBe(200)
    expect(result.body.data.resources.state).toBe('error')
    expect(result.body.data.resources.error.code).toBe('database_unavailable')
    expect(result.body.data.deployments.state).toBe('ready')
    expect(JSON.stringify(result.body)).not.toContain('UNSAFE_PROVIDER_ERROR')
  })
  it('does not turn malformed health rows into success',async()=>{
    const result=await read(request(),{malformedTable:'cloud_resources'})
    expect(result.body.data.resources.state).toBe('error')
    expect(result.body.data.resources.error.code).toBe('malformed_response')
    expect(JSON.stringify(result.body)).not.toContain('SECRET')
  })
  it('does not return a deployment source containing credentials',async()=>{
    const result=await read(request(),{rows:{cloud_deployments:[{...fixture.cloud_deployments[0],source:'https://token@example.test/private'}]}})
    expect(result.body.data.deployments.state).toBe('error')
    expect(result.body.data.deployments.error.code).toBe('malformed_response')
    expect(JSON.stringify(result.body)).not.toContain('token@example.test')
  })
  it('fails closed if the identity read cannot be completed',async()=>{
    const result=await read(request(),{failTable:'cloud_products'})
    expect(result.status).toBe(503)
    expect(result.body.error.code).toBe('database_unavailable')
  })
})
