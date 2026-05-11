/**
 * Wall-clock shift shapes for sleep planning (IANA zone).
 * Time-of-day is primary; labels only disambiguate where needed.
 */

/** Minimal shift interval for classification (compatible with `ShiftInstant`). */
export type WallShiftInstant = { label: string; date: string; startMs: number; endMs: number }

const MS_MIN = 60_000
const MS_H = 60 * MS_MIN
const DAY_MIN = 24 * 60

export type ShiftWallShape = 'night_like' | 'early' | 'day' | 'late' | 'other_work'

export type SleepPlanTransition =
  | 'dayish_work_to_night'
  | 'off_to_night'
  | 'early_to_night'
  | 'late_to_early'
  | 'night_to_night'
  | 'night_to_off'
  | 'night_to_day'
  | 'no_next_shift'
  | 'other'

/** Minutes from local midnight [0, 1440) for instant `ms` in `timeZone`. */
export function localMinutesFromMidnight(ms: number, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date(ms))
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? 'NaN', 10)
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? 'NaN', 10)
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      const d = new Date(ms)
      return d.getHours() * 60 + d.getMinutes()
    }
    return ((h * 60 + m) % DAY_MIN + DAY_MIN) % DAY_MIN
  } catch {
    const d = new Date(ms)
    return d.getHours() * 60 + d.getMinutes()
  }
}

/** Calendar YYYY-MM-DD for instant in zone. */
export function isoDateInTimeZone(ms: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toISOString().slice(0, 10)
  }
}

/** True if local civil date at `endMs` is after local date at `startMs`, or block spans backward in same-day clock. */
export function crossesLocalMidnight(startMs: number, endMs: number, timeZone: string): boolean {
  const d0 = isoDateInTimeZone(startMs, timeZone)
  const d1 = isoDateInTimeZone(endMs, timeZone)
  if (d0 !== d1) return true
  const sm0 = localMinutesFromMidnight(startMs, timeZone)
  const sm1 = localMinutesFromMidnight(endMs, timeZone)
  return sm1 < sm0
}

const NIGHT_LABEL = /NIGHT/i

/** Night-like: evening start, very early start, crosses local midnight, or explicit NIGHT label. */
export function isNightLikeInstant(instant: WallShiftInstant, timeZone: string): boolean {
  if (NIGHT_LABEL.test(instant.label ?? '')) return true
  if (crossesLocalMidnight(instant.startMs, instant.endMs, timeZone)) return true
  const sm = localMinutesFromMidnight(instant.startMs, timeZone)
  return sm >= 17 * 60 || sm <= 3 * 60
}

/** Early: local start in [04:00, 08:00). */
export function isEarlyStartInstant(instant: WallShiftInstant, timeZone: string): boolean {
  if (isNightLikeInstant(instant, timeZone)) return false
  const sm = localMinutesFromMidnight(instant.startMs, timeZone)
  return sm >= 4 * 60 && sm < 8 * 60
}

/** Day: local start in [08:00, 15:00). */
export function isDayStartInstant(instant: WallShiftInstant, timeZone: string): boolean {
  if (isNightLikeInstant(instant, timeZone)) return false
  const sm = localMinutesFromMidnight(instant.startMs, timeZone)
  return sm >= 8 * 60 && sm < 15 * 60
}

/** Late: local start in [15:00, 17:00) — before evening night-like band at 17:00. */
export function isLateStartInstant(instant: WallShiftInstant, timeZone: string): boolean {
  if (isNightLikeInstant(instant, timeZone)) return false
  const sm = localMinutesFromMidnight(instant.startMs, timeZone)
  return sm >= 15 * 60 && sm < 17 * 60
}

export function classifyShiftWallShape(instant: WallShiftInstant, timeZone: string): ShiftWallShape {
  if (isNightLikeInstant(instant, timeZone)) return 'night_like'
  if (isEarlyStartInstant(instant, timeZone)) return 'early'
  if (isDayStartInstant(instant, timeZone)) return 'day'
  if (isLateStartInstant(instant, timeZone)) return 'late'
  return 'other_work'
}

