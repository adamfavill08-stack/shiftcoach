import type { StandardShiftType } from '@/lib/shifts/toShiftType'
import type { OperationalShiftKind } from '@/lib/shift-context/types'

/** Maps resolver output into `getTodayMealSchedule` branch keys. */
export function mealScheduleTemplateFromOperational(
  operationalKind: OperationalShiftKind,
  standardType: StandardShiftType,
): 'day' | 'night' | 'late' | 'off' {
  if (operationalKind === 'off') return 'off'
  if (operationalKind === 'night') return 'night'
  if (operationalKind === 'late' || standardType === 'evening') return 'late'
  return 'day'
}
