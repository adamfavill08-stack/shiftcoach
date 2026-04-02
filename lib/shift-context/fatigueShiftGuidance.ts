import type { FatigueShiftGuidance, ShiftContextResult } from '@/lib/shift-context/types'

export function fatigueGuidanceFromContext(
  ctx: ShiftContextResult | null | undefined,
): FatigueShiftGuidance | null {
  if (!ctx) return null
  return {
    guidanceMode: ctx.guidanceMode,
    transitionState: ctx.transitionState,
    primaryKind: ctx.primaryOperationalShift?.operationalKind ?? null,
    focusKind:
      ctx.primaryOperationalShift?.operationalKind ??
      ctx.mealPlanningShift?.operationalKind ??
      null,
  }
}
