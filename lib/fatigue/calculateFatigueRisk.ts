import type { FatigueShiftGuidance } from '@/lib/shift-context/types'

export type { FatigueShiftGuidance }

export type FatigueRiskLevel = 'low' | 'moderate' | 'high'
export type FatigueConfidenceLabel = 'low' | 'medium' | 'high'

export type FatigueRiskResult = {
  score: number
  level: FatigueRiskLevel
  drivers: string[]
  explanation: string
  confidence: number
  confidenceLabel: FatigueConfidenceLabel
}

type FatigueSleepLog = {
  durationHours: number
  quality?: number | null
  end?: string
  start?: string
}

type FatigueShift = {
  type: 'night' | 'day' | 'off' | 'morning' | 'afternoon'
}

type FatigueSocialJetlag = {
  currentMisalignmentHours: number
  weeklyAverageMisalignmentHours?: number
  category?: 'low' | 'moderate' | 'high'
} | null

export type CalculateFatigueRiskInputs = {
  sleepLogs: FatigueSleepLog[]
  shifts: readonly FatigueShift[]
  weeklySleepDebtHours?: number
  socialJetlag?: FatigueSocialJetlag
  now: Date
  restingHeartRateDeltaBpm?: number | null
  hrvSuppressionPct?: number | null
  /** When set, blends biology with upcoming / primary operational shift (from shift-context resolver). */
  shiftGuidance?: FatigueShiftGuidance | null
}

type Contribution = {
  key: 'sleep' | 'circadian' | 'sequence' | 'recovery' | 'physiology' | 'timeWindow' | 'shiftDemand'
  points: number
  driver?: string
}

type RecoveryPhase = 'active_strain' | 'post_shift_recovery' | 'incomplete_recovery' | 'recovered'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function confidenceLabelFrom(value: number): FatigueConfidenceLabel {
  if (value >= 0.75) return 'high'
  if (value >= 0.45) return 'medium'
  return 'low'
}

function scoreToLevel(score: number): FatigueRiskLevel {
  if (score >= 65) return 'high'
  if (score >= 30) return 'moderate'
  return 'low'
}

function calculateSleepContribution(sleepLogs: FatigueSleepLog[], weeklyDebtHours: number): Contribution {
  const lastSleep = sleepLogs[0]?.durationHours ?? 0
  const avgRecentSleep =
    sleepLogs.length > 0
      ? sleepLogs.slice(0, 3).reduce((sum, s) => sum + Math.max(0, s.durationHours || 0), 0) / Math.min(3, sleepLogs.length)
      : 0

  let points = 0
  if (lastSleep < 4) points += 15
  else if (lastSleep < 5) points += 11
  else if (lastSleep < 6) points += 8
  else if (lastSleep < 7) points += 4

  if (avgRecentSleep < 5.5) points += 7
  else if (avgRecentSleep < 6.5) points += 4

  if (weeklyDebtHours > 12) points += 10
  else if (weeklyDebtHours > 8) points += 8
  else if (weeklyDebtHours > 4) points += 5
  else if (weeklyDebtHours > 2) points += 3

  points = clamp(points, 0, 35)
  if (points <= 0) return { key: 'sleep', points }
  if (weeklyDebtHours > 8) return { key: 'sleep', points, driver: `High sleep debt (${weeklyDebtHours.toFixed(1)}h)` }
  if (lastSleep < 6) return { key: 'sleep', points, driver: `Short recent sleep (${lastSleep.toFixed(1)}h)` }
  return { key: 'sleep', points, driver: 'Mild sleep debt is building' }
}

function calculateCircadianContribution(socialJetlag?: FatigueSocialJetlag): Contribution {
  const misalignment = Math.max(
    0,
    socialJetlag?.currentMisalignmentHours ?? socialJetlag?.weeklyAverageMisalignmentHours ?? 0,
  )
  let points = 0
  if (misalignment >= 4.5) points = 18
  else if (misalignment >= 3.5) points = 14
  else if (misalignment >= 2.5) points = 11
  else if (misalignment >= 1.5) points = 7
  else if (misalignment >= 0.75) points = 4

  if (points <= 0) return { key: 'circadian', points }
  return { key: 'circadian', points, driver: `Body clock misalignment (${misalignment.toFixed(1)}h)` }
}