export function isOffLabel(label: string | null | undefined): boolean {
  return /\bOFF\b/i.test(label ?? '') || (label ?? '').toUpperCase().trim() === 'OFF'
}

/**
 * Classify anchor → next transition. `anchor` is the prior work/rest instant; `offAnchorSynthetic`
 * marks implicit rest-day anchor when there was no work row before sleep.
 */
export function classifySleepPlanTransition(input: {
  anchor: WallShiftInstant
  next: WallShiftInstant | null
  timeZone: string
  offAnchorSynthetic: boolean
}): SleepPlanTransition {
  const { anchor, next, timeZone, offAnchorSynthetic } = input

  if (!next) {
    if (isNightLikeInstant(anchor, timeZone)) return 'night_to_off'
    return 'no_next_shift'
  }

  /** Synthetic rest anchor times can fall in the evening clock band — still treat as off-to-night, not night-to-night. */
  if (offAnchorSynthetic) {
    return isNightLikeInstant(next, timeZone) ? 'off_to_night' : 'other'
  }

  const aNight = isNightLikeInstant(anchor, timeZone)
  const nNight = isNightLikeInstant(next, timeZone)

  if (aNight && nNight) return 'night_to_night'
  if (aNight && !nNight) return 'night_to_day'

  if (isLateStartInstant(anchor, timeZone) && isEarlyStartInstant(next, timeZone)) return 'late_to_early'

  if (!aNight && nNight) {
    if (isEarlyStartInstant(anchor, timeZone)) return 'early_to_night'
    return 'dayish_work_to_night'
  }

  return 'other'
}

/** Gap from anchor end to main sleep start (ms). */
export function gapMsAnchorEndToSleepStart(anchor: WallShiftInstant, sleepStartMs: number): number {
  return Math.max(0, sleepStartMs - anchor.endMs)
}

export const LONG_REST_GAP_BEFORE_SLEEP_MS = 12 * MS_H
export const OPEN_RECOVERY_MAX_MS = 10 * 60 * 60 * 1000
export const TIGHT_TURNAROUND_MS = 16 * MS_H

/** Local main-bed floor after dayish work before a night block (minutes from midnight). */
export const EVENING_MAIN_BED_FLOOR_MINUTES_DEFAULT = 21 * 60 + 30
export const EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED = 22 * 60
/** If shift end → night start is at least this long, use the preferred (later) evening floor when feasible. */
export const SHIFT_END_TO_NIGHT_START_FOR_PREFERRED_FLOOR_MS = 18 * MS_H
/** Same local calendar day day-shift → night: treat recovery as tight. */
export const TIGHT_SAME_LOCAL_DAY_DAY_TO_NIGHT_MS = 14 * MS_H

/**
 * Find UTC instant where local civil date is `ymd` and local clock equals `wallMinutesFromMidnight` (0–1439).
 * Scans ±40h around `searchCenterUtcMs` in 1-minute steps (IANA-safe; avoids hard-coded UTC offsets).
 */
export function utcMsAtLocalWallOnDate(
  ymd: string,
  wallMinutesFromMidnight: number,
  timeZone: string,
  searchCenterUtcMs: number,
): number | null {
  const want = ((Math.round(wallMinutesFromMidnight) % DAY_MIN) + DAY_MIN) % DAY_MIN
  const lo = searchCenterUtcMs - 40 * MS_H
  const hi = searchCenterUtcMs + 40 * MS_H
  for (let t = lo; t <= hi; t += MS_MIN) {
    if (isoDateInTimeZone(t, timeZone) === ymd && localMinutesFromMidnight(t, timeZone) === want) {
      return t
    }
  }
  return null
}

/** Local civil date string (YYYY-MM-DD) used for the “evening before night” bed floor. */
export function eveningBedFloorYmd(shiftEndMs: number, nextNightStartMs: number, timeZone: string): string {
  const dEnd = isoDateInTimeZone(shiftEndMs, timeZone)
  const dNight = isoDateInTimeZone(nextNightStartMs, timeZone)
  if (dEnd < dNight) return dEnd
  return dEnd
}
