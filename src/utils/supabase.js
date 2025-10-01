import { createClient } from '@supabase/supabase-js'

// Use the project URL and keys from environment variables
// Try both build-time and runtime environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL || 
                   (typeof window !== 'undefined' && window.ENV?.VITE_SUPABASE_PROJECT_URL) ||
                   'https://carqvkbmbnqofizbbkjt.supabase.co'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                       (typeof window !== 'undefined' && window.ENV?.VITE_SUPABASE_ANON_KEY) ||
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcnF2a2JtYm5xb2ZpemJia2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1Mjk0MTEsImV4cCI6MjA3NDEwNTQxMX0.2vzjY0M2fBEaOyfo5XVPqtF7ZZ0-WjZDXX0awA2U7uE'

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For direct PostgreSQL operations, use the connection string
export const postgresConnection = import.meta.env.VITE_SUPABASE_URL

// Service role client for server-side operations
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                      (typeof window !== 'undefined' && window.ENV?.VITE_SUPABASE_SERVICE_ROLE_KEY) ||
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcnF2a2JtYm5xb2ZpemJia2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUyOTQxMSwiZXhwIjoyMDc0MTA1NDExfQ.u2W-xGXZcvXWvMTsVAxe7pF3fn6OdH1PRsqjjEFU4f4'

export const supabaseAdmin = createClient(
  supabaseUrl, 
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
