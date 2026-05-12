import type { SupabaseClient } from '@supabase/supabase-js'
import { getShiftedDayKey, minutesBetween } from '@/lib/sleep/utils'

const MERGE_GAP_MS = 45 * 60 * 1000
const MIN_SESSION_MS = 30 * 60 * 1000

export const PHONE_HEALTH_SLEEP_SOURCES = ['health_connect', 'apple_health'] as const

export type PhoneHealthSleepRecordRow = {
  start_at: string
  end_at: string
  stage: string | null
}

export type MergedPhoneHealthSleepSession = { start_at: string; end_at: string }

/** True when two sleep intervals overlap in wall time (ISO instants). */
export function sleepIntervalsOverlapIso(
  a: { start_at: string; end_at: string },
  b: { start_at: string; end_at: string },
): boolean {
  const a0 = new Date(a.start_at).getTime()
  const a1 = new Date(a.end_at).getTime()
  const b0 = new Date(b.start_at).getTime()
  const b1 = new Date(b.end_at).getTime()
  if (![a0, a1, b0, b1].every(Number.isFinite)) return false
  return a0 < b1 && a1 > b0
}

export function mergeSleepRecordSegments(rows: PhoneHealthSleepRecordRow[]): MergedPhoneHealthSleepSession[] {
  const usable = rows.filter((r) => {
    const st = (r.stage ?? '').toLowerCase()
    return st !== 'awake' && st !== 'inbed'
  })
  if (!usable.length) return []

  const sorted = [...usable].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )

  const merged: MergedPhoneHealthSleepSession[] = []
  let curStart = sorted[0].start_at
  let curEnd = sorted[0].end_at

  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i]
    const gap = new Date(r.start_at).getTime() - new Date(curEnd).getTime()
    if (gap <= MERGE_GAP_MS) {
      if (new Date(r.end_at).getTime() > new Date(curEnd).getTime()) {
        curEnd = r.end_at
      }
    } else {
      merged.push({ start_at: curStart, end_at: curEnd })
      curStart = r.start_at
      curEnd = r.end_at
    }
  }
  merged.push({ start_at: curStart, end_at: curEnd })

  return merged.filter(
    (s) => new Date(s.end_at).getTime() - new Date(s.start_at).getTime() >= MIN_SESSION_MS,
  )
}

export async function fetchMergedPhoneHealthSleepSessionsOverlapping(
  supabase: SupabaseClient,
  userId: string,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<MergedPhoneHealthSleepSession[]> {
  const { data, error } = await supabase
    .from('sleep_records')
    .select('start_at, end_at, stage')
    .eq('user_id', userId)
    .in('source', [...PHONE_HEALTH_SLEEP_SOURCES])
    .lte('start_at', rangeEndIso)
    .gte('end_at', rangeStartIso)
    .order('start_at', { ascending: true })

  if (error || !data?.length) return []
  return mergeSleepRecordSegments(data as PhoneHealthSleepRecordRow[])
}

export type SyntheticLastNight = {
  start_at: string
  end_at: string
  quality: null
  created_at: string
}

export async function loadPhoneHealthSleepForSummary(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string,
  now: Date,
): Promise<{
  lastNight: SyntheticLastNight | null
  minutesByShiftedDay: Map<string, number>
}> {
  const nowIso = now.toISOString()
  const sessions = await fetchMergedPhoneHealthSleepSessionsOverlapping(supabase, userId, sinceIso, nowIso)

  if (!sessions.length) {
    return { lastNight: null, minutesByShiftedDay: new Map() }
  }

  const nowMs = now.getTime()
  const minutesByShiftedDay = new Map<string, number>()

  for (const s of sessions) {
    const endMs = new Date(s.end_at).getTime()
    if (endMs > nowMs) continue
    const key = getShiftedDayKey(s.end_at)
    const mins = minutesBetween(s.start_at, s.end_at)
    if (mins <= 0) continue
    minutesByShiftedDay.set(key, (minutesByShiftedDay.get(key) ?? 0) + mins)
  }

  const completed = sessions.filter((s) => new Date(s.end_at).getTime() <= nowMs)
  completed.sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())
  const pick = completed[0]
  if (!pick) {
    return { lastNight: null, minutesByShiftedDay }
  }

  const lastNight: SyntheticLastNight = {
    start_at: pick.start_at,
    end_at: pick.end_at,
    quality: null,
    created_at: pick.end_at,
  }

  return { lastNight, minutesByShiftedDay }
}
