import { supabase } from '@/lib/supabase'
import { hydrateNativeAuthFromCookiesIfNeeded } from '@/lib/supabase/nativeSessionHydrate'
import { isAndroidNativeHealthConnectShell } from '@/lib/native/healthConnectDeviceSyncEligibility'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Ensures the native Health Connect plugin has the current Supabase access token (in-memory only).
 * Uses native `pullAuthFromWebSession` (reads WebView `localStorage`) so the JWT never crosses the
 * Capacitor bridge as `methodData` (which can appear in logcat when bridge logging is enabled).
 */
export async function prepareHealthConnectNativeAuth(): Promise<boolean> {
  if (!isAndroidNativeHealthConnectShell()) return false

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

  if (pull.tokenPresent) {
    if (isDev) {
      console.info('[HealthConnect] prepare native auth', { tokenPresent: true })
    }
    return true
  }

  // WebView read can race or miss keys; JS session is authoritative for manual refresh / backup sync.
  if (accessToken) {
    try {
      await ShiftCoachHealthConnect.setAuthToken({ access_token: accessToken })
      if (isDev) {
        console.info('[HealthConnect] prepare native auth', {
          tokenPresent: false,
          usedJsSetAuthTokenFallback: true,
        })
      }
      return true
    } catch (e) {
      if (isDev) {
        console.warn('[HealthConnect] setAuthToken fallback failed', e)
      }
    }
  }

  await ShiftCoachHealthConnect.clearNativeHealthConnectAuth()
  if (isDev) {
    console.info('[HealthConnect] prepare native auth', { tokenPresent: false })
  }
  return false
}
