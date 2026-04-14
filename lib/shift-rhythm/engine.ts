/**
 * Shift Rhythm Engine
 */
import type { SleepLogWithContext } from './regularityScoring'
import { mapRange } from './utils'
import { computeAllScores, ScorePipelineInput, type ShiftRhythmScores as PipelineScores } from './scoring'

export type ShiftType = 'night' | 'day' | 'off' | 'morning' | 'afternoon'

export type SleepLogInput = {
  date: string
  start: string
  end: string
  durationHours: number
  quality?: number | null
}

export type ShiftDayInput = {
  date: string
  type: ShiftType
}

export type NutritionSnapshot = {
  adjustedCalories?: number | null
  consumedCalories?: number | null
  calorieTarget?: number | null
  macros?: {
    protein?: { target: number | null; consumed: number | null }
    carbs?: { target: number | null; consumed: number | null }
    fat?: { target: number | null; consumed: number | null }
    satFat?: { limit: number | null; consumed: number | null }
  }
  hydration?: {
    water?: { targetMl: number | null; consumedMl: number | null }
    caffeine?: { limitMg: number | null; consumedMg: number | null }
  }
}

export type ActivitySnapshot = {
  steps?: number | null
  stepsGoal?: number | null
  activeMinutes?: number | null
  activeMinutesGoal?: number | null
}

export type MealTimingSnapshot = {
  recommended?: Array<{
    slot: string
    windowStart: string
    windowEnd: string
  }>
  actual?: Array<{
    slot: string
    timestamp: string
  }>
}

export type ShiftRhythmInputs = {
  sleepLogs: SleepLogInput[]
  sleepLogsWithContext?: SleepLogWithContext[]
  shiftDays: ShiftDayInput[]
  shifts?: Array<{ date: string; label?: string | null; start_ts?: string | null }>
  previousCircadianDebt?: number
  midpointOffsets?: number[] | null
  nutrition: NutritionSnapshot
  activity: ActivitySnapshot
  mealTiming: MealTimingSnapshot
  targets?: {
    sleepHours?: number
  }
  shiftContext?: import('@/lib/shift-context/types').ShiftContextResult | null
}

export type ShiftRhythmScores = PipelineScores & {
  activity_score: number | null
}

