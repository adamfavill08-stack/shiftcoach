import type { ShiftCoachHealthConnectPlugin } from '@/lib/native/shiftCoachHealthConnect'
import { prepareHealthConnectNativeAuth } from '@/lib/native/prepareHealthConnectNativeAuth'

type SyncNowResult = Awaited<ReturnType<ShiftCoachHealthConnectPlugin['syncNow']>>

const isDevClient = process.env.NODE_ENV !== 'production'

function pluginErrCode(err: unknown): string {
  if (!err || typeof err !== 'object' || !('code' in err)) return ''
  const c = (err as { code?: unknown }).code
  return typeof c === 'string' ? c : ''
}

/**
 * Opens the Health Connect permission sheet when Steps / Sleep / Heart rate reads are not all granted.
 * {@link ShiftCoachHealthConnectPlugin.syncNow} rejects without prompting; callers must use this path.
 */
async function ensureHealthConnectReadPermissions(
  ShiftCoachHealthConnect: ShiftCoachHealthConnectPlugin,
): Promise<void> {
  const status = await ShiftCoachHealthConnect.getStatus()
  if (!status.available) return
  if (status.hasPermissions) return
  if (status.permissionFlowReady === false) {
    throw Object.assign(
      new Error(
        'Health Connect permission UI is not available. Close Shift Coach completely and open it again from the app icon, then retry sync.',
      ),
      { code: 'health_connect_ui_unavailable' },
    )
  }
  const perm = await ShiftCoachHealthConnect.requestConnectPermissions()
  if (perm.sdkUnavailable) {
    throw Object.assign(new Error('Health Connect is not available on this device.'), {
      code: 'health_connect_unavailable',
    })
  }
  if (!perm.granted) {
    throw Object.assign(new Error('Grant Health Connect permissions first'), {
      code: 'health_connect_permissions',
    })
  }
}

function applySleepSessionSessionStorageHint(result: SyncNowResult): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const n = typeof result?.sleepSessionCount === 'number' ? result.sleepSessionCount : null
    if (n === 0) {
      sessionStorage.setItem('shiftcoach_hc_sleep_read_zero_at', String(Date.now()))
    } else if (typeof n === 'number' && n > 0) {
      sessionStorage.removeItem('shiftcoach_hc_sleep_read_zero_at')
    }
  } catch {
    /* ignore */
  }
}

/**
 * Single entry for native Health Connect POST: prepares Supabase Bearer on the plugin, then syncNow.
 * All UI must use this instead of calling {@link ShiftCoachHealthConnectPlugin.syncNow} directly.
 *
 * Ensures the Health Connect read sheet runs when any of Steps, Sleep sessions, or Heart rate are not
 * granted — same types as {@link ShiftCoachHealthConnectPlugin.requestConnectPermissions} on Android.
 */
export async function runHealthConnectNativeSync(from: string): Promise<SyncNowResult> {
  const ok = await prepareHealthConnectNativeAuth()
  if (!ok) {
    throw Object.assign(new Error('Please sign in again before syncing Health Connect.'), {
      code: 'health_connect_auth_missing',
    })
  }

  if (isDevClient) {
    console.info('[HealthConnect] calling syncNow from', from)
  }

  const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')

  await ensureHealthConnectReadPermissions(ShiftCoachHealthConnect)

  const runSync = async (): Promise<SyncNowResult> => {
    const result = await ShiftCoachHealthConnect.syncNow()
    if (isDevClient && result?.syncResult && typeof result.syncResult === 'object') {
      console.info('[HealthConnect] syncResult', result.syncResult)
    }
    applySleepSessionSessionStorageHint(result)
    return result
  }

  try {
    return await runSync()
  } catch (first) {
    if (pluginErrCode(first) !== 'health_connect_permissions') throw first
    const st = await ShiftCoachHealthConnect.getStatus()
    if (st.hasPermissions) {
      return await runSync()
    }
    await ensureHealthConnectReadPermissions(ShiftCoachHealthConnect)
    return await runSync()
  }
}
