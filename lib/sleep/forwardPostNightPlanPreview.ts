import { estimateShiftRowBounds, type ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { isNightLikeInstant } from '@/lib/sleep/sleepShiftWallClock'
import { rowCountsAsPrimarySleep } from '@/lib/sleep/utils'

const MAX_COMMUTE_MIN = 45
const WIND_DOWN_MIN = 30
const MIN_MAIN_SLEEP_MIN = 240

export type SleepSessionLike = {
  start_at: string
  end_at: string
  type: string
}

/**
 * When the roster shows a night shift on `scopeYmd` that has not ended yet and the user has not
 * logged main sleep after that duty, synthesize a future main-sleep interval so `pickPrimarySleep`
 * picks it over older logs — the planner then anchors post-night recovery to **this** night’s end
 * and profile `post_night_sleep` (e.g. Tue ~08:00 after Mon night → Tue morning).
 */
export function buildForwardPostNightPreviewSession(params: {
  scopeYmd: string
  shifts: ShiftRowInput[]
  timeZone: string
  nowMs: number
  commuteMinutes: number
  targetSleepMinutes: number
  /** True when the rota label for `scopeYmd` is a night-type duty. */
  rosterNightOnScope: boolean
  /** Sessions already mapped for `resolveRotaContextForSleepPlan` (same shape as API). */
  existingSessionLikes: SleepSessionLike[]
}): SleepSessionLike | null {
  const {
    scopeYmd,
    shifts,
    timeZone,
    nowMs,
    commuteMinutes,
    targetSleepMinutes,
    rosterNightOnScope,
    existingSessionLikes,
  } = params
  if (!rosterNightOnScope || !shifts?.length) return null

  const row = shifts.find((r) => String(r?.date ?? '').slice(0, 10) === scopeYmd)
  if (!row?.date) return null

  const { start, end } = estimateShiftRowBounds(row, new Date(), timeZone)
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null

  const instant = {
    label: String(row.label ?? 'NIGHT'),
    date: row.date,
    startMs,
    endMs,
  }
  if (!isNightLikeInstant(instant, timeZone)) return null

  if (endMs <= nowMs) return null

  for (const s of existingSessionLikes) {
    if (!rowCountsAsPrimarySleep({ type: s.type, naps: (s as { naps?: number | null }).naps })) continue
    const e = Date.parse(s.end_at)
    if (Number.isFinite(e) && e > endMs) return null
  }

  const c = Math.min(MAX_COMMUTE_MIN, Math.max(0, Math.round(commuteMinutes)))
  const homeWindMs = endMs + c * 60 * 1000 + WIND_DOWN_MIN * 60 * 1000
  const synStart = homeWindMs + 1
  const durMin = Math.max(MIN_MAIN_SLEEP_MIN, Math.round(targetSleepMinutes))
  const synEnd = synStart + durMin * 60 * 1000

  return {
    start_at: new Date(synStart).toISOString(),
    end_at: new Date(synEnd).toISOString(),
    type: 'main_sleep',
  }
}
