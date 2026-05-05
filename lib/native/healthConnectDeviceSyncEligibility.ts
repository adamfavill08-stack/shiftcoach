import { Capacitor } from '@capacitor/core'

/** True when this client is the ShiftCoach Android app (WebView can run the HC plugin). */
export function isAndroidNativeHealthConnectShell(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

/**
 * Android without the native shell cannot read Health Connect; avoid calling `/api/wearables/sync`
 * as a substitute (that route does not ingest HC).
 */
export function isAndroidWithoutNativeHealthConnect(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.getPlatform() === 'android' && !Capacitor.isNativePlatform()
}
