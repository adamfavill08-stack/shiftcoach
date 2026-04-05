import type { RotaDay } from '@/lib/data/buildRotaMonth'

/** Rota API weeks are Monday-first; reorder columns for Sunday-first display. */
export function reorderRotaWeekForDisplay(week: RotaDay[], weekStartsOn: 0 | 1): RotaDay[] {
  if (week.length !== 7) return week
  if (weekStartsOn === 1) return week
  return [week[6], week[0], week[1], week[2], week[3], week[4], week[5]]
}

export function reorderRotaWeeksForDisplay(weeks: RotaDay[][], weekStartsOn: 0 | 1): RotaDay[][] {
  return weeks.map((w) => reorderRotaWeekForDisplay(w, weekStartsOn))
}

export function calendarWeekdayLabels(weekStartsOn: 0 | 1): string[] {
  const mondayFirst = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  if (weekStartsOn === 1) return mondayFirst
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S']
}
