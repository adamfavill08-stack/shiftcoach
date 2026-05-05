import { NextRequest, NextResponse } from 'next/server'
import { buildUnauthorizedResponse, getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { endOfLocalDayUtcMs, formatYmdInTimeZone, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

export const dynamic = 'force-dynamic'

function resolveTimeZone(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get('tz') ?? req.nextUrl.searchParams.get('timeZone') ?? ''
  const zone = decodeURIComponent(raw).trim().slice(0, 120)
  if (!zone) return 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const now = new Date()
  const tz = resolveTimeZone(req)
  const endYmd = formatYmdInTimeZone(now, tz)
  const startYmdDate = new Date(now)
  startYmdDate.setDate(startYmdDate.getDate() - 29)
  const startYmd = formatYmdInTimeZone(startYmdDate, tz)

  const DAY_MS = 24 * 60 * 60 * 1000
  const startUtcMs = startOfLocalDayUtcMs(startYmd, tz)
  const endUtcMs = endOfLocalDayUtcMs(endYmd, tz)
  /** Pull a buffer so shifts (and HC buckets) tying to calendar edges are not clipped. */
  const sampleFetchStartIso = new Date(startUtcMs - 2 * DAY_MS).toISOString()
  const sampleFetchEndIso = new Date(endUtcMs + 2 * DAY_MS).toISOString()
  const shiftsFetchStartIso = new Date(startUtcMs - 4 * DAY_MS).toISOString()
  const shiftsFetchEndIso = new Date(endUtcMs + 2 * DAY_MS).toISOString()

  /** Roster instants (`start_ts`/`end_ts` timestamptz) drive all windows — same semantics as logical `start_time`/`end_time` on calendar UIs. */
  const [shiftRes, samplesRes] = await Promise.all([
    supabase
      .from('shifts')
      .select('date,label,start_ts,end_ts')
      .eq('user_id', userId)
      .lte('start_ts', shiftsFetchEndIso)
      .gte('end_ts', shiftsFetchStartIso)
      .order('start_ts', { ascending: false }),
    supabase
      .from('wearable_step_samples')
      .select('bucket_start_utc,bucket_end_utc,steps')
      .eq('user_id', userId)
      .gte('bucket_start_utc', sampleFetchStartIso)
      .lte('bucket_start_utc', sampleFetchEndIso)
      .order('bucket_start_utc', { ascending: false }),
  ])

  if (shiftRes.error) {
    return NextResponse.json({ error: 'failed_to_load_shifts' }, { status: 500 })
  }
  if (samplesRes.error) {
    return NextResponse.json({ error: 'failed_to_load_step_samples' }, { status: 500 })
  }

  return NextResponse.json({
    range: { startYmd, endYmd, timeZone: tz },
    shifts: shiftRes.data ?? [],
    stepSamples: samplesRes.data ?? [],
  })
}
