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
 * On Android native: hydrates session from cookies if needed, then getSession → refreshSession if missing token.
 *
 * @returns true if a token was obtained and passed to native; false if user must sign in again.
 */
export async function prepareHealthConnectNativeAuth(): Promise<boolean> {
  if (!isAndroidNative()) return false

  await hydrateNativeAuthFromCookiesIfNeeded(supabase, supabaseUrl, supabaseAnonKey)

  let { data: sessionData } = await supabase.auth.getSession()
  let accessToken = sessionData.session?.access_token ?? null

  if (!accessToken) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    accessToken = refreshed.session?.access_token ?? null
  }

  const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')

  if (!accessToken) {
    await ShiftCoachHealthConnect.setAuthToken({ accessToken: '' })
    if (isDev) {
      console.info('[HealthConnect] prepare native auth', { tokenPresent: Boolean(accessToken) })
    }
    return false
  }

  await ShiftCoachHealthConnect.setAuthToken({ accessToken })
  if (isDev) {
    console.info('[HealthConnect] prepare native auth', { tokenPresent: Boolean(accessToken) })
  }
  return true
}
