import { toShiftType } from '@/lib/shifts/toShiftType'
import { addCalendarDaysToYmd, formatYmdInTimeZone, rowCountsAsPrimarySleep } from '@/lib/sleep/utils'

export type SleepPlanSessionLike = {
  id?: string | null
  start_at?: string | null
  end_at?: string | null
  type?: string | null
}

export type SleepPlanCalendarDay<T extends SleepPlanSessionLike> = {
  date: string
  sessions?: T[]
}

export type SleepPlanShiftedDay<T extends SleepPlanSessionLike> = {
  date: string
  sessions: T[]
}

function hasPrimarySleep<T extends SleepPlanSessionLike>(list: T[]): boolean {
  return list.some(
    (s) =>
      !!s?.start_at &&
      !!s?.end_at &&
      rowCountsAsPrimarySleep({ type: s.type }),
  )
}

function dedupeSessions<T extends SleepPlanSessionLike>(lists: T[][]): T[] {
  const byKey = new Map<string, T>()
  for (const list of lists) {
    for (const s of list) {
      if (!s?.start_at || !s?.end_at) continue
      const key =
        s.id != null && String(s.id).trim() !== '' ? String(s.id) : `${s.start_at}|${s.end_at}`
      byKey.set(key, s)
    }
  }
  return [...byKey.values()]
}

function isNightShiftLabel(label: string | null | undefined): boolean {
  return toShiftType(label, null) === 'night' || /\bNIGHT\b/i.test(label ?? '')
}

function canBorrowPriorSleepForPlan(ymd: string, shiftByDate?: Map<string, string>): boolean {
  if (!shiftByDate) return true
  const todayLabel = shiftByDate.get(ymd)
  if (isNightShiftLabel(todayLabel)) return true

  const todayType = toShiftType(todayLabel, null)
  const previousYmd = addCalendarDaysToYmd(ymd, -1)
  const previousLabel = shiftByDate.get(previousYmd)

  return todayType === 'off' && isNightShiftLabel(previousLabel)
}

function sessionTouchesCivilYmd(
  session: SleepPlanSessionLike,
  ymd: string,
  timeZone: string,
): boolean {
  if (!session.start_at || !session.end_at) return false
  const startMs = Date.parse(session.start_at)
  const endMs = Date.parse(session.end_at)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false
  const startYmd = formatYmdInTimeZone(new Date(startMs), timeZone)
  const endYmd = formatYmdInTimeZone(new Date(endMs), timeZone)
  return startYmd <= ymd && endYmd >= ymd
}

function sessionsTouchingCivilYmd<T extends SleepPlanSessionLike>(
  sessions: T[],
  ymd: string,
  timeZone: string,
): T[] {
  return sessions.filter((s) => sessionTouchesCivilYmd(s, ymd, timeZone))
}

/**
 * Pick sleep sessions for the plan's civil day. We only borrow previous-day sleep on true
 * post-night recovery days; otherwise a 4-on-4-off block's second day off can replay yesterday's
 * 08:00 recovery sleep and show a stale date.
 */
export function pickSleepPlanSessionsForCivilYmd<T extends SleepPlanSessionLike>(
  ymd: string,
  sevenDayCalendarDays: Array<SleepPlanCalendarDay<T>>,
  shiftedDays: Array<SleepPlanShiftedDay<T>>,
  options?: { shiftByDate?: Map<string, string>; timeZone?: string },
): T[] {
  const fromWeek = sevenDayCalendarDays.find((d) => d.date === ymd)
  const timeZone = options?.timeZone ?? 'UTC'

  if (sevenDayCalendarDays.length > 0) {
    const todaySess = fromWeek !== undefined ? (fromWeek.sessions ?? []) : []
    if (hasPrimarySleep(todaySess)) return todaySess

    const allWeek = sevenDayCalendarDays.flatMap((d) => d.sessions ?? [])
    const allShifted = shiftedDays.flatMap((d) => d.sessions ?? [])
    const touchingToday = dedupeSessions([
      todaySess,
      sessionsTouchingCivilYmd(allWeek, ymd, timeZone),
      sessionsTouchingCivilYmd(allShifted, ymd, timeZone),
    ])
    if (hasPrimarySleep(touchingToday)) return touchingToday

    if (!canBorrowPriorSleepForPlan(ymd, options?.shiftByDate)) return todaySess

    const y1 = addCalendarDaysToYmd(ymd, -1)
    const y2 = addCalendarDaysToYmd(ymd, -2)
    const row1 = sevenDayCalendarDays.find((d) => d.date === y1)
    const row2 = sevenDayCalendarDays.find((d) => d.date === y2)
    const mergedBack = dedupeSessions([row2?.sessions ?? [], row1?.sessions ?? [], todaySess])
    if (hasPrimarySleep(mergedBack)) return mergedBack

    const wide = dedupeSessions([allShifted, allWeek])
    if (hasPrimarySleep(wide)) return wide

    return mergedBack.length > 0 ? mergedBack : todaySess
  }

  const shifted = shiftedDays.find((d) => d.date === ymd)
  return shifted?.sessions ?? []
}
