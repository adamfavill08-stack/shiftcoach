import { endOfLocalDayUtcMs, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

/** Minimal `shifts` row shape used by `/api/activity/today` for roster + window. */
export type ActivityTodayShiftRow = {
  label: string | null
  date: string | null
  start_ts: string | null
  end_ts: string | null
}

/**
 * True when the rota label represents scheduled work (not off / leave stored in label).
 * `shifts.status` is not selected on this path; OFF-like roster is expected on `label`.
 */
export function isWorkRosterLabel(label: string | null): boolean {
  if (label == null || typeof label !== 'string') return false
  const u = label.trim().toUpperCase()
  if (u === '' || u === 'OFF') return false
  if (u === 'ANNUAL_LEAVE' || u === 'SICK') return false
  return true
}

/**
 * Pick one shift from rows that overlap the buffered “now” window (same rules as the API query).
 *
 * Rule:
 * 1. Prefer rows whose interval **contains** `now` (start ≤ now ≤ end). If several, pick **latest** `start_ts`.
 * 2. Otherwise use rows that only overlap the buffer (travel / post-shift). Pick **latest** `start_ts`.
 */
export function pickCurrentShiftFromOverlapRows(
  rows: readonly ActivityTodayShiftRow[],
  now: Date,
  bufferMs: number,
): ActivityTodayShiftRow | null {
  const nowMs = now.getTime()
  const after = nowMs + bufferMs
  const before = nowMs - bufferMs

  const candidates: { row: ActivityTodayShiftRow; startMs: number; endMs: number }[] = []
  for (const row of rows) {
    if (!row.start_ts || !row.end_ts) continue
    const startMs = new Date(row.start_ts).getTime()
    const endMs = new Date(row.end_ts).getTime()
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue
    if (startMs <= after && endMs > before) {
      candidates.push({ row, startMs, endMs })
    }
  }
  if (!candidates.length) return null

  const contains = candidates.filter((c) => c.startMs <= nowMs && nowMs <= c.endMs)
  const pool = contains.length ? contains : candidates
  pool.sort((a, b) => b.startMs - a.startMs)
  return pool[0]!.row
}

/** Full civil `localTodayYmd` in `timeZone` as [start, end] UTC ISO instants. */
export function syntheticCivilDayShiftBounds(
  localTodayYmd: string,
  timeZone: string,
): { start_ts: string; end_ts: string } {
  const startMs = startOfLocalDayUtcMs(localTodayYmd, timeZone)
  const endMs = endOfLocalDayUtcMs(localTodayYmd, timeZone)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    const d = `${localTodayYmd}T00:00:00.000Z`
    return { start_ts: d, end_ts: d }
  }
  return {
    start_ts: new Date(startMs).toISOString(),
    end_ts: new Date(endMs).toISOString(),
  }
}

/**
 * When roster says work but `start_ts`/`end_ts` are missing, use civil local day bounds
 * so activity windows and the client still get finite shift instants.
 */
export function applyCurrentShiftFallbackBounds(
  shift: ActivityTodayShiftRow,
  localTodayYmd: string,
  timeZone: string,
): ActivityTodayShiftRow {
  if (shift.start_ts && shift.end_ts) return shift
  if (!isWorkRosterLabel(shift.label)) return shift
  const syn = syntheticCivilDayShiftBounds(localTodayYmd, timeZone)
  return {
    ...shift,
    start_ts: shift.start_ts ?? syn.start_ts,
    end_ts: shift.end_ts ?? syn.end_ts,
  }
}
