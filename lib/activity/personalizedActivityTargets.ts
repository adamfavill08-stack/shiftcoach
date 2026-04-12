/**
 * Adaptive activity targets (steps + active-minute scale) from profile, sleep, shift context,
 * and observed movement — deterministic “coach logic”, no external LLM.
 */

import type { SleepDeficitCategory } from '@/lib/sleep/calculateSleepDeficit'
import type { ShiftType } from '@/lib/activity/calculateIntensityBreakdown'

export type PersonalizedActivityTargetInput = {
  profileStepGoal: number
  heightCm: number | null
  weightKg: number | null
  bodyGoal: 'lose' | 'maintain' | 'gain' | null
  shiftPattern: 'rotating' | 'mostly_days' | 'mostly_nights' | 'custom' | null
  shiftTypeToday: ShiftType
  weeklySleepDeficitHours: number | null
  sleepCategory: SleepDeficitCategory | null
  baselineSteps: number | null
  baselineDaysUsed: number
  last7DaySteps: number[]
  recoveryScore: number
}

export type ActivityPersonalizationPayload = {
  /** User’s saved steps goal (profile). */
  profileStepGoal: number
  /** Goal used for charts, rings, and scoring on this response. */
  effectiveStepGoal: number
  /** Scales summed active-minute target for activity score. */
  intensityTargetMultiplier: number
  /** Short codes for analytics / future UI (e.g. sleep_debt, learned_rhythm). */
  reasons: string[]
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Combines multipliers (each factor is conservative), clamps, then rounds step goal.
 */
export function computePersonalizedActivityTargets(
  input: PersonalizedActivityTargetInput,
): ActivityPersonalizationPayload {
  const reasons: string[] = []
  let m = 1.0

  const base = clamp(Math.round(input.profileStepGoal) || 10000, 2000, 30000)

  const {
    heightCm,
    weightKg,
    bodyGoal,
    shiftTypeToday,
    weeklySleepDeficitHours,
    sleepCategory,
    baselineSteps,
    baselineDaysUsed,
    last7DaySteps,
    recoveryScore,
    shiftPattern,
  } = input

  if (heightCm && heightCm > 120 && weightKg && weightKg > 35) {
    const h = heightCm / 100
    const bmi = weightKg / (h * h)
    if (bmi >= 32) {
      m *= 0.94
      reasons.push('body_composition')
    } else if (bmi <= 18.5) {
      m *= 1.03
      reasons.push('body_composition')
    }
  }

  if (bodyGoal === 'lose') {
    m *= 1.04
    reasons.push('weight_goal')
  } else if (bodyGoal === 'gain') {
    m *= 0.97
    reasons.push('weight_goal')
  }

  if (weeklySleepDeficitHours != null && weeklySleepDeficitHours > 2) {
    if (weeklySleepDeficitHours >= 10 || sleepCategory === 'high') {
      m *= 0.88
      reasons.push('sleep_debt')
    } else if (weeklySleepDeficitHours >= 5 || sleepCategory === 'medium') {
      m *= 0.93
      reasons.push('sleep_debt')
    } else {
      m *= 0.96
      reasons.push('sleep_debt')
    }
  } else if (sleepCategory === 'surplus') {
    m *= 1.02
    reasons.push('sleep_surplus')
  }

  if (recoveryScore < 42) {
    m *= 0.91
    reasons.push('recovery')
  } else if (recoveryScore >= 78) {
    m *= 1.02
    reasons.push('recovery')
  }

  if (shiftTypeToday === 'night') {
    m *= 0.94
    reasons.push('night_shift')
  } else if (shiftTypeToday === 'off') {
    m *= 1.03
    reasons.push('rest_day')
  }

  if (shiftPattern === 'rotating') {
    m *= 0.97
    reasons.push('rotating_pattern')
  } else if (shiftPattern === 'mostly_nights') {
    m *= 0.96
    reasons.push('night_pattern')
  }

  if (baselineSteps != null && baselineSteps > 800 && baselineDaysUsed >= 3) {
    const r = baselineSteps / base
    if (r > 1.12) {
      m *= 1.035
      reasons.push('learned_capacity')
    } else if (r < 0.62 && recoveryScore >= 48) {
      m *= 0.93
      reasons.push('learned_rhythm')
    }
  }

  const activeDays = last7DaySteps.filter((s) => s >= 400)
  if (activeDays.length >= 4) {
    const sorted = [...activeDays].sort((a, b) => a - b)
    const med = sorted[Math.floor(sorted.length / 2)]!
    const r2 = med / base
    if (r2 < 0.55 && !reasons.includes('learned_rhythm')) {
      m *= 0.95
      reasons.push('recent_week')
    } else if (r2 > 1.15 && !reasons.includes('learned_capacity')) {
      m *= 1.025
      reasons.push('recent_week')
    }
  }

  m = clamp(m, 0.82, 1.12)

  const effectiveStepGoal = clamp(Math.round(base * m), 3500, 28000)
  const intensityTargetMultiplier = clamp(m, 0.85, 1.12)

  return {
    profileStepGoal: base,
    effectiveStepGoal,
    intensityTargetMultiplier,
    reasons: [...new Set(reasons)],
  }
}
