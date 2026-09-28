import { createClient } from '@supabase/supabase-js'
import type { ConsoleSource } from './overview'

const timeoutMs=8000
const columns=/^[a-z_]+(?:,[a-z_]+)*$/
const identifier=/^[a-z_]+$/
const tables=new Set([
  'cloud_products','cloud_environments','cloud_console_members','cloud_client_members',
  'cloud_resources','cloud_deployments','cloud_backup_capabilities','cloud_incidents','cloud_care_plans'
])

export function createSupabaseSource(token: string): ConsoleSource {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Cloud Console authentication is not configured')
  const client=createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:`Bearer ${token}`},fetch:async(input,init)=>{
      const controller=new AbortController()
      const timer=setTimeout(()=>controller.abort(),timeoutMs)
      const upstream=init?.signal
      const abort=()=>controller.abort()
      upstream?.addEventListener('abort',abort,{once:true})
      try { return await fetch(input,{...init,cache:'no-store',signal:controller.signal}) }
      finally { clearTimeout(timer); upstream?.removeEventListener('abort',abort) }
    }}
  })
  function query(table:string,select:string) {
    if (!tables.has(table) || !columns.test(select)) throw new Error('Invalid Console query')
    return client.from(table).select(select)
  }
  return {
    async verify(accessToken) {
      try {
        const {data,error}=await client.auth.getUser(accessToken)
        if (error) return {userId:null,unavailable:!error.status || error.status>=500}
        return {userId:data.user?.id ?? null,unavailable:false}
      } catch { return {userId:null,unavailable:true} }
    },
    async one(table,select,filters) {
      let builder=query(table,select)
      for (const [field,value] of Object.entries(filters)) {
        if (!identifier.test(field)) throw new Error('Invalid Console filter')
        builder=builder.eq(field,value)
      }
      const {data,error}=await builder.limit(1).maybeSingle()
      if (error) throw error
      return data
    },
    async many(table,select,filters,limit,order) {
      if (!Number.isInteger(limit) || limit<1 || limit>100) throw new Error('Invalid Console limit')
      let builder=query(table,select)
      for (const [field,value] of Object.entries(filters)) {
        if (!identifier.test(field)) throw new Error('Invalid Console filter')
        builder=value===null ? builder.is(field,null) : builder.eq(field,value)
      }
      if (order) {
        if (!identifier.test(order)) throw new Error('Invalid Console order')
        builder=builder.order(order,{ascending:false})
      }
      const {data,error}=await builder.limit(limit)
      if (error) throw error
      if (!Array.isArray(data)) throw new Error('Malformed Console collection')
      return data
    }
  }
}
