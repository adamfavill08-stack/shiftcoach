import {
  addCalendarDaysToYmd,
  formatYmdInTimeZone,
  getShiftedDayKey,
  startOfLocalDayUtcMs,
} from '@/lib/sleep/utils'

/** Shift-worker friendly “day” for hydration: rolls at 05:00 local (not midnight). */
export const HYDRATION_ROLLOVER_HOUR = 5

export function hydrationDayKeyFromTimestamp(instant: string | Date, timeZone: string): string {
  return getShiftedDayKey(instant, HYDRATION_ROLLOVER_HOUR, timeZone)
}

function getLocalHourMinute(d: Date, timeZone: string): { hour: number; minute: number } {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(d)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
    return {
      hour: Number.isFinite(hour) ? hour : 0,
      minute: Number.isFinite(minute) ? minute : 0,
    }
  } catch {
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes() }
  }
}

/**
 * UTC instant of local 05:00 on civil `dayKeyYmd` in `timeZone` (first match after local midnight).
 */
export function startOfHydrationDayUtcMsForKey(dayKeyYmd: string, timeZone: string): number {
  const midnight = startOfLocalDayUtcMs(dayKeyYmd, timeZone)
  if (!Number.isFinite(midnight)) return NaN
  const nextMid = startOfLocalDayUtcMs(addCalendarDaysToYmd(dayKeyYmd, 1), timeZone)
  const lim = Number.isFinite(nextMid) ? nextMid + 2 * 3600000 : midnight + 30 * 3600000

  for (let t = midnight - 3600000; t < lim; t += 5 * 60000) {
    if (formatYmdInTimeZone(new Date(t), timeZone) !== dayKeyYmd) continue
    const { hour, minute } = getLocalHourMinute(new Date(t), timeZone)
    if (hour === HYDRATION_ROLLOVER_HOUR && minute < 5) {
      return t
    }
  }
  return midnight + HYDRATION_ROLLOVER_HOUR * 3600000
}

/** Half-open window [start, end) for the hydration “day” that contains `now`. */
export function getHydrationDayWindow(now: Date, timeZone: string): { start: Date; end: Date; dayKey: string } {
  const dayKey = hydrationDayKeyFromTimestamp(now, timeZone)
  const startMs = startOfHydrationDayUtcMsForKey(dayKey, timeZone)
  const nextKey = addCalendarDaysToYmd(dayKey, 1)
  const endMs = startOfHydrationDayUtcMsForKey(nextKey, timeZone)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    const fallback = new Date(now)
    fallback.setUTCHours(0, 0, 0, 0)
    const end = new Date(fallback)
    end.setUTCDate(end.getUTCDate() + 1)
    return { start: fallback, end, dayKey: formatYmdInTimeZone(now, timeZone) }
  }
  return { start: new Date(startMs), end: new Date(endMs), dayKey }
}
