import type { PatternType, TransitionSeverity } from '@/lib/shift-pattern-analyser/types'

export type ShiftAgentMode = 'DAY_NORMAL' | 'NIGHT_NORMAL' | 'TRANSITIONING' | 'RECOVERING'

export type UserShiftState = {
  patternType: PatternType | string
  currentMode: ShiftAgentMode
  activeTransition: {
    from: string
    to: string
    severity: TransitionSeverity | string
    napRecommended: boolean
    sleepAnchorShift: number
    recoveryHours: number
    nextShiftStart: Date
    transitionStarted: Date
  } | null
  mealWindows: {
    meal1: Date
    meal2: Date
    anchorMeal: Date
    shiftSnack1: Date
    shiftSnack2: Date | null
  }
  sleepWindows: {
    primarySleep: { start: Date; end: Date }
    napWindow: { start: Date; end: Date } | null
  }
  lastCalculated: Date
}

export type ShiftAgentLogPayload = {
  reason: string
  state: UserShiftState
  analysisNotes: string[]
}
