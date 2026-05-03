import type { StandardShiftType } from '@/lib/shifts/toShiftType'

/** Matches CalorieResult / macro card shift typing. */
export type OperationalShiftKind = 'day' | 'night' | 'off' | 'early' | 'late' | 'other'

export type TransitionState =
  | 'day_to_night'
  | 'night_to_day'
  | 'post_night_recovery'
  | 'off_day'
  | 'stable'

export type GuidanceMode =
  | 'day_shift'
  | 'night_shift'
  | 'pre_day_shift'
  | 'pre_night_shift'
  | 'transition_day_to_night'
  | 'transition_night_to_day'
  | 'recovery_after_night'
  | 'off_day'

/** Refines calendar `off` days for meal planning (see `inferOffDayContext`). */
export type OffDayContext =
  | 'normal_off'
  | 'before_first_night'
  | 'between_nights'
  | 'after_final_night'
  /** Reserved — only set when roster/profile clearly indicate permanent nights. */
  | 'permanent_night_off'

export type ShiftContextSnapshot = {
  rotaDate: string
  label: string | null
  standardType: StandardShiftType
  operationalKind: OperationalShiftKind
  startTs: string | null
  endTs: string | null
  isActive: boolean
  /** Hours until this shift starts (null if unknown or already started). */
  hoursUntilStart: number | null
  usedEstimatedTimes: boolean
}

/** Optional input for fatigue scoring: operational focus from the same resolver as meals/coaching. */
export type FatigueShiftGuidance = {
  guidanceMode: GuidanceMode
  transitionState: TransitionState
  primaryKind: OperationalShiftKind | null
  /** Primary if set, else meal-planning / imminent operational kind. */
  focusKind: OperationalShiftKind | null
}

export type ShiftContextResult = {
  lastCompletedShift: ShiftContextSnapshot | null
  currentShift: ShiftContextSnapshot | null
  nextShift: ShiftContextSnapshot | null
  /**
   * Rules 1–3: (1) active work shift, (2) else work shift starting within 12h,
   * (3) else null — last completed is only for recovery, not primary ops guidance.
   */
  primaryOperationalShift: ShiftContextSnapshot | null
  /**
   * Drives meal layout / calories shift factor: primary OR next shift within 24h,
   * else next within 48h, so “tonight’s night shift” wins over yesterday’s day shift.
   */
  mealPlanningShift: ShiftContextSnapshot | null
  transitionState: TransitionState
  guidanceMode: GuidanceMode
  /**
   * When `guidanceMode === 'off_day'`, how this off day sits in a rotating pattern.
   * Otherwise `normal_off` (ignored for non–off-day guidance).
   */
  offDayContext: OffDayContext
  /** Upcoming night shift used to anchor pre-night meals on `before_first_night` / `between_nights`. */
  offDayNightAnchor: ShiftContextSnapshot | null
}
