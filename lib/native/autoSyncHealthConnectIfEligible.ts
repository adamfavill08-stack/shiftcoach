import { isAndroidNativeHealthConnectShell } from '@/lib/native/healthConnectDeviceSyncEligibility'
import { runHealthConnectNativeSync } from '@/lib/native/runHealthConnectNativeSync'

/**
 * Fire-and-forget Health Connect pull when the native shell is available and HC read perms are granted.
 * Dispatches the same refresh signals as a manual wearable sync so Sleep + Dashboard cards refetch.
 */
export function autoSyncHealthConnectIfEligible(reason: string): void {
  if (typeof window === 'undefined' || !isAndroidNativeHealthConnectShell()) return

  void (async () => {
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      const status = await ShiftCoachHealthConnect.getStatus()
      if (!status.available || !status.hasPermissions) return

      console.info('[HC-auto] sync started', reason, {
        sleepReadPermissionGranted: status.sleepReadPermissionGranted,
      })
      const result = await runHealthConnectNativeSync(reason)
      const ok =
        result?.ok === true ||
        (typeof (result as { lastSyncedAt?: string })?.lastSyncedAt === 'string' &&
          (result as { lastSyncedAt: string }).lastSyncedAt.length > 0)
      if (!ok) {
        console.info('[HC-auto] sync completed', reason, { ok: false })
        return
      }

      console.info('[HC-auto] sync completed', reason, {
        ok: true,
        sleepSessionCount: (result as { sleepSessionCount?: number }).sleepSessionCount,
        sleepTotalMinutes: (result as { sleepTotalMinutes?: number }).sleepTotalMinutes,
      })

      const ts =
        typeof (result as { lastSyncedAt?: string })?.lastSyncedAt === 'string'
          ? new Date((result as { lastSyncedAt: string }).lastSyncedAt).getTime()
          : Date.now()
      window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
    } catch (e) {
      console.warn('[HealthConnect] autoSyncHealthConnectIfEligible', reason, e)
    }
  })()
}
