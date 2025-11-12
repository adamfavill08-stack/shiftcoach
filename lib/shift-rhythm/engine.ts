/**
 * Shift Rhythm Engine
 *
 * The goal is to provide a small, composable scoring system that can be tuned easily.
 * All heuristics below are intentionally simple with clear comments so future tweaks are easy.
 */

export type ShiftType = 'night' | 'day' | 'off' | 'morning' | 'afternoon'

export type SleepLogInput = {
  date: string // ISO date (yyyy-mm-dd)
  start: string // ISO timestamp
  end: string // ISO timestamp
  durationHours: number
  quality?: number | null // 1-5 scale if available
}

export type ShiftDayInput = {
  date: string // ISO date
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
    windowStart: string // "HH:mm"
    windowEnd: string // "HH:mm"
  }>
  actual?: Array<{
    slot: string
    timestamp: string // ISO timestamp
  }>
}

export type ShiftRhythmInputs = {
  sleepLogs: SleepLogInput[]
  shiftDays: ShiftDayInput[]
  nutrition: NutritionSnapshot
  activity: ActivitySnapshot
  mealTiming: MealTimingSnapshot
  targets?: {
    sleepHours?: number
  }
}

export type ShiftRhythmScores = {
  sleep_score: number
  regularity_score: number
  shift_pattern_score: number
  recovery_score: number
  nutrition_score: number
  activity_score: number
  meal_timing_score: number
  total_score: number // 0-10 scale
}

const DEFAULT_TARGETS = {
  sleepHours: 7.5,
}

