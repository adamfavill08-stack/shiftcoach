import { computeRegularityScore, SleepLogWithContext } from './regularityScoring'
import { computeCircadianDebt, applyDebtPenalty, isRotatingShiftWorker, CircadianDebtInput } from './circadianDebt'

export interface ShiftRhythmScores {
  sleep_score:          number | null
  regularity_score:     number | null
  shift_pattern_score:  number | null
  recovery_score:       number | null
  meal_timing_score:    number | null
  movement_score:       number | null
  nutrition_score:      number | null
  sleep_composite:      number | null
  total_score:          number | null
  circadian_debt:       number
  circadian_debt_trend: 'improving' | 'stable' | 'worsening'
}

interface ScoreFactor {
  value:  number | null
  weight: number
}

export function computeWeightedComposite(factors: ScoreFactor[]): number | null {
  const available = factors.filter((f): f is { value: number; weight: number } => f.value !== null)
  if (available.length === 0) return null
  const totalWeight = available.reduce((sum, f) => sum + f.weight, 0)
  const weighted    = available.reduce((sum, f) => sum + f.value * f.weight, 0)
  return Math.min(100, Math.max(0, Math.round(weighted / totalWeight)))
}

export function computeSleepComposite(
  s: Pick<ShiftRhythmScores, 'sleep_score' | 'regularity_score' | 'shift_pattern_score' | 'recovery_score'>,
): number | null {
  return computeWeightedComposite([
    { value: s.sleep_score,         weight: 0.35 },
    { value: s.regularity_score,    weight: 0.25 },
    { value: s.shift_pattern_score, weight: 0.20 },
    { value: s.recovery_score,      weight: 0.20 },
  ])
}

export function computeTotalScore(s: ShiftRhythmScores): number | null {
  return computeWeightedComposite([
    { value: s.sleep_composite,   weight: 0.40 },
    { value: s.meal_timing_score, weight: 0.20 },
    { value: s.movement_score,    weight: 0.20 },
    { value: s.nutrition_score,   weight: 0.20 },
  ])
}

export interface ScorePipelineInput {
  recentSleepLogs:             SleepLogWithContext[]
  recentShiftLabels:           Array<string | null>
  historicalMidpointOffsets:   number[]
  previousCircadianDebt:       number
  sleepScore:                  number | null
  shiftPatternScore:           number | null
  recoveryScore:               number | null
  mealTimingScore:             number | null
  movementScore:               number | null
  nutritionScore:              number | null
}

export function computeAllScores(input: ScorePipelineInput): ShiftRhythmScores {
  const regularityResult = computeRegularityScore(input.recentSleepLogs)

  const rotating   = isRotatingShiftWorker(input.recentShiftLabels)
  const debtResult = computeCircadianDebt({
    historicalMidpointOffsets: input.historicalMidpointOffsets,
    currentDebt:               input.previousCircadianDebt,
    isRotatingShiftWorker:     rotating,
  })

  const penalisedRegularity = regularityResult.score !== null
    ? applyDebtPenalty(regularityResult.score, debtResult.debt)
    : null

  const partial = {
    sleep_score:         input.sleepScore,
    regularity_score:    penalisedRegularity,
    shift_pattern_score: input.shiftPatternScore,
    recovery_score:      input.recoveryScore,
  }

  const sleep_composite = computeSleepComposite(partial)

  const scores: ShiftRhythmScores = {
    ...partial,
    meal_timing_score:    input.mealTimingScore,
    movement_score:       input.movementScore,
    nutrition_score:      input.nutritionScore,
    sleep_composite,
    total_score:          null,
    circadian_debt:       debtResult.debt,
    circadian_debt_trend: debtResult.trend,
  }

  scores.total_score = computeTotalScore(scores)
  return scores
}

export function scoreDisplayValue(score: number | null): string {
  return score === null ? '—' : String(score)
}
