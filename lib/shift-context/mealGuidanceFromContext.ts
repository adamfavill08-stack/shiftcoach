import { mealScheduleTemplateFromOperational } from '@/lib/shift-context/mealScheduleFromContext'
import type {
  GuidanceMode,
  ShiftContextResult,
  ShiftContextSnapshot,
  TransitionState,
} from '@/lib/shift-context/types'

export type MealGuidance = {
  /** Shift used for template + start/end bounds (primary operational or next imminent work shift). */
  anchorShift: ShiftContextSnapshot | null
  template: 'day' | 'night' | 'late' | 'off'
  guidanceMode: GuidanceMode
  transitionState: TransitionState
}

/**
 * Drive meal timing from resolved shift context (not calendar “today” alone).
 * Uses primaryOperationalShift, else mealPlanningShift so the next night dominates on transition days.
 */
export function mealGuidanceFromContext(ctx: ShiftContextResult): MealGuidance {
  const anchor: ShiftContextSnapshot | null =
    ctx.primaryOperationalShift ?? ctx.mealPlanningShift ?? null

  let template: MealGuidance['template'] = 'off'
  if (anchor && (anchor.operationalKind === 'off' || anchor.standardType === 'off')) {
    template = 'off'
  } else if (
    anchor &&
    anchor.operationalKind !== 'other' &&
    anchor.operationalKind !== 'off'
  ) {
    template = mealScheduleTemplateFromOperational(anchor.operationalKind, anchor.standardType)
  }

  if (
    (ctx.guidanceMode === 'pre_night_shift' || ctx.guidanceMode === 'transition_day_to_night') &&
    ctx.mealPlanningShift?.operationalKind === 'night'
  ) {
    template = 'night'
  }

  if (ctx.guidanceMode === 'night_shift' && ctx.primaryOperationalShift?.operationalKind === 'night') {
    template = 'night'
  }

  if (ctx.guidanceMode === 'off_day') {
    template = 'off'
  }

  return {
    anchorShift: anchor,
    template,
    guidanceMode: ctx.guidanceMode,
    transitionState: ctx.transitionState,
  }
}

export function shiftBoundsFromSnapshot(
  anchor: ShiftContextSnapshot | null,
): { start: Date; end: Date } | null {
  if (!anchor?.startTs || !anchor?.endTs) return null
  const start = new Date(anchor.startTs)
  const end = new Date(anchor.endTs)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return { start, end }
}
