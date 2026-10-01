import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function consoleAuthClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  browserClient ??= createClient(url, key, {
    auth: { storageKey: 'volynx-cloud-console-auth', persistSession: true, autoRefreshToken: true }
  })
  return browserClient
}
