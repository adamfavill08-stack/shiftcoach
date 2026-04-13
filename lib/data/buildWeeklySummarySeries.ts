import type { SupabaseClient } from '@supabase/supabase-js'
import { shiftRhythmTotalToGauge100 } from '@/lib/shift-rhythm/shiftRhythmDisplay'

export type WeeklySummarySeriesPayload = {
  body_clock_scores: number[]
  sleep_hours: number[]
  sleep_timing_scores: number[]
}

export function emptyWeeklySummarySeries(): WeeklySummarySeriesPayload {
  const z = [0, 0, 0, 0, 0, 0, 0]
  return {
    body_clock_scores: [...z],
    sleep_hours: [...z],
    sleep_timing_scores: [...z],
  }
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

function isMainSleepRow(row: Record<string, unknown>): boolean {
  const type = String(row.type ?? '').toLowerCase()
  if (type === 'nap' || type === 'pre_shift_nap') return false
  const naps = row.naps
  if (typeof naps === 'number' && naps > 0 && !row.type) return false
  if (type === 'main_sleep' || type === 'sleep' || type === 'post_shift_sleep' || type === 'recovery_sleep')
    return true
  if (!type && (naps === 0 || naps == null)) return true
  return type !== 'nap'
}

function rowEndMs(row: Record<string, unknown>): number | null {
  const end = (row.end_at ?? row.end_ts) as string | null | undefined
  if (!end) return null
  const ms = new Date(end).getTime()
  return Number.isFinite(ms) ? ms : null
}

function rowStartMs(row: Record<string, unknown>): number | null {
  const start = (row.start_at ?? row.start_ts) as string | null | undefined
  if (!start) return null
  const ms = new Date(start).getTime()
  return Number.isFinite(ms) ? ms : null
}

function rowHours(row: Record<string, unknown>): number {
  const sh = row.sleep_hours
  if (typeof sh === 'number' && Number.isFinite(sh)) return Math.max(0, sh)
  const dm = row.duration_min
  if (typeof dm === 'number' && Number.isFinite(dm)) return Math.max(0, dm / 60)
  const s = rowStartMs(row)
  const e = rowEndMs(row)
  if (s != null && e != null && e > s) return (e - s) / 3600000
  return 0
}

/** Calendar day (YYYY-MM-DD) we attribute this main sleep to — prefer `date`, else wake day in UTC. */
function attributionDate(row: Record<string, unknown>): string | null {
  const dateCol = row.date as string | null | undefined
  if (dateCol && /^\d{4}-\d{2}-\d{2}/.test(dateCol)) return dateCol.slice(0, 10)
  const e = rowEndMs(row)
  if (e == null) return null
  return new Date(e).toISOString().slice(0, 10)
}

function rowDedupeKey(row: Record<string, unknown>): string {
  const id = row.id
  if (typeof id === 'string' && id.length > 0) return `id:${id}`
  const s = rowStartMs(row)
  const e = rowEndMs(row)
  return `ts:${s ?? 'x'}-${e ?? 'x'}`
}

async function fetchSleepRowsOverlappingWeek(
  serverSupabase: SupabaseClient,
  userId: string,
  bufferStart: string,
  bufferEnd: string,
): Promise<Record<string, unknown>[]> {
  const seen = new Set<string>()
  const merged: Record<string, unknown>[] = []
  const ingest = (batch: Record<string, unknown>[]) => {
    for (const row of batch) {
      const k = rowDedupeKey(row)
      if (seen.has(k)) continue
      seen.add(k)
      merged.push(row)
    }
  }

  const startIso = `${bufferStart}T00:00:00.000Z`
  const endIso = `${bufferEnd}T23:59:59.999Z`
  // No `deleted_at` filter here: older DBs lack the column and PostgREST would error.
  const base =
    'id, date, start_ts, end_ts, start_at, end_at, sleep_hours, duration_min, type, naps'

  const { data: byEndAt, error: e1 } = await serverSupabase
    .from('sleep_logs')
    .select(base)
    .eq('user_id', userId)
    .gte('end_at', startIso)
    .lte('end_at', endIso)

  if (e1) {
    console.warn('[buildWeeklySummarySeries] sleep_logs end_at:', e1.message)
  } else {
    ingest((byEndAt ?? []) as Record<string, unknown>[])
  }

  const { data: byEndTs, error: e2 } = await serverSupabase
    .from('sleep_logs')
    .select(base)
    .eq('user_id', userId)
    .gte('end_ts', startIso)
    .lte('end_ts', endIso)

  if (e2) {
    console.warn('[buildWeeklySummarySeries] sleep_logs end_ts:', e2.message)
  } else {
    ingest((byEndTs ?? []) as Record<string, unknown>[])
  }

  return merged
}

/**
 * Build seven aligned arrays for the week starting `weekStart` (YYYY-MM-DD, inclusive).
 * Uses main sleep only for hours; uses `shift_rhythm_scores` per day for body clock / timing.
 */
export async function buildWeeklySummarySeries(
  serverSupabase: SupabaseClient,
  userId: string,
  weekStart: string,
): Promise<WeeklySummarySeriesPayload> {
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysYmd(weekStart, i))
  const weekEnd = weekDates[6]!
  console.log('[buildWeeklySummarySeries] rolling week range', {
    weekStart,
    weekEndInclusive: weekEnd,
    weekDates,
  })
  const bufferStart = addDaysYmd(weekStart, -2)
  const bufferEnd = addDaysYmd(weekEnd, 2)

  const sleepByDate = new Map<string, number>()
  for (const d of weekDates) sleepByDate.set(d, 0)

  const rows = await fetchSleepRowsOverlappingWeek(serverSupabase, userId, bufferStart, bufferEnd)
  for (const row of rows) {
    if (!isMainSleepRow(row)) continue
    const day = attributionDate(row)
    if (!day || !sleepByDate.has(day)) continue
    const h = rowHours(row)
    sleepByDate.set(day, (sleepByDate.get(day) ?? 0) + h)
  }

  const { data: rhythmRows, error: rhythmErr } = await serverSupabase
    .from('shift_rhythm_scores')
    .select('date, total_score, sleep_score, regularity_score')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)

  if (rhythmErr) {
    console.warn('[buildWeeklySummarySeries] shift_rhythm_scores:', rhythmErr.message)
  }

  console.log('[buildWeeklySummarySeries] shift_rhythm_scores rows in date range', {
    count: rhythmRows?.length ?? 0,
    weekStart,
    weekEndInclusive: weekEnd,
  })

  const bodyByDate = new Map<string, number>()
  const timingByDate = new Map<string, number>()
  for (const r of rhythmRows ?? []) {
    const d = (r as { date: string }).date?.slice(0, 10)
    if (!d) continue
    const total = (r as { total_score: number | null }).total_score
    bodyByDate.set(d, shiftRhythmTotalToGauge100(total))
    const sleepS = Number((r as { sleep_score?: number | null }).sleep_score)
    const regS = Number((r as { regularity_score?: number | null }).regularity_score)
    let timing = 0
    if (Number.isFinite(sleepS) && Number.isFinite(regS)) {
      timing = Math.round((sleepS + regS) / 2)
    } else if (Number.isFinite(regS)) {
      timing = Math.round(regS)
    } else if (Number.isFinite(sleepS)) {
      timing = Math.round(sleepS)
    }
    timingByDate.set(d, Math.min(100, Math.max(0, timing)))
  }

  const sleep_hours = weekDates.map((d) => {
    const v = sleepByDate.get(d) ?? 0
    return Math.round(v * 10) / 10
  })
  const body_clock_scores = weekDates.map((d) => bodyByDate.get(d) ?? 0)
  const sleep_timing_scores = weekDates.map((d) => timingByDate.get(d) ?? 0)

  return { body_clock_scores, sleep_hours, sleep_timing_scores }
}
