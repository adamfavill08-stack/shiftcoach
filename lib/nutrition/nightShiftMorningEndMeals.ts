/**
 * Night shifts that end in the early morning: worker typically sleeps immediately,
 * so post-shift meals must not sit in the first hours of “off” time.
 */
const MS_H = 60 * 60 * 1000

/** Local wall-clock shift end between 05:00 and 10:00 inclusive. */
export function isMorningNightShiftEndLocal(shiftEnd: Date): boolean {
  const totalMinutes = shiftEnd.getHours() * 60 + shiftEnd.getMinutes()
  return totalMinutes >= 5 * 60 && totalMinutes <= 10 * 60
}

/** Min hours after shift end for a logged wake to count as “this sleep bout”. */
const MIN_LOGGED_SLEEP_H = 3
const MAX_LOGGED_SLEEP_H = 16

export function pickLoggedWakeAfterMorningShiftEnd(
  shiftEnd: Date,
  loggedSleepEnd: Date | null | undefined,
): Date | null {
  if (!loggedSleepEnd || Number.isNaN(loggedSleepEnd.getTime())) return null
  const deltaH = (loggedSleepEnd.getTime() - shiftEnd.getTime()) / MS_H
  if (deltaH < MIN_LOGGED_SLEEP_H || deltaH > MAX_LOGGED_SLEEP_H) return null
  if (loggedSleepEnd.getTime() <= shiftEnd.getTime()) return null
  return loggedSleepEnd
}

/** Prefer a rolling average from logs; else profile sleep goal; else 7.5 h. */
export function expectedSleepHoursFromProfileAndLogs(
  sleepGoalH: number | null | undefined,
  recentSleepHours: number[],
): number {
  const valid = recentSleepHours.filter((h) => h >= 4 && h <= 14)
  if (valid.length >= 3) {
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length
    return Math.min(14, Math.max(4, avg))
  }
  if (sleepGoalH != null && Number.isFinite(sleepGoalH)) {
    return Math.min(14, Math.max(4, sleepGoalH))
  }
  return 7.5
}

/** True if `mealTime` falls in the assumed sleep interval (exclusive of wake instant). */
export function mealFallsInExpectedSleepWindow(
  mealTime: Date,
  shiftEnd: Date,
  wakeAt: Date,
): boolean {
  return mealTime.getTime() > shiftEnd.getTime() && mealTime.getTime() < wakeAt.getTime()
}

export const NO_MEAL_MS_AFTER_NIGHT_SHIFT_END = 3 * MS_H
