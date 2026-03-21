/**
 * Calculate recovery score for shift workers
 * Based on sleep quality, duration, consistency, and shift pattern
 */

export type RecoveryScoreInputs = {
  // Last night's sleep
  lastSleepHours: number | null
  lastSleepQuality: number | null // 1-5 scale
  
  // Recent sleep pattern (last 3-7 days)
  recentSleepHours: number[] // Array of sleep hours for recent nights
  recentSleepQuality: (number | null)[] // Array of quality ratings
  
  // Shift context
  shiftType: 'day' | 'night' | 'off' | 'other'
  previousShiftType?: 'day' | 'night' | 'off' | 'other'
  
  // Sleep debt
  sleepDebtHours?: number
}

/**
 * Calculate recovery score (0-100)
 */
export function calculateRecoveryScore(inputs: RecoveryScoreInputs): {
  score: number
  level: 'Low' | 'Moderate' | 'High'
  description: string
} {
  const {
    lastSleepHours,
    lastSleepQuality,
    recentSleepHours,
    recentSleepQuality,
    shiftType,
    previousShiftType,
    sleepDebtHours = 0,
  } = inputs

  let score = 70 // Base score

  // 1. Last sleep duration (0-30 points)
  if (lastSleepHours !== null) {
    if (lastSleepHours >= 8) {
      score += 20
    } else if (lastSleepHours >= 7) {
      score += 15
    } else if (lastSleepHours >= 6) {
      score += 10
    } else if (lastSleepHours >= 5) {
      score += 5
    } else {
      score -= 10 // Very short sleep
    }
  }

  // 2. Last sleep quality (0-25 points)
  if (lastSleepQuality !== null) {
    const qualityScore = ((lastSleepQuality - 1) / 4) * 25 // Map 1-5 to 0-25
    score += qualityScore - 12.5 // Center around 0
  }

  // 3. Sleep consistency (0-20 points)
  if (recentSleepHours.length >= 3) {
    const avgSleep = recentSleepHours.reduce((a, b) => a + b, 0) / recentSleepHours.length
    const variance = recentSleepHours.reduce((sum, hours) => {
      return sum + Math.pow(hours - avgSleep, 2)
    }, 0) / recentSleepHours.length
    const stdDev = Math.sqrt(variance)
    
    // Lower variance = more consistent = higher score
    if (stdDev < 0.5) {
      score += 20 // Very consistent
    } else if (stdDev < 1.0) {
      score += 15 // Consistent
    } else if (stdDev < 1.5) {
      score += 10 // Moderately consistent
    } else {
      score += 5 // Inconsistent
    }
  }

  // 4. Quality consistency (0-15 points)
  const validQualities = recentSleepQuality.filter((q): q is number => q !== null)
  if (validQualities.length >= 2) {
    const avgQuality = validQualities.reduce((a, b) => a + b, 0) / validQualities.length
    const qualityVariance = validQualities.reduce((sum, q) => {
      return sum + Math.pow(q - avgQuality, 2)
    }, 0) / validQualities.length
    
    if (qualityVariance < 0.5) {
      score += 15 // Very consistent quality
    } else if (qualityVariance < 1.0) {
      score += 10 // Consistent quality
    } else {
      score += 5 // Variable quality
    }
  }

  // 5. Sleep debt penalty (0 to -20 points)
  if (sleepDebtHours > 0) {
    if (sleepDebtHours > 10) {
      score -= 20
    } else if (sleepDebtHours > 7) {
      score -= 15
    } else if (sleepDebtHours > 4) {
      score -= 10
    } else {
      score -= 5
    }
  }

  // 6. Shift pattern impact (0 to -15 points)
  if (previousShiftType === 'night' && shiftType === 'day') {
    // Quick turnaround from night to day
    score -= 10
  } else if (previousShiftType === 'night' && lastSleepHours !== null && lastSleepHours < 6) {
    // Post-night shift with poor sleep
    score -= 15
  } else if (shiftType === 'night' && lastSleepHours !== null && lastSleepHours < 7) {
    // Night shift with insufficient sleep
    score -= 10
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)))

  // Determine level
  let level: 'Low' | 'Moderate' | 'High'
  if (score >= 75) {
    level = 'High'
  } else if (score >= 50) {
    level = 'Moderate'
  } else {
    level = 'Low'
  }

  // Generate description
  let description = ''
  if (level === 'High') {
    if (lastSleepHours !== null && lastSleepHours >= 7.5 && lastSleepQuality !== null && lastSleepQuality >= 4) {
      description = 'Your body is well-rested and restored. Strong deep/REM balance and consistent sleep boosted your readiness today.'
    } else if (recentSleepHours.length >= 3) {
      const avg = recentSleepHours.reduce((a, b) => a + b, 0) / recentSleepHours.length
      if (avg >= 7) {
        description = 'Good recovery from consistent sleep. Your body has had time to restore and you\'re ready for activity.'
      } else {
        description = 'Recovery is improving. Focus on maintaining consistent sleep timing to optimize your readiness.'
      }
    } else {
      description = 'Recovery looks good. Keep prioritizing quality sleep to maintain your readiness.'
    }
  } else if (level === 'Moderate') {
    if (lastSleepHours !== null && lastSleepHours < 6.5) {
      description = 'Moderate recovery. Your sleep was shorter than ideal, so prioritize rest and gentle movement today.'
    } else if (sleepDebtHours > 3) {
      description = 'Moderate recovery with some sleep debt. Consider an earlier bedtime tonight to catch up on rest.'
    } else {
      description = 'Moderate recovery. Your body is managing, but focus on consistent sleep timing to improve readiness.'
    }
  } else {
    if (lastSleepHours !== null && lastSleepHours < 5) {
      description = 'Low recovery from very short sleep. Prioritize rest and avoid intense activity. Aim for an early bedtime.'
    } else if (sleepDebtHours > 7) {
      description = 'Low recovery due to accumulated sleep debt. Focus on rest and recovery. Consider adjusting your schedule.'
    } else {
      description = 'Recovery is low. Your body needs more rest. Prioritize sleep and gentle movement over intense activity.'
    }
  }

  return {
    score,
    level,
    description,
  }
}

