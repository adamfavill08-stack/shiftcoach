import { Capacitor } from '@capacitor/core'

/** Survives app restarts; cleared on sign-out or when native HC permissions are no longer granted. */
export const HEALTH_CONNECT_NATIVE_LINKED_KEY = 'wearables:healthConnectNativeLinked' as const

function isAndroidNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

export function readHealthConnectNativeLinkedPersisted(): boolean {
  if (!isAndroidNative()) return false
  try {
    return window.localStorage.getItem(HEALTH_CONNECT_NATIVE_LINKED_KEY) === '1'
  } catch {
    return false
  }
}

export function persistHealthConnectNativeLinked(): void {
  if (!isAndroidNative()) return
  try {
    window.localStorage.setItem(HEALTH_CONNECT_NATIVE_LINKED_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearHealthConnectNativeLinkedPersisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(HEALTH_CONNECT_NATIVE_LINKED_KEY)
  } catch {
    /* ignore */
  }
}

/** If the user revoked HC reads in system settings, drop the persisted “linked” flag so UI matches. */
export async function refreshPersistedHealthConnectIfNativeRevoked(): Promise<void> {
  if (!isAndroidNative()) return
  try {
    const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
    const s = await ShiftCoachHealthConnect.getStatus()
    if (s.available && !s.hasPermissions) {
      clearHealthConnectNativeLinkedPersisted()
    }
  } catch {
    /* ignore */
  }
}
