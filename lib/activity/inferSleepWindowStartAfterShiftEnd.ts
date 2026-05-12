import { addCalendarDaysToYmd, formatYmdInTimeZone, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

export type ActivityShiftTypeForSleepHeuristic = 'day' | 'night' | 'late' | 'off' | 'other'

function localClockMinutesFromUtcMs(utcMs: number, timeZone: string): number | null {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date(utcMs))
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '', 10)
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '', 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/** First UTC instant on civil `ymd` in `timeZone` where local clock equals `clockMinutes` (0–1439). */
function utcMsForLocalClockOnCivilDay(ymd: string, clockMinutes: number, timeZone: string): number | null {
  const hour = Math.floor(clockMinutes / 60) % 24
  const minute = clockMinutes % 60
  const day0 = startOfLocalDayUtcMs(ymd, timeZone)
  if (!Number.isFinite(day0)) return null
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  for (let t = day0; t < day0 + 24 * 3600000; t += 60000) {
    const parts = fmt.formatToParts(new Date(t))
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? 'NaN', 10)
    const mm = parseInt(parts.find((p) => p.type === 'minute')?.value ?? 'NaN', 10)
    if (h === hour && mm === minute) return t
  }
  return null
}

function medianMinutes(values: number[]): number | null {
  if (values.length < 2) return null
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2)
}

/**
 * Next local wall-clock occurrence of `clockMinutes` (minutes from midnight) strictly after `anchorMs`.
 */
export function nextLocalClockInstantAfterUtcMs(
  anchorMs: number,
  clockMinutes: number,
  timeZone: string,
): Date | null {
  const anchorYmd = formatYmdInTimeZone(new Date(anchorMs), timeZone)
  for (let d = 0; d < 21; d += 1) {
    const ymd = addCalendarDaysToYmd(anchorYmd, d)
    const instant = utcMsForLocalClockOnCivilDay(ymd, clockMinutes, timeZone)
    if (instant != null && instant > anchorMs) {
      return new Date(instant)
    }
  }
  return null
}

/**
 * Estimates when the user’s **main sleep window starts** after the current roster shift ends, so
 * “after shift” movement can stop at bedtime instead of running to the end of the fetch clip.
 *
 * - With ≥2 recent primary sleeps: median **local** main-sleep start clock (minutes from midnight).
 * - Otherwise: same heuristics as `lib/engine` day vs night (`night` → 08:30, else 23:00) in `timeZone`.
 */
export function inferSleepWindowStartAfterShiftEnd(opts: {
  shiftEnd: Date | null
  timeZone: string
  shiftType: ActivityShiftTypeForSleepHeuristic
  mainSleepStarts: Date[]
}): Date | null {
  const endMs = opts.shiftEnd?.getTime()
  if (opts.shiftEnd == null || typeof endMs !== 'number' || !Number.isFinite(endMs)) return null

  const mins: number[] = []
  for (const d of opts.mainSleepStarts) {
    const m = localClockMinutesFromUtcMs(d.getTime(), opts.timeZone)
    if (m != null) mins.push(m)
  }

  const clockMinutesMedian = medianMinutes(mins)
  const clockResolved =
    clockMinutesMedian ?? (opts.shiftType === 'night' ? 8 * 60 + 30 : 23 * 60)

  const candidate = nextLocalClockInstantAfterUtcMs(endMs, clockResolved, opts.timeZone)
  if (!candidate) return null
  if (candidate.getTime() <= endMs) return null
  return candidate
}
