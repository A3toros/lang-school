import { createClient } from '@supabase/supabase-js'

// Use the project URL and keys from environment variables
// Try both build-time and runtime environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL || 
                   (typeof window !== 'undefined' && window.ENV?.VITE_SUPABASE_PROJECT_URL)

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                       (typeof window !== 'undefined' && window.ENV?.VITE_SUPABASE_ANON_KEY)

console.log('🔍 [SUPABASE] Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
  anonKey: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing',
  source: import.meta.env.VITE_SUPABASE_PROJECT_URL ? 'build-time' : 'fallback'
})

if (!supabaseUrl) {
  console.error('❌ [SUPABASE] VITE_SUPABASE_PROJECT_URL is not set')
  throw new Error('Supabase project URL is not configured. Please set VITE_SUPABASE_PROJECT_URL in your environment variables.')
}

if (!supabaseAnonKey) {
  console.error('❌ [SUPABASE] VITE_SUPABASE_ANON_KEY is not set')
  throw new Error('Supabase anon key is not configured. Please set VITE_SUPABASE_ANON_KEY in your environment variables.')
}

// Create a single Supabase client instance
let supabaseClient = null
let supabaseAdminClient = null

export const supabase = (() => {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
})()

// For direct PostgreSQL operations, use the connection string
export const postgresConnection = import.meta.env.VITE_SUPABASE_URL

// Service role client for server-side operations (only when needed)
export const getSupabaseAdmin = () => {
  if (!supabaseAdminClient) {
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                          (typeof window !== 'undefined' && window.ENV?.VITE_SUPABASE_SERVICE_ROLE_KEY)
    
    if (!serviceRoleKey) {
      throw new Error('Supabase service role key is not configured. Please set VITE_SUPABASE_SERVICE_ROLE_KEY in your environment variables.')
    }
    
    supabaseAdminClient = createClient(
      supabaseUrl, 
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return supabaseAdminClient
}
