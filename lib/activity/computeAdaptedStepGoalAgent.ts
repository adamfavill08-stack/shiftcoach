/**
 * Deterministic adapted daily step target ("agent") — no LLM.
 * Spec: baseline, multiplicative factors, ±30% vs baseline, hard min/max, debounce, opt-out.
 */

export type AdaptedStepShift = 'day' | 'evening' | 'night' | 'rotating' | null

export type AdaptedStepPreferences = {
  hardGoalMin: number | null
  hardGoalMax: number | null
  optOutAdaptive: boolean
}

export type AdaptedStepGoalAgentInput = {
  userId: string
  baselineGoal: number | null
  heightCm: number | null
  weightKg: number | null
  sex: 'male' | 'female' | 'other' | null
  ageYears: number | null
  recent7DaySteps: Array<number | null>
  todayStepsSoFar: number
  sleepLastNightMinutes: number | null
  avgSleepLast3NightsMinutes: number | null
  shift: AdaptedStepShift
  timezone: string
  preferences: AdaptedStepPreferences
  lastAdaptedAt: string | null
  lastAdaptedStepGoal: number | null
  /**
   * Pass a fixed ISO time for identical outputs across runs (tests / batch jobs).
   * Defaults to `new Date().toISOString()` when omitted.
   */
  nowIso?: string
  /**
   * FIX 1 — Sleep-window-aware debounce.
   * Set to true when the circadian agent (or caller) has determined the user is
   * currently inside their sleep window. When true the prior goal is held
   * unconditionally regardless of the 12-hour clock, preventing a mid-sleep
   * goal flip for night/rotating workers who finish a shift at e.g. 07:00.
   */
  inSleepWindow?: boolean
  /**
   * FIX 2 — Transition guard.
   * Set to true when the shift-transition-detection system has flagged that the
   * user recently changed shift pattern (e.g. day → night rotation).
   * When true, trendFactor is pinned to 1.0 so a naturally depressed recent-7
   * mean doesn't compound the shift-type penalty during the transition week.
   */
  shiftTransitionDetected?: boolean
}

export type ActivityPersonalizationAgentPayload = {
  reasons: string[]
  factors: Record<string, number>
  computedAt: string
  explanation: string
}

