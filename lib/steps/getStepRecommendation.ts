export type ShiftType = 'day' | 'night' | 'late' | 'off'

export type StepRecommendationReasonKey =
  | 'steps.rec.balanced'
  | 'steps.rec.shortSleep'
  | 'steps.rec.slightlyReducedSleep'
  | 'steps.rec.plentySleep'
  | 'steps.rec.nightShortSleep'
  | 'steps.rec.night'
  | 'steps.rec.dayOff'
  | 'steps.rec.lowRecovery'
  | 'steps.rec.goodRecovery'

export function getStepRecommendation(opts: {
  shiftType: ShiftType
  lastMainSleepHours: number | null // e.g. 5.8
  recoveryScore?: number | null // 0–100, optional
}) {
  const { shiftType, lastMainSleepHours, recoveryScore } = opts

  // Base ranges
  let min = 8000
  let max = 10000
  let reasonKey: StepRecommendationReasonKey = 'steps.rec.balanced'

  const sleep = lastMainSleepHours ?? 7

  // Adjust for sleep
  if (sleep < 5.5) {
    min -= 2000
    max -= 2000
    reasonKey = 'steps.rec.shortSleep'
  } else if (sleep < 6.5) {
    min -= 1000
    max -= 1000
    reasonKey = 'steps.rec.slightlyReducedSleep'
  } else if (sleep > 8) {
    min += 500
    max += 500
    reasonKey = 'steps.rec.plentySleep'
  }

  // Adjust for shift type
  if (shiftType === 'night') {
    min -= 1000
    max -= 1000
    if (sleep < 6.5) {
      reasonKey = 'steps.rec.nightShortSleep'
    } else {
      reasonKey = 'steps.rec.night'
    }
  } else if (shiftType === 'off') {
    min += 500
    max += 500
    reasonKey = 'steps.rec.dayOff'
  }

  // Adjust for recovery score if available
  if (typeof recoveryScore === 'number') {
    if (recoveryScore < 40) {
      min -= 1500
      max -= 1500
      reasonKey = 'steps.rec.lowRecovery'
    } else if (recoveryScore > 75) {
      min += 500
      max += 500
      reasonKey = 'steps.rec.goodRecovery'
    }
  }

  // Clamp to sensible range
  min = Math.max(4000, Math.round(min / 500) * 500)
  max = Math.max(min + 1000, Math.round(max / 500) * 500)

  const mid = Math.round((min + max) / 1000) * 1000

  return {
    min,
    max,
    suggested: mid,
    reasonKey,
  }
}
