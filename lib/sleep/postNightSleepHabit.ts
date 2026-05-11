import {
  isoDateInTimeZone,
  isNightLikeInstant,
  utcMsAtLocalWallOnDate,
  type WallShiftInstant,
} from '@/lib/sleep/sleepShiftWallClock'
import { addCalendarDaysToYmd, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

const MS_MIN = 60_000

/** Normalise API/DB values (string, Postgres-style object, etc.) to "HH:mm" or "HH:mm:ss". */
export function coercePostNightSleepString(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const s = raw.trim()
    return s || null
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>
    const h = o.hours ?? o.hour
    const m = o.minutes ?? o.minute
    if (typeof h === 'number' && typeof m === 'number' && Number.isFinite(h) && Number.isFinite(m)) {
      const hh = Math.max(0, Math.min(47, Math.floor(h)))
      const mm = Math.max(0, Math.min(59, Math.floor(m)))
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    }
  }
  return null
}

/** Parse DB time / "HH:mm" / "HH:mm:ss" to minutes from midnight [0, 1440). */
export function parsePostNightSleepToWallMinutes(raw: string | null | undefined | unknown): number | null {
  const coerced =
    raw == null ? null : typeof raw === 'string' ? raw.trim() || null : coercePostNightSleepString(raw)
  if (coerced == null) return null
  const s = coerced.trim()
  if (!s) return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 47 || min < 0 || min > 59) {
    return null
  }
  return h * 60 + min
}

const MS_H = 60 * MS_MIN

/**
 * First UTC instant after `shiftEndMs` where local civil time matches `post_night_sleep` wall minutes
 * (onboarding: "usually asleep by" after a night shift). Uses the local civil day of shift end first,
 * then later days. Rejects matches more than 18h after shift end (e.g. preferred clock before end
 * would otherwise jump to the next calendar morning).
 */
export function resolvePostNightAsleepByUtcMs(
  shiftEndMs: number,
  postNightSleepRaw: string | null | undefined,
  timeZone: string,
): number | null {
  const wallMin = parsePostNightSleepToWallMinutes(postNightSleepRaw)
  if (wallMin == null) return null
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const endYmd = isoDateInTimeZone(shiftEndMs, tz)
  const maxAfter = 18 * MS_H
  let best: number | null = null
  for (let d = 0; d <= 3; d++) {
    const ymd = addCalendarDaysToYmd(endYmd, d)
    const t = utcMsAtLocalWallOnDate(ymd, wallMin, tz, shiftEndMs)
    if (t == null || t <= shiftEndMs + 2 * MS_MIN) continue
    if (t - shiftEndMs > maxAfter) continue
    if (best == null || t < best) best = t
  }
  return best
}

/**
 * Onboarding post–night-shift clock time on the **local civil day after** the sleep plan scope day
 * (the “Your plan” tab’s `today` / `chartHighlightYmd`). Used as the suggested main-sleep **start**.
 */
export function postNightStartDayAfterScopeUtcMs(
  sleepPlanScopeYmd: string,
  postNightSleepRaw: string | null | undefined | unknown,
  timeZone: string,
): number | null {
  const wallMin = parsePostNightSleepToWallMinutes(postNightSleepRaw)
  if (wallMin == null) return null
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const ymd = addCalendarDaysToYmd(String(sleepPlanScopeYmd).slice(0, 10), 1)
  const dayStart = startOfLocalDayUtcMs(ymd, tz)
  if (!Number.isFinite(dayStart)) return null
  const centerMs = dayStart + 12 * 60 * MS_MIN
  return utcMsAtLocalWallOnDate(ymd, wallMin, tz, centerMs)
}

/**
 * Same hierarchy as `ShiftWorkerSleepPage` / sleep plan payload:
 * - **Real night anchor** (night-like, not synthetic rest): only
 *   `resolvePostNightAsleepByUtcMs(shiftJustEnded.endMs, …)`. If that is `null`, return **`null`**
 *   — do **not** use `postNightStartDayAfterScopeUtcMs` (scope +1 civil day can be wrong).
 * - **Otherwise** (off / synthetic / non-night): `postNightStartDayAfterScopeUtcMs` when profile
 *   parses.
 */
export function resolvePostNightPreferredStartForSleepPlan(input: {
  shiftJustEnded: WallShiftInstant
  restAnchorSynthetic: boolean
  chartHighlightYmd: string
  postNightSleepRaw: string | null | undefined
  timeZone: string
}): number | null {
  const tz = (input.timeZone ?? 'UTC').trim() || 'UTC'
  const nightAnchorForProfile =
    isNightLikeInstant(input.shiftJustEnded, tz) && !input.restAnchorSynthetic
  if (nightAnchorForProfile) {
    return resolvePostNightAsleepByUtcMs(
      input.shiftJustEnded.endMs,
      input.postNightSleepRaw,
      tz,
    )
  }
  return postNightStartDayAfterScopeUtcMs(
    input.chartHighlightYmd,
    input.postNightSleepRaw,
    tz,
  )
}
