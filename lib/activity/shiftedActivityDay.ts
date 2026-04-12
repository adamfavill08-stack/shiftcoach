import { getShiftedDayKey, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

/**
 * Activity intelligence uses the same anchored day as sleep summaries when the client passes `tz`:
 * local civil day rolls over at `ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR` (default 07:00).
 */
export const ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR = 7

export function activityDayKeyFromTimestamp(instant: string | Date, timeZone: string): string {
  return getShiftedDayKey(instant, ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR, timeZone)
}

/**
 * Map a Health logical civil date (YYYY-MM-DD in the user's zone) to the 7am-anchored activity day key.
 * Uses local noon on that civil date in `timeZone` so the bucket matches shifted sleep-style "days".
 */
export function activityDayKeyFromCivilActivityDate(civilYmd: string, timeZone: string): string {
  const start = startOfLocalDayUtcMs(civilYmd, timeZone)
  if (!Number.isFinite(start)) {
    return getShiftedDayKey(`${civilYmd}T12:00:00.000Z`, ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR, timeZone)
  }
  const noonMs = start + 12 * 3600000
  return getShiftedDayKey(new Date(noonMs), ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR, timeZone)
}
