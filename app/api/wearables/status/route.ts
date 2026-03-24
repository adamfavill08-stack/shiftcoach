import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

/**
 * GET /api/wearables/status
 *
 * Returns wearable connectivity across active providers.
 * Google Fit is deprecated and no longer treated as an active provider.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const { data: sources } = await supabase
      .from('device_sources')
      .select('platform,last_synced_at')
      .eq('user_id', userId)

    const sourceRows = Array.isArray(sources) ? sources : []
    const sourcePlatforms = sourceRows.map((r: any) => String(r.platform || ''))
    const hasHealthConnect = sourcePlatforms.some((p) => p === 'android_health_connect' || p === 'health_connect')
    const hasAppleHealth = sourcePlatforms.some((p) => p === 'ios_healthkit' || p === 'apple_health')

    const latestSourceSyncAt = sourceRows
      .map((r: any) => (typeof r.last_synced_at === 'string' ? new Date(r.last_synced_at).getTime() : 0))
      .reduce((a: number, b: number) => Math.max(a, b), 0)

    const hasRecentNativeSync =
      latestSourceSyncAt > 0 &&
      (Date.now() - latestSourceSyncAt) < 1000 * 60 * 60 * 24 * 7

    const url = new URL(req.url)
    const clientStart = url.searchParams.get('startTimeMillis')
    const clientEnd = url.searchParams.get('endTimeMillis')
    let startTimeMillis: number
    let endTimeMillis: number

    if (clientStart != null && clientEnd != null) {
      const s = Number(clientStart)
      const e = Number(clientEnd)
      if (Number.isFinite(s) && Number.isFinite(e) && s < e) {
        startTimeMillis = s
        endTimeMillis = e
      } else {
        endTimeMillis = Date.now()
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        startTimeMillis = startOfDay.getTime()
      }
    } else {
      endTimeMillis = Date.now()
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      startTimeMillis = startOfDay.getTime()
    }

    const startIso = new Date(startTimeMillis).toISOString()
    const endIso = new Date(endTimeMillis).toISOString()

    const activityRows = await supabase
      .from('activity_logs')
      .select('steps,source,created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(200)

    let totalSteps = 0
    if (!activityRows.error && activityRows.data) {
      for (const row of activityRows.data as any[]) {
        if (typeof row?.steps === 'number') {
          totalSteps += row.steps
        }
      }
    }

    const connected = hasHealthConnect || hasAppleHealth || totalSteps > 0

    return NextResponse.json({
      connected,
      verified: connected && (hasRecentNativeSync || totalSteps > 0),
      provider: hasHealthConnect
        ? 'health_connect'
        : hasAppleHealth
          ? 'apple_health'
          : connected
            ? 'wearable'
            : null,
      stepsToday: totalSteps,
      providers: {
        healthConnectConnected: hasHealthConnect,
        appleHealthConnected: hasAppleHealth,
        googleFitConnected: false,
      },
    })
  } catch (err) {
    console.error('[wearables/status] Unexpected error:', err)
    return NextResponse.json({ connected: false, error: 'unexpected' })
  }
}

