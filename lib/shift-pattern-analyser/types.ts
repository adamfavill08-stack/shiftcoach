import type { StandardShiftType } from '@/lib/shifts/toShiftType'

/** Matches rota `shifts` rows used by shift context — extend as needed. */
export type AnalyserShiftInput = {
  date: string
  label?: string | null
  start_ts: string | null
  end_ts: string | null
}

export type RotationDirection = 'forward' | 'backward' | 'stable'

export type TransitionSeverity = 'critical' | 'high' | 'moderate' | 'low'

export type PatternType =
  | 'fixed_days'
  | 'fixed_nights'
  | 'rotating_forward'
  | 'rotating_backward'
  | 'continental'
  | 'irregular'

export type ShiftTransitionAnalysis = {
  /** Index of the "to" shift in the sorted input array. */
  toIndex: number
  fromShift: AnalyserShiftInput
  toShift: AnalyserShiftInput
  fromType: StandardShiftType
  toType: StandardShiftType
  /** Hours the ideal main-sleep midpoint moved vs previous shift (24h circle). Positive = forward (later). */
  sleepAnchorShift: number
  /** Wall-clock hours between previous shift end and next shift start. */
  recoveryHours: number
  rotationDirection: RotationDirection
  transitionSeverity: TransitionSeverity
  napRecommended: boolean
}

export type ShiftPatternAnalysisResult = {
  transitions: ShiftTransitionAnalysis[]
  patternType: PatternType
  /** Shifts included in pattern detection (last 28 days by date). */
  patternWindowShiftCount: number
}
