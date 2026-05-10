import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchMergedPhoneHealthSleepSessionsOverlapping } from '@/lib/sleep/sleepRecordsSummaryFallback'
import { rowCountsAsPrimarySleep } from '@/lib/sleep/utils'

export type SleepMinutesRow = { date: string; totalMinutes: number }

export type AggregateSleepForDeficitResult =
  | { ok: true; sleepData: SleepMinutesRow[] }
  | { ok: false; error: { message?: string; code?: string }; isMissingRelation: boolean }

/**
 * Seven-day window and per-day minute totals used by GET /api/sleep/deficit and circadian deficit.
 * Priority: primary sleep_logs (rowCountsAsPrimarySleep); if none in window, merged OS sleep_records
 * (health_connect + apple_health), same as the deficit API.
 */
export async function aggregateSleepMinutesForDeficitWindow(
  supabase: SupabaseClient,
  userId: string,
): Promise<AggregateSleepForDeficitResult> {
  const now = new Date()
  const sevenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)

  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getLocalDateFromISO = (isoString: string): string => {
    const date = new Date(isoString)
    return getLocalDateString(date)
  }

  const minutesBetween = (a: string | Date, b: string | Date) => {
    return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
  }

  let weekLogs: any[] = []
  let weekErr: any = null

  let weekResult = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('start_at', sevenAgo.toISOString())
    .order('start_at', { ascending: true })

  weekLogs = weekResult.data || []
  weekErr = weekResult.error

  if (weekErr && (weekErr.message?.includes('start_at') || weekErr.message?.includes('type') || weekErr.code === 'PGRST204')) {
    weekResult = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('start_ts', sevenAgo.toISOString())
      .order('start_ts', { ascending: true })
    weekLogs = weekResult.data || []
    weekErr = weekResult.error
  }

  if (weekErr) {
    const msg = String(weekErr.message ?? '')
    const isMissingRelation = msg.includes('relation') || msg.includes('does not exist')
    return { ok: false, error: weekErr, isMissingRelation }
  }

  const byDay: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
    const key = getLocalDateString(d)
    byDay[key] = 0
  }

  const mainSleepLogs = weekLogs.filter((row: any) => rowCountsAsPrimarySleep(row))

  for (const row of mainSleepLogs ?? []) {
    const endTime = row.end_at || row.end_ts
    const startTime = row.start_at || row.start_ts
    if (!endTime || !startTime) continue

    let key: string
    if (row.date) {
      key = row.date.slice(0, 10)
    } else {
      key = getLocalDateFromISO(endTime)
    }

    // `byDay[key]` is initialised to 0 — must not treat 0 as "missing" (would skip all minutes).
    if (!(key in byDay)) {
      continue
    }
    byDay[key] += minutesBetween(startTime, endTime)
  }

  if (mainSleepLogs.length === 0) {
    const merged = await fetchMergedPhoneHealthSleepSessionsOverlapping(
      supabase,
      userId,
      sevenAgo.toISOString(),
      now.toISOString(),
    )
    for (const s of merged) {
      const key = getLocalDateFromISO(s.end_at)
      if (byDay[key] === undefined) continue
      byDay[key] += minutesBetween(s.start_at, s.end_at)
    }
  }

  const sleepData = Object.entries(byDay).map(([date, totalMinutes]) => ({
    date,
    totalMinutes,
  }))

  return { ok: true, sleepData }
}
