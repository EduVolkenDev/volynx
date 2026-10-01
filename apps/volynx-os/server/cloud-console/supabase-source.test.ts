import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseSource } from './supabase-source'

const priorUrl=process.env.NEXT_PUBLIC_SUPABASE_URL
const priorKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

afterEach(()=>{
  vi.restoreAllMocks()
  if (priorUrl===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL=priorUrl
  if (priorKey===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=priorKey
})

describe('Supabase Console source',()=>{
  it('sends a user JWT to Auth and reads with that JWT and no cache',async()=>{
    process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:9999'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test-key'
    const requests:Array<{url:string,init:RequestInit|undefined}>=[]
    vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>{
      requests.push({url:String(input),init})
      const auth=String(input).includes('/auth/v1/user')
      return new Response(JSON.stringify(auth?{id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated'}:[{id:'fixture'}]),{status:200,headers:{'Content-Type':'application/json'}})
    })
    const source=createSupabaseSource('fixture-jwt')
    expect((await source.verify('fixture-jwt')).userId).toBe('00000000-0000-4000-8000-000000000001')
    await source.many('cloud_incidents','id,product_id,environment_id',{product_id:'product-id',environment_id:null},30)
    expect(requests).toHaveLength(2)
    expect(requests[1].url).toContain('environment_id=is.null')
    for (const {init} of requests) {
      expect(init?.cache).toBe('no-store')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fixture-jwt')
    }
  })
  it('marks an invalid token as invalid rather than unavailable',async()=>{
    process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:9999'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test-key'
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({message:'invalid JWT'}),{status:401,headers:{'Content-Type':'application/json'}}))
    expect(await createSupabaseSource('expired').verify('expired')).toEqual({userId:null,unavailable:false})
  })
  it('marks Auth outage as unavailable',async()=>{
    process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:9999'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test-key'
    vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('provider offline'))
    expect(await createSupabaseSource('fixture-jwt').verify('fixture-jwt')).toEqual({userId:null,unavailable:true})
  })
  it('allows the catalog client table but rejects unlisted tables',async()=>{
    process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:9999'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test-key'
    const requests:string[]=[]
    vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
      requests.push(String(input))
      return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}})
    })
    const source=createSupabaseSource('fixture-jwt')
    expect(await source.many('cloud_clients','id,platform_organization_id,name',{status:'active'},100)).toEqual([])
    expect(requests[0]).toContain('/rest/v1/cloud_clients')
    await expect(source.many('auth_users','id',{},1)).rejects.toThrow('Invalid Console query')
  })
})
