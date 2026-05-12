import type { SupabaseClient } from '@supabase/supabase-js'
import { getShiftedDayKey, minutesBetween, rowCountsAsPrimarySleep } from '@/lib/sleep/utils'

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

/** Prefer canonical `start_at`/`end_at` when the same row appears from new + legacy queries. */
function mergeNewAndLegacySleepLogRows(newRows: any[], legacyRows: any[]): any[] {
  const by = new Map<string, any>()
  for (const r of [...newRows, ...legacyRows]) {
    const id = r?.id != null ? `id:${String(r.id)}` : null
    const start = r.start_at ?? r.start_ts
    const end = r.end_at ?? r.end_ts
    const key = id ?? `t:${String(start)}|${String(end)}`
    const prev = by.get(key)
    if (!prev) {
      by.set(key, r)
      continue
    }
    const prevHas = prev.start_at && prev.end_at
    const rHas = r.start_at && r.end_at
    if (!prevHas && rHas) by.set(key, r)
  }
  return [...by.values()]
}

/**
 * `sleep_logs` intersecting [rangeStartIso, rangeEndIso] in SQL, merged from:
 * - new schema (`start_at` / `end_at`), and
 * - legacy rows that only have `start_ts` / `end_ts` (older manual / app inserts).
 *
 * Phone-health `sleep_records` are **not** included here — merge those separately (e.g. 24h-grouped, heart gap).
 */
function sleepLogsDeletedFilterBroken(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined
  return !!e &&
    (e.code === 'PGRST204' ||
      e.code === '42703' ||
      (e.message ?? '').toLowerCase().includes('deleted_at') ||
      (e.message ?? '').includes('does not exist'))
}

function sleepLogsColumnBroken(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined
  return !!e &&
    ((e.message ?? '').includes('column') || e.code === 'PGRST204' || e.code === '42703')
}

export async function fetchSleepLogsOverlappingRangeMerged(
  supabase: SupabaseClient,
  userId: string,
  rangeStartIso: string,
  rangeEndIso: string,
  options?: { limit?: number; slimColumns?: boolean },
): Promise<any[]> {
  const limit = options?.limit ?? 400
  const fullSelect = options?.slimColumns
    ? 'id, start_at, end_at, start_ts, end_ts, type, naps'
    : 'id, start_at, end_at, start_ts, end_ts, type, quality, notes, source, created_at, naps'
  const slimNew = options?.slimColumns
    ? 'id, start_at, end_at, type, naps'
    : 'id, start_at, end_at, type, quality, notes, source, created_at'
  const slimLeg = options?.slimColumns
    ? 'id, start_ts, end_ts, type, naps'
    : 'id, start_ts, end_ts, type, quality, notes, source, created_at'

  async function fetchNewSchema(withDeletedNull: boolean, columns: string) {
    let q = supabase
      .from('sleep_logs')
      .select(columns)
      .eq('user_id', userId)
      .not('start_at', 'is', null)
      .not('end_at', 'is', null)
      .gte('end_at', rangeStartIso)
      .lte('start_at', rangeEndIso)
      .order('start_at', { ascending: false })
      .limit(limit)
    if (withDeletedNull) q = q.is('deleted_at', null)
    return q
  }

  async function fetchLegacyTs(withDeletedNull: boolean, columns: string) {
    let q = supabase
      .from('sleep_logs')
      .select(columns)
      .eq('user_id', userId)
      .not('start_ts', 'is', null)
      .not('end_ts', 'is', null)
      .gte('end_ts', rangeStartIso)
      .lte('start_ts', rangeEndIso)
      .order('start_ts', { ascending: false })
      .limit(limit)
    if (withDeletedNull) q = q.is('deleted_at', null)
    return q
  }

  async function resolveNewRows(): Promise<any[]> {
    let r = await fetchNewSchema(true, fullSelect)
    let newRows = (r.data as any[]) ?? []
    let error = r.error

    if (sleepLogsDeletedFilterBroken(error)) {
      r = await fetchNewSchema(false, fullSelect)
      newRows = (r.data as any[]) ?? []
      error = r.error
    }

    if (sleepLogsColumnBroken(error)) {
      const r3 = await fetchNewSchema(false, slimNew)
      newRows = (r3.data as any[]) ?? []
      error = r3.error
    }

    if (error) {
      console.warn('[fetchSleepLogsOverlappingRangeMerged] new-schema sleep_logs:', error.message)
      return []
    }
    return newRows
  }

  async function resolveLegacyRows(): Promise<any[]> {
    try {
      let lr = await fetchLegacyTs(true, fullSelect)
      let legacyRows = (lr.data as any[]) ?? []
      let lerr = lr.error

      if (sleepLogsDeletedFilterBroken(lerr)) {
        lr = await fetchLegacyTs(false, fullSelect)
        legacyRows = (lr.data as any[]) ?? []
        lerr = lr.error
      }

      if (sleepLogsColumnBroken(lerr)) {
        lr = await fetchLegacyTs(false, slimLeg)
        legacyRows = (lr.data as any[]) ?? []
        lerr = lr.error
      }

      if (lerr) return []
      return legacyRows
    } catch {
      return []
    }
  }

  const [newRows, legacyRows] = await Promise.all([resolveNewRows(), resolveLegacyRows()])
  return mergeNewAndLegacySleepLogRows(newRows, legacyRows)
}