function countConsecutiveNights(shifts: readonly FatigueShift[]): number {
  let streak = 0
  for (const s of shifts) {
    if (s.type === 'night') streak += 1
    else break
  }
  return streak
}

function calculateShiftSequenceContribution(
  shifts: readonly FatigueShift[],
  sleepLogs: FatigueSleepLog[],
): Contribution {
  if (shifts.length === 0) return { key: 'sequence', points: 0 }
  const recent = shifts.slice(0, 7)
  const consecutiveNights = countConsecutiveNights(recent)
  const workedStreak = recent.filter((s) => s.type !== 'off').length
  const shortSleep = sleepLogs.slice(0, 2).some((s) => (s.durationHours ?? 0) < 6)
  const lastShift = recent[0]?.type
  const secondShift = recent[1]?.type
  let points = 0
  let driver = 'Recent shift load is elevating fatigue'

  if (consecutiveNights >= 3) {
    points += 13
    driver = 'Three or more consecutive night shifts'
  } else if (consecutiveNights === 2) {
    points += 8
    driver = 'Back-to-back night shifts'
  } else if (consecutiveNights === 1) {
    points += 4
    driver = 'Current night-shift strain'
  }

  // Quick return / late-to-early proxy from ordered shift labels.
  if (
    (lastShift === 'morning' && (secondShift === 'night' || secondShift === 'afternoon')) ||
    ((lastShift === 'night' || lastShift === 'afternoon') && secondShift === 'morning')
  ) {
    points += 5
    if (driver === 'Recent shift load is elevating fatigue') {
      driver = 'Late-to-early shift transition'
    }
  }

  if (lastShift === 'night' && shortSleep) {
    points += 6
    driver = 'Night shift followed by short sleep'
  }

  if (workedStreak >= 5) {
    points += 3
    if (driver === 'Recent shift load is elevating fatigue') {
      driver = 'Stacked working days without recovery'
    }
  }

  points = clamp(points, 0, 20)
  if (points <= 0) return { key: 'sequence', points }
  return { key: 'sequence', points, driver }
}

function calculateRecoveryContribution(sleepLogs: FatigueSleepLog[]): Contribution {
  if (sleepLogs.length === 0) return { key: 'recovery', points: 0 }
  const qualityLogs = sleepLogs.filter((s) => typeof s.quality === 'number')
  if (qualityLogs.length === 0) return { key: 'recovery', points: 0 }
  const avgQuality = qualityLogs.reduce((sum, s) => sum + Number(s.quality || 0), 0) / qualityLogs.length
  let points = 0
  if (avgQuality < 2.3) points = 10
  else if (avgQuality < 2.8) points = 7
  else if (avgQuality < 3.3) points = 4
  else if (avgQuality < 3.8) points = 2

  if (points <= 0) return { key: 'recovery', points }
  return { key: 'recovery', points, driver: 'Sleep quality indicates reduced recovery' }
}

function calculatePhysiologyContribution(inputs: CalculateFatigueRiskInputs): Contribution {
  const rhrDelta = inputs.restingHeartRateDeltaBpm ?? null
  const hrvSuppression = inputs.hrvSuppressionPct ?? null
  let points = 0

  if (rhrDelta !== null) {
    if (rhrDelta >= 10) points += 6
    else if (rhrDelta >= 6) points += 4
    else if (rhrDelta >= 3) points += 2
  }

  if (hrvSuppression !== null) {
    if (hrvSuppression >= 25) points += 6
    else if (hrvSuppression >= 15) points += 4
    else if (hrvSuppression >= 8) points += 2
  }

  points = clamp(points, 0, 10)
  if (points <= 0) return { key: 'physiology', points }
  return { key: 'physiology', points, driver: 'Physiology suggests elevated strain' }
}

