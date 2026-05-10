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
function isNativePersistentAuthPlatform(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

function createSupabaseSingleton(): SupabaseClient {
  if (isNativePersistentAuthPlatform()) {
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

/** JWT still in storage but user row was removed (or wrong project) — clear local session to stop repeat failures. */
function isStaleJwtUserMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const msg = String((err as { message?: string }).message ?? '')
  return /User from sub claim in JWT does not exist/i.test(msg) || /JWT.*does not exist/i.test(msg)
}

async function clearStaleAuthSession(): Promise<void> {
  try {
    await supabaseClient.auth.signOut({ scope: 'local' })
  } catch {
    /* ignore */
  }
}

// Wrap auth.getUser to catch AuthSessionMissingError silently and recover from orphaned JWTs
const originalGetUser = supabaseClient.auth.getUser.bind(supabaseClient.auth)
supabaseClient.auth.getUser = async function (...args: any[]) {
  try {
    const result = await originalGetUser(...args)
    if (result.error && isStaleJwtUserMissingError(result.error)) {
      await clearStaleAuthSession()
      return { data: { user: null }, error: null }
    }
    return result
  } catch (err: any) {
    if (isStaleJwtUserMissingError(err)) {
      await clearStaleAuthSession()
      return { data: { user: null }, error: null }
    }
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

const originalRefreshSession = supabaseClient.auth.refreshSession.bind(supabaseClient.auth)
supabaseClient.auth.refreshSession = async function (...args: any[]) {
  try {
    const out = await originalRefreshSession(...args)
    if (out.error && isStaleJwtUserMissingError(out.error)) {
      await clearStaleAuthSession()
      return { data: { session: null, user: null }, error: null }
    }
    return out
  } catch (err: any) {
    if (isStaleJwtUserMissingError(err)) {
      await clearStaleAuthSession()
      return { data: { session: null, user: null }, error: null }
    }
    throw err
  }
}

export const supabase = supabaseClient

export function createClientComponentClient() {
  return supabaseClient
}
