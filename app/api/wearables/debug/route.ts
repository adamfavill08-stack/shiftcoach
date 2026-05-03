import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'

export const dynamic = 'force-dynamic'

function resolveRequestTimeZone(req: Request): string {
  const url = new URL(req.url)
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

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const tz = resolveRequestTimeZone(req)
    const localToday = formatYmdInTimeZone(new Date(), tz)

    const sourceRows = await supabase
      .from('device_sources')
      .select('platform,last_synced_at')
      .eq('user_id', userId)

    // Recent activity logs (try ts first, then created_at fallback)
    let activityRows: any[] = []
    let activityError: string | null = null
    const activityTs = await supabase
      .from('activity_logs')
      .select('id, steps, active_minutes, source, ts, created_at, activity_date')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(10)

    if (activityTs.error && (activityTs.error.code === '42703' || activityTs.error.message?.includes('ts'))) {
      const activityCreatedAt = await supabase
        .from('activity_logs')
        .select('id, steps, active_minutes, source, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      activityRows = activityCreatedAt.data ?? []
      activityError = activityCreatedAt.error?.message ?? null
    } else {
      activityRows = activityTs.data ?? []
      activityError = activityTs.error?.message ?? null
    }

    const activityToday = await supabase
      .from('activity_logs')
      .select('id, steps, ts, activity_date, source')
      .eq('user_id', userId)
      .eq('activity_date', localToday)
      .order('ts', { ascending: false })
      .limit(5)

    // Recent sleep logs (support old/new schemas)
    let sleepRows: any[] = []
    let sleepError: string | null = null
    const sleepOld = await supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps, type, created_at')
      .eq('user_id', userId)
      .order('start_ts', { ascending: false })
      .limit(10)

    if (sleepOld.error && (sleepOld.error.code === '42703' || sleepOld.error.message?.includes('start_ts'))) {
      const sleepNew = await supabase
        .from('sleep_logs')
        .select('id, date, start_at, end_at, sleep_hours, quality, naps, type, created_at')
        .eq('user_id', userId)
        .order('start_at', { ascending: false })
        .limit(10)
      sleepRows = sleepNew.data ?? []
      sleepError = sleepNew.error?.message ?? null
    } else {
      sleepRows = sleepOld.data ?? []
      sleepError = sleepOld.error?.message ?? null
    }

    const sleepRecordsRecent = await supabase
      .from('sleep_records')
      .select('id, start_at, end_at, source, stage')
      .eq('user_id', userId)
      .eq('source', 'health_connect')
      .order('end_at', { ascending: false })
      .limit(10)

    const hrRecent = await supabase
      .from('wearable_heart_rate_samples')
      .select('recorded_at, bpm, source')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(10)

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: hrCount24h } = await supabase
      .from('wearable_heart_rate_samples')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('recorded_at', since24h)

    return NextResponse.json(
      {
        authenticated: true,
        hookAlignment: {
          localTodayUsed: localToday,
          timeZone: tz,
          activityLogsForLocalToday: activityToday.data ?? [],
          activityTodayQueryError: activityToday.error?.message ?? null,
        },
        wearableConnection: {
          connected: (sourceRows.data?.length ?? 0) > 0,
          providerSources: sourceRows.data ?? [],
          tokenUpdatedAt: null,
          tokenError: null,
        },
        rawData: {
          activityLogsRecent: activityRows,
          sleepLogsRecent: sleepRows,
          sleepRecordsHealthConnectRecent: sleepRecordsRecent.data ?? [],
          sleepRecordsHealthConnectError: sleepRecordsRecent.error?.message ?? null,
          wearableHeartRateRecent: hrRecent.data ?? [],
          wearableHeartRateError: hrRecent.error?.message ?? null,
          heartRateSamplesLast24h: typeof hrCount24h === 'number' ? hrCount24h : null,
          activityError,
          sleepError,
        },
      },
      { status: 200 },
    )
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'wearables_debug_failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
}
