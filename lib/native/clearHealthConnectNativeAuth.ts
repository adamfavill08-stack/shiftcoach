import { clearHealthConnectNativeLinkedPersisted } from '@/lib/native/wearablesHealthConnectPersisted'
import { isAndroidNativeHealthConnectShell } from '@/lib/native/healthConnectDeviceSyncEligibility'

/** Clears in-memory Health Connect sync bearer on Android (call after sign-out or before clearing web session). */
export async function clearHealthConnectNativeAuth(): Promise<void> {
  clearHealthConnectNativeLinkedPersisted()
  if (!isAndroidNativeHealthConnectShell()) return
  try {
    const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
    await ShiftCoachHealthConnect.clearNativeHealthConnectAuth()
  } catch {
    // Non-fatal — logout must complete even if native bridge is unavailable
  }
}