const DEFAULT_TARGETS = {
  sleepHours: 7.5,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const getAverage = (values: number[]) => {
  if (!values.length) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

const parseTime = (timestamp: string) => new Date(timestamp)

export function calculateShiftRhythm(inputs: ShiftRhythmInputs): ShiftRhythmScores {
  const targets = { ...DEFAULT_TARGETS, ...inputs.targets }
  const sleepLogs = inputs.sleepLogs ?? []
  const shiftDays = inputs.shiftDays ?? []
  const shifts = inputs.shifts ?? []
  const previousCircadianDebt = inputs.previousCircadianDebt ?? 0
  const midpointOffsets = inputs.midpointOffsets
  const nutrition = inputs.nutrition ?? {}
  const activity = inputs.activity ?? {}
  const mealTiming = inputs.mealTiming ?? {}

  const shiftMap = new Map<string, ShiftType>()
  shiftDays.forEach((shift) => shiftMap.set(shift.date, shift.type))

  const sleepLogsWithContext: SleepLogWithContext[] = (() => {
    if (inputs.sleepLogsWithContext && inputs.sleepLogsWithContext.length > 0) {
      return inputs.sleepLogsWithContext
    }
    if (!sleepLogs.length) return []

    return sleepLogs.map((log) => {
      const shiftType = shiftMap.get(log.date)
      const label =
        shiftType === 'night'
          ? 'night'
          : shiftType === 'day'
            ? 'day'
            : shiftType === 'morning'
              ? 'morning'
              : shiftType === 'afternoon'
                ? 'afternoon'
                : shiftType === 'off'
                  ? 'off'
                  : null

      return {
        start: log.start,
        shiftLabel: label,
      }
    })
  })()

  const recentSleep = sleepLogs.slice(0, 7)
  const avgSleepHours = getAverage(recentSleep.map((s) => s.durationHours))
  const sleep_score = Math.round(
    mapRange(avgSleepHours || 0, targets.sleepHours * 0.6, targets.sleepHours * 1.1, 25, 100),
  )

  const alignmentScores = recentSleep.map((log) => {
    const dateKey = log.date
    const shiftType = shiftMap.get(dateKey)
    if (!shiftType) return 70

    const bedtime = parseTime(log.start).getHours()
    if (shiftType === 'night') return mapRange(bedtime, 20, 2 + 24, 70, 100)
    if (shiftType === 'morning') return mapRange(bedtime, 20, 23, 70, 95)
    if (shiftType === 'afternoon') return mapRange(bedtime, 21, 0 + 24, 70, 90)
    if (shiftType === 'day') return mapRange(bedtime, 21, 23, 70, 95)
    return 80
  })
  const shift_pattern_score = Math.round(getAverage(alignmentScores))

  const recoveryScores = recentSleep.map((log, index) => {
    const quality = log.quality ?? 3
    const durationScore = mapRange(log.durationHours, 5, 9, 30, 100)
    const qualityScore = mapRange(quality, 1, 5, 30, 100)
    const previousShiftType = shiftDays[index]?.type ?? 'off'
    const shiftPenalty = previousShiftType === 'night' ? -10 : 0
    return clamp((durationScore * 0.6 + qualityScore * 0.4) + shiftPenalty, 20, 100)
  })
  const recovery_score =
    recoveryScores.length > 0 ? Math.round(getAverage(recoveryScores)) : null

  const calorieTarget = nutrition.calorieTarget ?? nutrition.adjustedCalories ?? 0
  const consumedCalories = nutrition.consumedCalories ?? 0
  const calorieRatio = calorieTarget > 0 ? consumedCalories / calorieTarget : 1
  const calorieScore = mapRange(calorieRatio, 0.7, 1.1, 50, 100)

  const macroScore = (() => {
    const macros = nutrition.macros
    if (!macros) return 80
    const scores: number[] = []
    if (macros.protein) {
      const { target, consumed } = macros.protein
      if (target && consumed != null) scores.push(mapRange(consumed / target, 0.8, 1.1, 60, 100))
    }
    if (macros.carbs) {
      const { target, consumed } = macros.carbs
      if (target && consumed != null) scores.push(mapRange(consumed / target, 0.8, 1.15, 65, 100))
    }
    if (macros.fat) {
      const { target, consumed } = macros.fat
      if (target && consumed != null) scores.push(mapRange(consumed / target, 0.7, 1.2, 60, 98))
    }
    if (macros.satFat) {
      const { limit, consumed } = macros.satFat
      if (limit && consumed != null) scores.push(mapRange(consumed / limit, 0.3, 1.0, 100, 55))
    }
    if (!scores.length) return 80
    return clamp(getAverage(scores), 40, 100)
  })()

  const hydrationScore = (() => {
    const water = nutrition.hydration?.water
    const caffeine = nutrition.hydration?.caffeine
    const hydrated = water?.targetMl
      ? mapRange((water.consumedMl ?? 0) / water.targetMl, 0.6, 1.0, 55, 100)
      : 80
    const caffeineScore = caffeine?.limitMg
      ? mapRange((caffeine.consumedMg ?? 0) / caffeine.limitMg, 0.2, 1.1, 100, 50)
      : 85
    return clamp(hydrated * 0.7 + caffeineScore * 0.3, 40, 100)
  })()

  const nutrition_score = Math.round(clamp(
    calorieScore * 0.4 + macroScore * 0.4 + hydrationScore * 0.2,
    0,
    100,
  ))

  const hasStepsData = typeof activity.steps === 'number' && Number.isFinite(activity.steps)
  const hasActiveMinutesData =
    typeof activity.activeMinutes === 'number' && Number.isFinite(activity.activeMinutes)

  const movement_score = (() => {
    if (!hasStepsData && !hasActiveMinutesData) return null

    const stepsScore = hasStepsData
      ? (() => {
          const steps = activity.steps as number
          const goal = activity.stepsGoal ?? 10000
          const ratio = goal ? steps / goal : 1
          return mapRange(ratio, 0.5, 1.1, 60, 100)
        })()
      : null

    const activeMinutesScore = hasActiveMinutesData
      ? (() => {
          if (!activity.activeMinutesGoal) return 80
          const ratio = (activity.activeMinutes as number) / (activity.activeMinutesGoal || 1)
          return mapRange(ratio, 0.5, 1.1, 60, 100)
        })()
      : null

    // When we only have one signal, pull score toward a conservative baseline.
    if (stepsScore != null && activeMinutesScore == null) {
      return Math.round(clamp(stepsScore * 0.7 + 50 * 0.3, 40, 95))
    }
    if (stepsScore == null && activeMinutesScore != null) {
      return Math.round(clamp(activeMinutesScore * 0.7 + 50 * 0.3, 40, 95))
    }
    return Math.round(clamp((stepsScore as number) * 0.75 + (activeMinutesScore as number) * 0.25, 0, 100))
  })()

  const meal_timing_score = (() => {
    const recommended = mealTiming.recommended ?? []
    const actual = mealTiming.actual ?? []
    if (!recommended.length || !actual.length) return 75

    const matches = actual.map((entry) => {
      const rec = recommended.find((r) => r.slot.toLowerCase() === entry.slot.toLowerCase())
      if (!rec) return 70
      const actualDate = parseTime(entry.timestamp)
      const [wsH, wsM] = rec.windowStart.split(':').map(Number)
      const [weH, weM] = rec.windowEnd.split(':').map(Number)
      const windowStart = new Date(actualDate)
      windowStart.setHours(wsH, wsM, 0, 0)
      const windowEnd = new Date(actualDate)
      windowEnd.setHours(weH, weM, 0, 0)
      if (actualDate >= windowStart && actualDate <= windowEnd) return 95
      const diffMinutes = Math.abs(actualDate.getTime() - windowStart.getTime()) / 60000
      return mapRange(diffMinutes, 30, 180, 90, 60)
    })

    return Math.round(clamp(getAverage(matches), 40, 100))
  })()

  const scoringInput: ScorePipelineInput = {
    recentSleepLogs:           sleepLogsWithContext,
    recentShiftLabels:         shifts.map((s: any) => s.label ?? null),
    historicalMidpointOffsets: midpointOffsets ?? [],
    previousCircadianDebt,
    sleepScore:         sleep_score ?? null,
    shiftPatternScore:  shift_pattern_score ?? null,
    recoveryScore:      recovery_score ?? null,
    mealTimingScore:    meal_timing_score ?? null,
    movementScore:      movement_score ?? null,
    nutritionScore:     nutrition_score ?? null,
  }

  const scores = computeAllScores(scoringInput)

  return {
    ...scores,
    activity_score: scores.movement_score,
  }
}

export function getShiftRhythmMessage(score: number): string {
  if (score >= 85) return 'Your rhythm is humming — keep stacking consistent days.'
  if (score >= 70) return 'Your rhythm is syncing well today—stay consistent.'
  if (score >= 55) return 'Your rhythm is holding, but sleep and meal timing could be tighter.'
  if (score >= 40) return 'Your rhythm is off today; focus on a consistent sleep window and lighter late meals.'
  return 'Rhythm reset required — prioritise sleep and pre-shift routine tonight.'
}