function sessionOverlapsWallWindow(
  startIso: string,
  endIso: string,
  winStart: Date,
  winEnd: Date,
): boolean {
  const a = new Date(startIso).getTime()
  const b = new Date(endIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return b >= winStart.getTime() && a <= winEnd.getTime()
}

function normalizeSleepLogRow(row: Record<string, unknown>) {
  const start_at = row.start_at ?? row.start_ts ?? null
  const end_at = row.end_at ?? row.end_ts ?? null
  return { ...row, start_at, end_at }
}

/**
 * Intervals for overlap math (e.g. between-shift recovery): same combine rules as
 * GET `/api/sleep/24h-grouped` — all `sleep_logs` in the wall-time window plus merged
 * phone-health `sleep_records` that do not overlap a primary log.
 */
export async function fetchCombinedSleepOverlapRowsForWindow(
  supabase: SupabaseClient,
  userId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<PhoneHealthSleepRecordRow[]> {
  const sqlLower = new Date(windowStart)
  sqlLower.setUTCDate(sqlLower.getUTCDate() - 2)
  const sqlUpper = new Date(windowEnd)
  sqlUpper.setUTCDate(sqlUpper.getUTCDate() + 2)

  const [rows, mergedHc] = await Promise.all([
    fetchSleepLogsOverlappingRangeMerged(
      supabase,
      userId,
      sqlLower.toISOString(),
      sqlUpper.toISOString(),
      { limit: 400, slimColumns: true },
    ),
    fetchMergedPhoneHealthSleepSessionsOverlapping(
      supabase,
      userId,
      sqlLower.toISOString(),
      sqlUpper.toISOString(),
    ),
  ])

  const normalized = rows.map((x) => normalizeSleepLogRow(x as Record<string, unknown>))
  const overlappingLogs = normalized.filter(
    (s: any) =>
      typeof s.start_at === 'string' &&
      typeof s.end_at === 'string' &&
      sessionOverlapsWallWindow(s.start_at, s.end_at, windowStart, windowEnd),
  ) as { start_at: string; end_at: string; type?: string | null; naps?: number | null }[]

  const primaryOverlapping = overlappingLogs.filter((s) =>
    rowCountsAsPrimarySleep({ type: s.type, naps: s.naps }),
  )

  const hcExtra = mergedHc
    .filter((m) => sessionOverlapsWallWindow(m.start_at, m.end_at, windowStart, windowEnd))
    .filter(
      (m) =>
        !primaryOverlapping.some((p) =>
          sleepIntervalsOverlapIso(
            { start_at: p.start_at, end_at: p.end_at },
            { start_at: m.start_at, end_at: m.end_at },
          ),
        ),
    )

  const out: PhoneHealthSleepRecordRow[] = []
  for (const s of overlappingLogs) {
    out.push({ start_at: s.start_at as string, end_at: s.end_at as string, stage: 'asleep' })
  }
  for (const m of hcExtra) {
    out.push({ start_at: m.start_at, end_at: m.end_at, stage: null })
  }
  return out
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
