import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import type { SupabaseClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

// Debug: Log env vars (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[lib/supabase] Environment check:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Found' : isTest ? '✓ Test fallback' : '✗ Missing')
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Found' : isTest ? '✓ Test fallback' : '✗ Missing')
}

const effectiveSupabaseUrl = supabaseUrl ?? (isTest ? 'http://localhost:54321' : undefined)
const effectiveSupabaseKey = supabaseKey ?? (isTest ? 'test-anon-key' : undefined)

if (!effectiveSupabaseUrl || !effectiveSupabaseKey) {
  const errorMsg = `
❌ Missing Supabase environment variables!

Please ensure your .env.local file exists in the project root with:
  - NEXT_PUBLIC_SUPABASE_URL=https://hfkittwgwtjdzwzjvqgx.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Then:
  1. Stop your dev server (Ctrl+C)
  2. Run: rm -rf .next
  3. Restart: npm run dev

Current working directory: ${process.cwd()}
`
  throw new Error(errorMsg)
}

/** Narrowed for TS (closure in `createSupabaseSingleton` does not inherit control-flow narrowing). */
const resolvedSupabaseUrl: string = effectiveSupabaseUrl
const resolvedSupabaseKey: string = effectiveSupabaseKey

/**
 * Capacitor WebView often fails to persist auth cookies across process death; `localStorage`
 * survives. OAuth still lands with cookies first — see `hydrateNativeAuthFromCookiesIfNeeded`.
 */
function useNativePersistentAuth(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

function createSupabaseSingleton(): SupabaseClient {
  if (useNativePersistentAuth()) {
    return createClient(resolvedSupabaseUrl, resolvedSupabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        flowType: 'pkce',
      },
      global: {
        headers: { 'X-Client-Info': 'shiftcoach-capacitor' },
      },
    })
  }
  return createBrowserClient(resolvedSupabaseUrl, resolvedSupabaseKey)
}

// Create singleton browser / native client.
const supabaseClient = createSupabaseSingleton()

// Wrap auth.getUser to catch AuthSessionMissingError silently
const originalGetUser = supabaseClient.auth.getUser.bind(supabaseClient.auth)
supabaseClient.auth.getUser = async function (...args: any[]) {
  try {
    return await originalGetUser(...args)
  } catch (err: any) {
    if (
      err?.name === 'AuthSessionMissingError' ||
      err?.message?.includes('Auth session missing') ||
      err?.__isAuthError
    ) {
      return { data: { user: null }, error: err }
    }
    throw err
  }
}

export const supabase = supabaseClient

export function createClientComponentClient() {
  return supabaseClient
}
