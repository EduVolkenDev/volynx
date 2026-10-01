import { readOverview } from '@/server/cloud-console/overview'
import { createSupabaseSource } from '@/server/cloud-console/supabase-source'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(request: Request) {
  return readOverview(request,{source:createSupabaseSource})
}
