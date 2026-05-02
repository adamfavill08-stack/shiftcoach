import type { ShiftCoachHealthConnectPlugin } from '@/lib/native/shiftCoachHealthConnect'
import { prepareHealthConnectNativeAuth } from '@/lib/native/prepareHealthConnectNativeAuth'

type SyncNowResult = Awaited<ReturnType<ShiftCoachHealthConnectPlugin['syncNow']>>

const isDevClient = process.env.NODE_ENV !== 'production'

/**
 * Single entry for native Health Connect POST: prepares Supabase Bearer on the plugin, then syncNow.
 * All UI must use this instead of calling {@link ShiftCoachHealthConnectPlugin.syncNow} directly.
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
  return ShiftCoachHealthConnect.syncNow()
}
