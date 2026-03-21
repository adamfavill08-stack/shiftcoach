export type ShiftType = 'day' | 'night' | 'late' | 'off'

export function getStepRecommendation(opts: {
  shiftType: ShiftType
  lastMainSleepHours: number | null // e.g. 5.8
  recoveryScore?: number | null // 0–100, optional
}) {
  const { shiftType, lastMainSleepHours, recoveryScore } = opts

  // Base ranges
  let min = 8000
  let max = 10000
  let reason = 'Balanced activity for recovery and energy.'

  const sleep = lastMainSleepHours ?? 7

  // Adjust for sleep
  if (sleep < 5.5) {
    min -= 2000
    max -= 2000
    reason = 'Short sleep last night – focus on gentle movement, not chasing huge numbers.'
  } else if (sleep < 6.5) {
    min -= 1000
    max -= 1000
    reason = 'Slightly reduced sleep – aim for a solid but realistic target.'
  } else if (sleep > 8) {
    min += 500
    max += 500
    reason = 'Plenty of sleep – it\'s a good day to bank some extra steps if you feel up to it.'
  }

  // Adjust for shift type
  if (shiftType === 'night') {
    min -= 1000
    max -= 1000
    if (sleep < 6.5) {
      reason =
        'Night shift plus short sleep – keep steps modest and protect your recovery window.'
    } else {
      reason =
        'Night shift today – aim for steady movement but save energy for the hours when you need it most.'
    }
  } else if (shiftType === 'off') {
    min += 500
    max += 500
    reason =
      'Off shift – a good chance for a little more movement, as long as you feel rested.'
  }

  // Adjust for recovery score if available
  if (typeof recoveryScore === 'number') {
    if (recoveryScore < 40) {
      min -= 1500
      max -= 1500
      reason =
        'Recovery is low – today is about gentle activity and rest, not pushing hard.'
    } else if (recoveryScore > 75) {
      min += 500
      max += 500
      reason =
        'Recovery looks good – you can stretch your step goal slightly if it feels right.'
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
    reason,
  }
}

