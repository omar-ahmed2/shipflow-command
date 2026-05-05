import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing! Check your .env file.')
}

// Single global client instance - NEVER create new connections per request
let supabaseInstance: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'shipflow-command'
        }
      }
    })
  }
  return supabaseInstance
}

// Export singleton instance
export const supabase = getSupabaseClient()

// Connection health check
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true })
    return !error
  } catch {
    return false
  }
}