function circadianNightStressContext(
  shiftGuidance: FatigueShiftGuidance | null | undefined,
  shifts: readonly FatigueShift[],
): boolean {
  if (shiftGuidance) {
    if (shiftGuidance.focusKind === 'night') return true
    const gm = shiftGuidance.guidanceMode
    if (gm === 'night_shift' || gm === 'pre_night_shift' || gm === 'transition_day_to_night')
      return true
    if (gm === 'recovery_after_night') return true
  }
  const currentShift = shifts[0]?.type
  const previousShift = shifts[1]?.type
  return currentShift === 'night' || previousShift === 'night'
}

function calculateShiftDemandContribution(
  shiftGuidance: FatigueShiftGuidance | null | undefined,
  sleepLogs: FatigueSleepLog[],
): Contribution {
  if (!shiftGuidance) return { key: 'shiftDemand', points: 0 }
  const lastSleep = sleepLogs[0]?.durationHours ?? 0
  const gm = shiftGuidance.guidanceMode
  const ts = shiftGuidance.transitionState
  let points = 0
  let driver: string | undefined

  if (
    (gm === 'pre_night_shift' || gm === 'transition_day_to_night') &&
    lastSleep > 0 &&
    lastSleep < 6
  ) {
    points = 8
    driver = 'Limited sleep before an upcoming night shift'
  } else if (
    gm === 'day_shift' &&
    ts === 'night_to_day' &&
    lastSleep > 0 &&
    lastSleep < 5.5
  ) {
    points = 5
    driver = 'Switching back to days with a thin sleep buffer'
  } else if (gm === 'night_shift' && lastSleep > 0 && lastSleep < 5.5) {
    points = 6
    driver = 'Short sleep while currently on nights'
  }

  points = clamp(points, 0, 12)
  if (points <= 0) return { key: 'shiftDemand', points: 0 }
  return { key: 'shiftDemand', points, driver }
}

function calculateTimeWindowContribution(
  now: Date,
  shifts: readonly FatigueShift[],
  shiftGuidance?: FatigueShiftGuidance | null,
): Contribution {
  const hour = now.getHours() + now.getMinutes() / 60
  const onNightContext = circadianNightStressContext(shiftGuidance, shifts)

  let points = 0
  // Circadian trough penalty.
  if (hour >= 2 && hour < 6) points += onNightContext ? 14 : 10
  else if ((hour >= 0 && hour < 2) || (hour >= 6 && hour < 8)) points += onNightContext ? 9 : 6
  else if (hour >= 20 || hour < 0.5) points += onNightContext ? 6 : 3
  // Day-aligned wake window gets relief.
  else if (hour >= 10 && hour < 16) points -= 4
  else if (hour >= 8 && hour < 18) points -= 2

  points = clamp(points, 0, 15)
  if (points <= 0) return { key: 'timeWindow', points: 0 }
  return {
    key: 'timeWindow',
    points,
    driver: onNightContext ? 'Biologically adverse shift timing' : 'Circadian low window',
  }
}

function effectiveOperationalShiftType(inputs: CalculateFatigueRiskInputs): FatigueShift['type'] {
  const fk = inputs.shiftGuidance?.focusKind
  if (fk === 'night') return 'night'
  if (fk === 'off' || fk === 'other' || fk == null) {
    return inputs.shifts[0]?.type ?? 'off'
  }
  return 'day'
}

function classifyRecoveryPhase(inputs: CalculateFatigueRiskInputs, scoreBeforePhase: number): RecoveryPhase {
  const lastSleep = inputs.sleepLogs[0]?.durationHours ?? 0
  const avg2 =
    inputs.sleepLogs.length > 0
      ? inputs.sleepLogs.slice(0, 2).reduce((sum, s) => sum + Math.max(0, s.durationHours || 0), 0) / Math.min(2, inputs.sleepLogs.length)
      : 0
  const debt = Math.max(0, inputs.weeklySleepDebtHours ?? 0)
  const latestShift = effectiveOperationalShiftType(inputs)

  if ((latestShift === 'night' && lastSleep < 6) || scoreBeforePhase >= 72) return 'active_strain'
  if (latestShift === 'night' && lastSleep >= 6.5) return 'post_shift_recovery'
  if (debt > 4 || avg2 < 6.5) return 'incomplete_recovery'
  return 'recovered'
}