const WEIGHTS = {
  sleepComposite: 0.6,
  nutrition: 0.25,
  activity: 0.15,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => {
  const clamped = clamp(value, inMin, inMax)
  const ratio = (clamped - inMin) / (inMax - inMin || 1)
  return outMin + ratio * (outMax - outMin)
}

const getAverage = (values: number[]) => {
  if (!values.length) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

const getStdDevHours = (times: Date[]) => {
  if (times.length <= 1) return 0
  const reference = times[0]
  const offsets = times.map((d) => (d.getTime() - reference.getTime()) / 3600000)
  const mean = getAverage(offsets)
  const variance = getAverage(offsets.map((offset) => (offset - mean) ** 2))
  return Math.sqrt(variance)
}

const parseTime = (timestamp: string) => new Date(timestamp)

export function calculateShiftRhythm(inputs: ShiftRhythmInputs): ShiftRhythmScores {
  const targets = { ...DEFAULT_TARGETS, ...inputs.targets }
  const sleepLogs = inputs.sleepLogs ?? []
  const shiftDays = inputs.shiftDays ?? []
  const nutrition = inputs.nutrition ?? {}
  const activity = inputs.activity ?? {}
  const mealTiming = inputs.mealTiming ?? {}

  // --- Sleep related scores -------------------------------------------------

  const recentSleep = sleepLogs.slice(0, 7)
  const avgSleepHours = getAverage(recentSleep.map((s) => s.durationHours))
  const sleepScore = Math.round(
    mapRange(avgSleepHours || 0, targets.sleepHours * 0.6, targets.sleepHours * 1.1, 25, 100),
  )

  const bedtimes = recentSleep.map((log) => parseTime(log.start))
  const regularityStd = getStdDevHours(bedtimes) // std deviation in hours
  const regularityScore = Math.round(mapRange(regularityStd, 0, 3.5, 100, 40))

  const shiftMap = new Map<string, ShiftType>()
  shiftDays.forEach((shift) => shiftMap.set(shift.date, shift.type))

  const alignmentScores = recentSleep.map((log) => {
    const dateKey = log.date
    const shiftType = shiftMap.get(dateKey)
    if (!shiftType) return 70

    const bedtime = parseTime(log.start).getHours()
    if (shiftType === 'night') {
      return mapRange(bedtime, 20, 2 + 24, 70, 100) // prefer late bedtimes
    }
    if (shiftType === 'morning') {
      return mapRange(bedtime, 20, 23, 70, 95)
    }
    if (shiftType === 'afternoon') {
      return mapRange(bedtime, 21, 0 + 24, 70, 90)
    }
    if (shiftType === 'day') {
      return mapRange(bedtime, 21, 23, 70, 95)
    }
    return 80
  })
  const shiftPatternScore = Math.round(getAverage(alignmentScores))

  const recoveryScores = recentSleep.map((log, index) => {
    const quality = log.quality ?? 3
    const durationScore = mapRange(log.durationHours, 5, 9, 30, 100)
    const qualityScore = mapRange(quality, 1, 5, 30, 100)
    const previousShiftType = shiftDays[index]?.type ?? 'off'
    const shiftPenalty = previousShiftType === 'night' ? -10 : 0
    return clamp((durationScore * 0.6 + qualityScore * 0.4) + shiftPenalty, 20, 100)
  })
  const recoveryScore = Math.round(getAverage(recoveryScores))

  const sleepComposite = clamp(
    (sleepScore * 0.35 +
      regularityScore * 0.25 +
      shiftPatternScore * 0.2 +
      recoveryScore * 0.2),
    0,
    100,
  )

  // --- Nutrition ------------------------------------------------------------

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
      if (target && consumed != null) {
        const ratio = consumed / target
        scores.push(mapRange(ratio, 0.8, 1.1, 60, 100))
      }
    }
    if (macros.carbs) {
      const { target, consumed } = macros.carbs
      if (target && consumed != null) {
        const ratio = consumed / target
        scores.push(mapRange(ratio, 0.8, 1.15, 65, 100))
      }
    }
    if (macros.fat) {
      const { target, consumed } = macros.fat
      if (target && consumed != null) {
        const ratio = consumed / target
        scores.push(mapRange(ratio, 0.7, 1.2, 60, 98))
      }
    }
    if (macros.satFat) {
      const { limit, consumed } = macros.satFat
      if (limit && consumed != null) {
        const ratio = consumed / limit
        scores.push(mapRange(ratio, 0.3, 1.0, 100, 55))
      }
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

  const nutritionScore = clamp(
    calorieScore * 0.4 + macroScore * 0.4 + hydrationScore * 0.2,
    0,
    100,
  )

  // --- Activity -------------------------------------------------------------

  const stepsScore = (() => {
    const steps = activity.steps ?? 0
    const goal = activity.stepsGoal ?? 10000
    const ratio = goal ? steps / goal : 1
    return mapRange(ratio, 0.5, 1.1, 60, 100)
  })()

  const activeMinutesScore = (() => {
    if (!activity.activeMinutesGoal) return 80
    const ratio =
      (activity.activeMinutes ?? 0) / (activity.activeMinutesGoal || 1)
    return mapRange(ratio, 0.5, 1.1, 60, 100)
  })()

  const activityScore = clamp(
    stepsScore * 0.75 + activeMinutesScore * 0.25,
    0,
    100,
  )

  // --- Meal timing ----------------------------------------------------------

  const mealTimingScore = (() => {
    const recommended = mealTiming.recommended ?? []
    const actual = mealTiming.actual ?? []
    if (!recommended.length || !actual.length) {
      return 75
    }

    const matches = actual.map((entry) => {
      const rec = recommended.find(
        (r) => r.slot.toLowerCase() === entry.slot.toLowerCase(),
      )
      if (!rec) return 70
      const actualDate = parseTime(entry.timestamp)
      const [wsH, wsM] = rec.windowStart.split(':').map(Number)
      const [weH, weM] = rec.windowEnd.split(':').map(Number)

      const windowStart = new Date(actualDate)
      windowStart.setHours(wsH, wsM, 0, 0)
      const windowEnd = new Date(actualDate)
      windowEnd.setHours(weH, weM, 0, 0)

      if (actualDate >= windowStart && actualDate <= windowEnd) {
        return 95
      }
      const diffMinutes =
        Math.abs(actualDate.getTime() - windowStart.getTime()) / 60000
      return mapRange(diffMinutes, 30, 180, 90, 60)
    })

    return clamp(getAverage(matches), 40, 100)
  })()

  // --- Final score ----------------------------------------------------------

  const sleepCompositeScore = clamp(sleepComposite, 0, 100)
  const totalScore0to100 =
    sleepCompositeScore * WEIGHTS.sleepComposite +
    nutritionScore * WEIGHTS.nutrition +
    activityScore * WEIGHTS.activity

  const total_score = Number((totalScore0to100 / 100 * 10).toFixed(1))

  return {
    sleep_score: Math.round(sleepScore),
    regularity_score: Math.round(regularityScore),
    shift_pattern_score: Math.round(shiftPatternScore),
    recovery_score: Math.round(recoveryScore),
    nutrition_score: Math.round(nutritionScore),
    activity_score: Math.round(activityScore),
    meal_timing_score: Math.round(mealTimingScore),
    total_score,
  }
}

export function getShiftRhythmMessage(score: number): string {
  if (score >= 8.5) return 'Your rhythm is humming — keep stacking consistent days.'
  if (score >= 7) return 'Your rhythm is syncing well today—stay consistent.'
  if (score >= 5.5)
    return 'Your rhythm is holding, but sleep and meal timing could be tighter.'
  if (score >= 4)
    return 'Your rhythm is off today; focus on a consistent sleep window and lighter late meals.'
  return 'Rhythm reset required — prioritise sleep and pre-shift routine tonight.'
}

