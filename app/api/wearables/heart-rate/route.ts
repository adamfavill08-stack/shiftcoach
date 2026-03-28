import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { computeBetweenShiftRecoveryWindow, type ShiftRow } from '@/lib/wearables/betweenShiftRecoveryWindow'
import {
  type HrSample,
  summarizeSamples,
  buildWeeklyTrendUtc,
} from '@/lib/wearables/aggregateHrSamples'
import { heartRateOk, heartRateUnavailable, type HeartMetrics } from '@/lib/wearables/heartRateApi'

const HR_QUERY_LIMIT = 4000
const SHIFT_LOOKBACK_MS = 45 * 24 * 60 * 60 * 1000
const FALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000
const PRIMARY_MIN_SAMPLES = 10
const PRIMARY_MIN_SPAN_MS = 15 * 60 * 1000
const WEEKLY_DAY_MIN_SAMPLES = 8
const WEEKLY_DAY_MIN_SPAN_MS = 10 * 60 * 1000

/**
 * GET /api/wearables/heart-rate
 *
 * Shift-aware between-shift recovery window, percentile resting estimate, real 7-day UTC trend.
 * Always HTTP 200 for contract outcomes; check `status`.
 */
export async function GET() {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer
    const now = new Date()
    const nowMs = now.getTime()

    const anyHr = await supabase
      .from('wearable_heart_rate_samples')
      .select('recorded_at')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (anyHr.error) {
      console.error('[wearables/heart-rate] any-sample check:', anyHr.error.message)
      return NextResponse.json(
        heartRateUnavailable('error', 'Could not read heart-rate data'),
        { status: 500 },
      )
    }

    if (!anyHr.data) {
      return NextResponse.json(
        heartRateUnavailable(
          'no_device',
          'Connect a wearable (Health Connect / Apple Health) and sync so heart rate can appear here.',
        ),
      )
    }

    const shiftSince = new Date(nowMs - SHIFT_LOOKBACK_MS).toISOString()
    const { data: shiftRows, error: shiftErr } = await supabase
      .from('shifts')
      .select('label, start_ts, end_ts, date')
      .eq('user_id', userId)
      .gte('start_ts', shiftSince)
      .order('start_ts', { ascending: true })

    if (shiftErr) {
      console.warn('[wearables/heart-rate] shifts query:', shiftErr.message)
    }

    const shiftWindow = computeBetweenShiftRecoveryWindow((shiftRows ?? []) as ShiftRow[], nowMs)

    let usedFallbackWindow = false
    let sourceWindowLabel: string | undefined
    let windowStart: Date
    let windowEnd: Date

    if (shiftWindow) {
      windowStart = shiftWindow.start
      windowEnd = shiftWindow.end
      sourceWindowLabel = shiftWindow.sourceWindowLabel
    } else {
      usedFallbackWindow = true
      sourceWindowLabel = 'Last 24 hours (add shift times for between-shift recovery)'
      windowEnd = now
      windowStart = new Date(nowMs - FALLBACK_WINDOW_MS)
    }

    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000)
    const fetchFrom = new Date(Math.min(sevenDaysAgo.getTime(), windowStart.getTime()))

    const hrRows = await supabase
      .from('wearable_heart_rate_samples')
      .select('bpm, recorded_at, source')
      .eq('user_id', userId)
      .gte('recorded_at', fetchFrom.toISOString())
      .lte('recorded_at', now.toISOString())
      .order('recorded_at', { ascending: true })
      .limit(HR_QUERY_LIMIT)

    if (hrRows.error) {
      console.error('[wearables/heart-rate] samples query:', hrRows.error.message)
      return NextResponse.json(
        heartRateUnavailable('error', 'Could not read heart-rate samples'),
        { status: 500 },
      )
    }

    const rawRows = hrRows.data ?? []
    const samples: HrSample[] = rawRows
      .map((r: any) => ({
        bpm: typeof r?.bpm === 'number' ? r.bpm : NaN,
        recorded_at: typeof r?.recorded_at === 'string' ? r.recorded_at : '',
      }))
      .filter((s) => Number.isFinite(s.bpm) && s.bpm > 0 && s.recorded_at.length > 0)

    const primary = summarizeSamples(samples, windowStart, windowEnd, {
      minSamples: PRIMARY_MIN_SAMPLES,
      minSpanMs: PRIMARY_MIN_SPAN_MS,
    })

    const weeklyTrend = buildWeeklyTrendUtc(samples, now, 7, WEEKLY_DAY_MIN_SAMPLES, WEEKLY_DAY_MIN_SPAN_MS)

    const wearableSource =
      typeof rawRows[rawRows.length - 1]?.source === 'string'
        ? rawRows[rawRows.length - 1].source
        : 'wearable'

    const heartNull: HeartMetrics = {
      resting_bpm: null,
      avg_bpm: null,
      recovery_delta_bpm: null,
      sample_count: primary.sample_count,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
    }

    if (primary.sample_count === 0) {
      return NextResponse.json(
        heartRateUnavailable(
          'no_recent_data',
          usedFallbackWindow
            ? 'No heart-rate samples in the last 24 hours yet.'
            : 'No heart-rate samples in your between-shift window yet.',
          {
            heart: heartNull,
            weeklyTrend,
            usedFallbackWindow,
            sourceWindowLabel,
          },
        ),
      )
    }

    if (!primary.sufficient) {
      return NextResponse.json(
        heartRateUnavailable(
          'insufficient_data',
          'We need more heart-rate samples across this window to estimate recovery (spread over at least ~15 minutes).',
          {
            heart: {
              ...heartNull,
              resting_bpm: primary.resting_bpm,
              avg_bpm: primary.avg_bpm,
              recovery_delta_bpm: primary.recovery_delta_bpm,
              sample_count: primary.sample_count,
            },
            weeklyTrend,
            usedFallbackWindow,
            sourceWindowLabel,
          },
        ),
      )
    }

    const heart: HeartMetrics = {
      resting_bpm: primary.resting_bpm,
      avg_bpm: primary.avg_bpm,
      recovery_delta_bpm: primary.recovery_delta_bpm,
      sample_count: primary.sample_count,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
    }

    return NextResponse.json(
      heartRateOk(heart, weeklyTrend, {
        sourceWindowLabel,
        usedFallbackWindow,
        wearableSource,
      }),
    )
  } catch (err) {
    console.error('[wearables/heart-rate] Unexpected error:', err)
    return NextResponse.json(
      heartRateUnavailable('error', 'Unexpected error loading heart rate'),
      { status: 500 },
    )
  }
}