function phaseAdjustment(phase: RecoveryPhase): number {
  if (phase === 'active_strain') return 6
  if (phase === 'post_shift_recovery') return 2
  if (phase === 'incomplete_recovery') return 6
  return -3
}

function calculateConfidence(inputs: CalculateFatigueRiskInputs): number {
  const sleepCoverage = clamp((inputs.sleepLogs?.length ?? 0) / 7, 0, 1)
  const shiftCoverage = clamp((inputs.shifts?.length ?? 0) / 7, 0, 1)
  const hasDebt = typeof inputs.weeklySleepDebtHours === 'number' ? 1 : 0
  const hasJetlag = inputs.socialJetlag ? 1 : 0
  const hasPhysio =
    inputs.restingHeartRateDeltaBpm !== null && inputs.restingHeartRateDeltaBpm !== undefined
      ? 1
      : inputs.hrvSuppressionPct !== null && inputs.hrvSuppressionPct !== undefined
        ? 1
        : 0
  const hasShiftGuidance = inputs.shiftGuidance ? 0.08 : 0

  return clamp(
    sleepCoverage * 0.42 +
      shiftCoverage * 0.25 +
      hasDebt * 0.15 +
      hasJetlag * 0.1 +
      hasPhysio * 0.05 +
      hasShiftGuidance,
    0,
    1,
  )
}

export function calculateFatigueRisk(inputs: CalculateFatigueRiskInputs): FatigueRiskResult {
  const weeklySleepDebtHours = Math.max(0, inputs.weeklySleepDebtHours ?? 0)
  const contributions: Contribution[] = [
    calculateSleepContribution(inputs.sleepLogs, weeklySleepDebtHours),
    calculateCircadianContribution(inputs.socialJetlag),
    calculateShiftSequenceContribution(inputs.shifts, inputs.sleepLogs),
    calculateRecoveryContribution(inputs.sleepLogs),
    calculatePhysiologyContribution(inputs),
    calculateShiftDemandContribution(inputs.shiftGuidance, inputs.sleepLogs),
    calculateTimeWindowContribution(inputs.now, inputs.shifts, inputs.shiftGuidance),
  ]

  const baseScore = contributions.reduce((sum, c) => sum + c.points, 0)
  const phase = classifyRecoveryPhase(inputs, baseScore)
  let score = clamp(Math.round(baseScore + phaseAdjustment(phase)), 0, 100)
  const confidence = calculateConfidence(inputs)
  const confidenceLabel = confidenceLabelFrom(confidence)
  const severeSignals =
    contributions.filter((c) => c.points >= 10).length + (phase === 'active_strain' ? 1 : 0)

  // Avoid displaying absolute zero when we have decent coverage and stable signals.
  if (confidenceLabel !== 'low') {
    score = Math.max(8, score)
  }

  // Keep interpretation conservative when data confidence is low.
  if (confidenceLabel === 'low' && score > 64 && severeSignals < 2) {
    score = 64
  }

  const level = scoreToLevel(score)
  const drivers = contributions
    .filter((c): c is Required<Contribution> => Boolean(c.driver && c.points > 0))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((c) => c.driver)

  let explanation = ''
  if (confidenceLabel === 'low' && level !== 'high') {
    explanation =
      level === 'low'
        ? 'Low fatigue risk for now. Keep logging sleep and shifts to improve accuracy.'
        : 'Fatigue risk is trending up, but confidence is still building as more data syncs.'
  } else if (level === 'high') {
    explanation = 'High fatigue risk today. Prioritize recovery sleep, hydration and lower-intensity choices.'
  } else if (level === 'moderate') {
    explanation =
      phase === 'post_shift_recovery'
        ? 'Moderate fatigue risk in post-shift recovery. Keep sleep timing protected today.'
        : 'Moderate fatigue risk. Protect sleep timing and pace workload where possible.'
  } else {
    explanation =
      phase === 'recovered'
        ? 'Low fatigue risk. Your recent recovery pattern looks stable.'
        : 'Low fatigue risk right now, with mild residual fatigue to monitor.'
  }

  return {
    score,
    level,
    drivers,
    explanation,
    confidence: Number(confidence.toFixed(2)),
    confidenceLabel,
  }
}
