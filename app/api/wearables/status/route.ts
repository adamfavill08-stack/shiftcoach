import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'

const ANDROID_HEALTH_PROVIDER = 'android_health_connect'

function resolveRequestTimeZone(url: URL): string {
  const raw = url.searchParams.get('tz') ?? url.searchParams.get('timeZone') ?? ''
  const decoded = raw ? decodeURIComponent(raw.trim()) : ''
  const zone = decoded.slice(0, 120)
  if (!zone) return 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}

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
    const hasHealthConnect = sourcePlatforms.some((p) => p === ANDROID_HEALTH_PROVIDER)
    const hasAppleHealth = sourcePlatforms.some((p) => p === 'ios_healthkit' || p === 'apple_health')

    const latestSourceSyncAt = sourceRows
      .map((r: any) => (typeof r.last_synced_at === 'string' ? new Date(r.last_synced_at).getTime() : 0))
      .reduce((a: number, b: number) => Math.max(a, b), 0)

    const hasRecentNativeSync =
      latestSourceSyncAt > 0 &&
      (Date.now() - latestSourceSyncAt) < 1000 * 60 * 60 * 24 * 7

    const url = new URL(req.url)
    const activityIntelTimeZone = resolveRequestTimeZone(url)
    const localToday = formatYmdInTimeZone(new Date(), activityIntelTimeZone)

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

    /** Health Connect / Apple daily rows use `activity_date` + `ts`; `created_at` does not move on upsert. */
    let totalSteps = 0
    const byActivityDate = await supabase
      .from('activity_logs')
      .select('steps,source,ts,activity_date')
      .eq('user_id', userId)
      .eq('activity_date', localToday)

    if (!byActivityDate.error && byActivityDate.data?.length) {
      for (const row of byActivityDate.data as { steps?: number }[]) {
        if (typeof row?.steps === 'number') totalSteps += row.steps
      }
    } else if (
      byActivityDate.error &&
      (byActivityDate.error.code === '42703' || String(byActivityDate.error.message ?? '').includes('activity_date'))
    ) {
      const activityRows = await supabase
        .from('activity_logs')
        .select('steps,source,created_at')
        .eq('user_id', userId)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!activityRows.error && activityRows.data) {
        for (const row of activityRows.data as any[]) {
          if (typeof row?.steps === 'number') {
            totalSteps += row.steps
          }
        }
      }
    } else if (!byActivityDate.error) {
      const byTs = await supabase
        .from('activity_logs')
        .select('steps')
        .eq('user_id', userId)
        .gte('ts', startIso)
        .lt('ts', endIso)
        .order('ts', { ascending: false })
        .limit(200)
      const tsBroken =
        !!byTs.error &&
        (byTs.error.code === '42703' || String(byTs.error.message ?? '').toLowerCase().includes('ts'))
      if (!tsBroken && !byTs.error && byTs.data?.length) {
        for (const row of byTs.data as { steps?: number }[]) {
          if (typeof row?.steps === 'number') totalSteps += row.steps
        }
      }
      if (totalSteps === 0) {
        const byCreated = await supabase
          .from('activity_logs')
          .select('steps')
          .eq('user_id', userId)
          .gte('created_at', startIso)
          .lt('created_at', endIso)
          .order('created_at', { ascending: false })
          .limit(200)
        if (!byCreated.error && byCreated.data) {
          for (const row of byCreated.data as { steps?: number }[]) {
            if (typeof row?.steps === 'number') totalSteps += row.steps
          }
        }
      }
    }

    const connected = hasHealthConnect || hasAppleHealth || totalSteps > 0

    return NextResponse.json({
      connected,
      verified: connected && (hasRecentNativeSync || totalSteps > 0),
      lastSyncAt: latestSourceSyncAt > 0 ? new Date(latestSourceSyncAt).toISOString() : null,
      provider: hasHealthConnect
        ? ANDROID_HEALTH_PROVIDER
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

