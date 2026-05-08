import { Capacitor } from '@capacitor/core'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

/**
 * After OAuth, the server sets Supabase auth on `document.cookie`. The native app client
 * uses `localStorage` so sessions survive WebView restarts — copy cookie session into the
 * persistent client when the cookie jar has a session but localStorage does not.
 */
export async function hydrateNativeAuthFromCookiesIfNeeded(
  persistentClient: SupabaseClient,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<void> {
  if (!isCapacitorNative()) return

  const { data: existing } = await persistentClient.auth.getSession()
  if (existing.session) return

  const cookieClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    isSingleton: false,
  })
  const { data: fromCookie, error } = await cookieClient.auth.getSession()
  if (error || !fromCookie.session) return

  await persistentClient.auth.setSession({
    access_token: fromCookie.session.access_token,
    refresh_token: fromCookie.session.refresh_token,
  })
}
