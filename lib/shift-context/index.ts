export type {
  FatigueShiftGuidance,
  GuidanceMode,
  OffDayContext,
  OperationalShiftKind,
  ShiftContextResult,
  ShiftContextSnapshot,
  TransitionState,
} from '@/lib/shift-context/types'
export {
  fetchShiftContext,
  operationalKindFromStandard,
  resolveShiftContextFromRows,
} from '@/lib/shift-context/resolveShiftContext'
export { inferOffDayContext, inferOffDayNightAnchor, snapshotIsNightWork } from '@/lib/shift-context/inferOffDayContext'
export type { ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
export { mealScheduleTemplateFromOperational } from '@/lib/shift-context/mealScheduleFromContext'
export {
  mealGuidanceFromContext,
  shiftBoundsFromSnapshot,
  type MealGuidance,
} from '@/lib/shift-context/mealGuidanceFromContext'
export { jetlagExplanationWithShiftContext } from '@/lib/shift-context/jetlagNarrative'
export { fatigueGuidanceFromContext } from '@/lib/shift-context/fatigueShiftGuidance'