export type AdaptedStepGoalAgentResult = {
  userId: string
  adaptedStepGoal: number
  activityPersonalization: ActivityPersonalizationAgentPayload
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function resolveBaseline(baselineGoal: number | null, lastAdaptedStepGoal: number | null): number {
  if (baselineGoal != null && Number.isFinite(baselineGoal)) {
    return Math.round(baselineGoal)
  }
  if (lastAdaptedStepGoal != null && Number.isFinite(lastAdaptedStepGoal)) {
    return Math.round(lastAdaptedStepGoal)
  }
  return 10000
}

function meanRecentSteps(recent7DaySteps: Array<number | null>): { mean: number; hadMissing: boolean } {
  const vals = recent7DaySteps.filter(
    (x): x is number => x != null && typeof x === 'number' && Number.isFinite(x) && x >= 0,
  )
  const hadMissing = recent7DaySteps.some((x) => x == null)
  if (vals.length === 0) return { mean: NaN, hadMissing: true }
  const sum = vals.reduce((a, b) => a + b, 0)
  return { mean: sum / vals.length, hadMissing }
}

function shiftFactor(shift: AdaptedStepShift): { f: number; code: string | null } {
  if (shift === 'night' || shift === 'rotating') return { f: 0.9, code: 'night_shift' }
  if (shift === 'evening') return { f: 0.95, code: 'evening_shift' }
  return { f: 1.0, code: null }
}

function sleepPenalty(
  sleepLastNightMinutes: number | null,
  avgSleepLast3NightsMinutes: number | null,
): { penalty: number; codes: string[] } {
  const codes: string[] = []
  const lastMissing = sleepLastNightMinutes == null
  const avgMissing = avgSleepLast3NightsMinutes == null

  // FIX 3 — Distinguish "no sleep data at all" from other missing_data signals
  // so the UI can surface a meaningful message rather than silently passing with 1.0.
  if (lastMissing && avgMissing) {
    return { penalty: 1.0, codes: ['sleep_data_unavailable'] }
  }

  let penalty = 1.0
  if (
    avgSleepLast3NightsMinutes != null &&
    Number.isFinite(avgSleepLast3NightsMinutes) &&
    avgSleepLast3NightsMinutes < 360
  ) {
    penalty *= 0.8
    codes.push('short_sleep')
  } else if (
    sleepLastNightMinutes != null &&
    Number.isFinite(sleepLastNightMinutes) &&
    sleepLastNightMinutes < 360
  ) {
    penalty *= 0.85
    codes.push('short_sleep')
  }

  return { penalty, codes }
}

function bmiFactor(heightCm: number | null, weightKg: number | null): { f: number; highBmi: boolean } {
  if (
    heightCm == null ||
    weightKg == null ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 120 ||
    weightKg <= 35
  ) {
    return { f: 1.0, highBmi: false }
  }
  const h = heightCm / 100
  const bmi = weightKg / (h * h)
  if (bmi > 35) return { f: 0.85, highBmi: true }
  return { f: 1.0, highBmi: false }
}

function buildExplanation(reasons: string[]): string {
  const parts: string[] = []
  const push = (cond: boolean, s: string) => {
    if (cond) parts.push(s)
  }
  push(reasons.includes('opt_out'), 'Using your saved baseline (adaptive goals off).')
  push(reasons.includes('short_sleep'), 'Adjusted for short sleep.')
  push(reasons.includes('night_shift'), 'Adjusted for night or rotating shift pattern.')
  push(reasons.includes('evening_shift'), 'Adjusted for evening shift.')
  push(reasons.includes('high_bmi'), 'Lower target for higher BMI mobility consideration.')
  push(reasons.includes('trend_up'), 'Recent activity trending above baseline.')
  push(reasons.includes('trend_down'), 'Recent activity trending below baseline.')
  // FIX 2 — explain the transition guard in user-facing text
  push(reasons.includes('shift_transition'), 'Recent shift pattern change detected; trend data paused to avoid double-adjusting.')
  push(reasons.includes('maintenance'), 'Kept prior target (small change within debounce window).')
  push(reasons.includes('missing_data'), 'Some step data was missing; conservative defaults applied.')
  // FIX 3 — distinct sleep data message
  push(reasons.includes('sleep_data_unavailable'), 'No sleep data available yet; sleep adjustments skipped.')
  // FIX 1 — sleep-window hold message
  push(reasons.includes('sleep_window_hold'), "Goal held while you're in your sleep window.")
  if (parts.length === 0) return 'Target aligned with baseline and recent activity.'
  return parts.join(' ')
}

/**
 * Deterministic adapted step goal + audit payload.
 */
export function computeAdaptedStepGoalAgent(input: AdaptedStepGoalAgentInput): AdaptedStepGoalAgentResult {
  const computedAt = input.nowIso ?? new Date().toISOString()
  const baseline = resolveBaseline(input.baselineGoal, input.lastAdaptedStepGoal)
  const reasons: string[] = []
  const factors: Record<string, number> = { baseline: baseline }

  if (input.preferences.optOutAdaptive) {
    return {
      userId: input.userId,
      adaptedStepGoal: baseline,
      activityPersonalization: {
        reasons: ['opt_out'],
        factors: { ...factors, optOut: 1 },
        computedAt,
        explanation: buildExplanation(['opt_out']),
      },
    }
  }

  // FIX 1 — Sleep-window-aware debounce.
  // If the caller signals the user is currently in their sleep window AND we have
  // a valid prior goal, hold it immediately — no 12-hour clock check required.
  // This prevents a night-shift worker finishing at 07:00 from getting a goal
  // flip when the cron fires again at 18:00 while they're still asleep.
  const lastGoal = input.lastAdaptedStepGoal
  if (
    input.inSleepWindow === true &&
    lastGoal != null &&
    Number.isFinite(lastGoal) &&
    lastGoal >= 1000
  ) {
    const sleepWindowReasons = ['sleep_window_hold']
    return {
      userId: input.userId,
      adaptedStepGoal: Math.round(lastGoal),
      activityPersonalization: {
        reasons: sleepWindowReasons,
        factors: { ...factors, sleepWindowHold: 1 },
        computedAt,
        explanation: buildExplanation(sleepWindowReasons),
      },
    }
  }

  const { mean: stepMean, hadMissing: hadMissingSteps } = meanRecentSteps(input.recent7DaySteps)

  // FIX 2 — Shift transition guard.
  // When the shift-transition detector has flagged a recent pattern change, pin
  // trendFactor to 1.0. A worker who just rotated onto nights will naturally have
  // a depressed recent-7 mean; letting that mean feed the trend factor on top of
  // the ×0.9 night-shift penalty produces an unfair double-penalty for the whole
  // first week of the rotation.
  let trendFactor: number
  if (input.shiftTransitionDetected === true) {
    trendFactor = 1.0
    factors.trendFactor = trendFactor
    factors.trendPinned = 1
    reasons.push('shift_transition')
  } else {
    const trendSource = Number.isFinite(stepMean) ? stepMean : baseline
    trendFactor = clamp((trendSource + 1) / (baseline + 1), 0.7, 1.3)
    factors.trendFactor = trendFactor

    if (!Number.isFinite(stepMean)) {
      reasons.push('missing_data')
    } else if (stepMean > baseline) {
      reasons.push('trend_up')
    } else if (stepMean < baseline) {
      reasons.push('trend_down')
    }
    if (hadMissingSteps && !reasons.includes('missing_data')) reasons.push('missing_data')
  }

  const { penalty: sleepPen, codes: sleepCodes } = sleepPenalty(
    input.sleepLastNightMinutes,
    input.avgSleepLast3NightsMinutes,
  )
  factors.sleepPenalty = sleepPen
  for (const c of sleepCodes) {
    if (!reasons.includes(c)) reasons.push(c)
  }

  const { f: shiftAdj, code: shiftCode } = shiftFactor(input.shift)
  factors.shiftAdjustment = shiftAdj
  if (shiftCode === 'night_shift') reasons.push('night_shift')
  if (shiftCode === 'evening_shift') reasons.push('evening_shift')

  const { f: bmiAdj, highBmi } = bmiFactor(input.heightCm, input.weightKg)
  factors.bmiAdjustment = bmiAdj
  if (highBmi) reasons.push('high_bmi')

  const rawProduct = trendFactor * sleepPen * shiftAdj * bmiAdj
  factors.rawProduct = Math.round(rawProduct * 10000) / 10000

  let adapted = Math.round(baseline * trendFactor * sleepPen * shiftAdj * bmiAdj)

  const lo30 = Math.round(baseline * 0.7)
  const hi30 = Math.round(baseline * 1.3)
  adapted = clamp(adapted, lo30, hi30)

  const { hardGoalMin, hardGoalMax } = input.preferences
  if (hardGoalMin != null && Number.isFinite(hardGoalMin)) {
    adapted = Math.max(adapted, Math.round(hardGoalMin))
    factors.hardGoalMin = hardGoalMin
  }
  if (hardGoalMax != null && Number.isFinite(hardGoalMax)) {
    adapted = Math.min(adapted, Math.round(hardGoalMax))
    factors.hardGoalMax = hardGoalMax
  }

  adapted = Math.max(1000, adapted)

  // Standard time-based debounce (non-sleep-window path).
  // Only holds if the last adaptation was < 12 h ago AND the change is < 5%.
  const lastAt = input.lastAdaptedAt
  if (
    lastAt &&
    lastGoal != null &&
    Number.isFinite(lastGoal) &&
    lastGoal >= 1000 &&
    adapted !== lastGoal
  ) {
    const lastMs = Date.parse(lastAt)
    const nowMs = Date.parse(computedAt)
    if (!Number.isNaN(lastMs) && !Number.isNaN(nowMs)) {
      const hours = (nowMs - lastMs) / (60 * 60 * 1000)
      if (hours >= 0 && hours < 12) {
        const pct = Math.abs(adapted - lastGoal) / lastGoal
        if (pct < 0.05) {
          adapted = Math.round(lastGoal)
          factors.debounceHeld = 1
          if (!reasons.includes('maintenance')) reasons.push('maintenance')
        }
      }
    }
  }

  const uniqueReasons = [...new Set(reasons)]
  if (uniqueReasons.length === 0) uniqueReasons.push('maintenance')

  return {
    userId: input.userId,
    adaptedStepGoal: adapted,
    activityPersonalization: {
      reasons: uniqueReasons,
      factors,
      computedAt,
      explanation: buildExplanation(uniqueReasons),
    },
  }
}
