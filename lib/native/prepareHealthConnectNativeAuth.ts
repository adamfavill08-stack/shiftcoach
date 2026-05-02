import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { hydrateNativeAuthFromCookiesIfNeeded } from '@/lib/supabase/nativeSessionHydrate'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isDev = process.env.NODE_ENV !== 'production'

function isAndroidNative(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

/**
 * Ensures the native Health Connect plugin has the current Supabase access token (in-memory only).
 * Uses native `pullAuthFromWebSession` (reads WebView `localStorage`) so the JWT never crosses the
 * Capacitor bridge as `methodData` (which can appear in logcat when bridge logging is enabled).
 */
export async function prepareHealthConnectNativeAuth(): Promise<boolean> {
  if (!isAndroidNative()) return false

  await hydrateNativeAuthFromCookiesIfNeeded(supabase, supabaseUrl, supabaseAnonKey)

  await supabase.auth.getUser().catch(() => null)

  let { data: sessionData } = await supabase.auth.getSession()
  let accessToken = sessionData.session?.access_token?.trim() ?? null
  let refreshToken = sessionData.session?.refresh_token?.trim() ?? null

  if (!accessToken) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    accessToken = refreshed.session?.access_token?.trim() ?? null
    refreshToken = refreshed.session?.refresh_token?.trim() ?? null
  }

  if (!accessToken) {
    const { data: again } = await supabase.auth.getSession()
    accessToken = again.session?.access_token?.trim() ?? null
    refreshToken = again.session?.refresh_token?.trim() ?? null
  }

  // Ensure persisted session is written to localStorage before native reads it.
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  }

  const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
  const pull = await ShiftCoachHealthConnect.pullAuthFromWebSession()

  if (!pull.tokenPresent) {
    await ShiftCoachHealthConnect.clearNativeHealthConnectAuth()
    if (isDev) {
      console.info('[HealthConnect] prepare native auth', { tokenPresent: false })
    }
    return false
  }

  if (isDev) {
    console.info('[HealthConnect] prepare native auth', { tokenPresent: true })
  }
  return true
}
