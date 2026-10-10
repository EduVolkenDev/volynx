import { readCatalog } from '@/server/cloud-console/catalog'
import { createSupabaseSource } from '@/server/cloud-console/supabase-source'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return readCatalog(request, { source: createSupabaseSource })
}
