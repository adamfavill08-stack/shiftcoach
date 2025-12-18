/**
 * Calculate a composite sleep quality score (0-100) based on multiple factors
 * Designed for shift workers with context-aware scoring
 */

export type SleepQualityInputs = {
  durationMinutes: number // Total time in bed
  timeAsleepMinutes?: number // Actual time asleep (optional, will calculate from awake if not provided)
  awakePercent?: number // Percentage of time awake (0-100)
  quality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | number | null // User's quality rating
  deepPercent?: number // Deep sleep percentage
  remPercent?: number // REM sleep percentage
  isDaySleep?: boolean // True if this is daytime sleep (for shift workers)
  sleepGoalHours?: number // User's sleep goal (default 8h)
}

export type SleepQualityResult = {
  score: number // 0-100 composite score
  qualityRating: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  efficiency: number // Sleep efficiency percentage
  durationScore: number // Duration component score (0-100)
  stagesScore: number // Sleep stages component score (0-100)
  factors: {
    qualityWeight: number
    efficiencyWeight: number
    durationWeight: number
    stagesWeight: number
  }
}

/**
 * Calculate composite sleep quality score
 */
export function calculateSleepQuality(inputs: SleepQualityInputs): SleepQualityResult {
  const {
    durationMinutes,
    timeAsleepMinutes,
    awakePercent = 0,
    quality = 'Fair',
    deepPercent = 0,
    remPercent = 0,
    isDaySleep = false,
    sleepGoalHours = 8,
  } = inputs

  // Calculate time asleep if not provided
  const timeAsleep = timeAsleepMinutes ?? Math.round(durationMinutes * (1 - awakePercent / 100))

  // Calculate efficiency (0-100)
  const efficiency = durationMinutes > 0 
    ? Math.round((timeAsleep / durationMinutes) * 100) 
    : 0

  // Clamp efficiency to valid range
  const clampedEfficiency = Math.max(0, Math.min(100, efficiency))

  // 1. QUALITY RATING SCORE (0-100, 40% weight)
  const qualityScore = (() => {
    if (typeof quality === 'number') {
      // Convert 1-5 scale to 0-100
      return ((quality - 1) / 4) * 100 // 1→0, 2→25, 3→50, 4→75, 5→100
    }
    switch (quality) {
      case 'Excellent': return 100
      case 'Good': return 75
      case 'Fair': return 50
      case 'Poor': return 25
      default: return 50
    }
  })()

  // 2. EFFICIENCY SCORE (0-100, 30% weight)
  // Direct use of efficiency percentage
  const efficiencyScore = clampedEfficiency

  // 3. DURATION SCORE (0-100, 20% weight)
  // Optimal: 7-9 hours, good: 6-7 or 9-10, fair: 5-6 or 10-11, poor: <5 or >11
  const durationHours = durationMinutes / 60
  const durationScore = (() => {
    if (durationHours >= 7 && durationHours <= 9) {
      // Optimal range
      return 100
    } else if (durationHours >= 6 && durationHours < 7) {
      // Good (slightly short)
      return 80
    } else if (durationHours > 9 && durationHours <= 10) {
      // Good (slightly long)
      return 80
    } else if (durationHours >= 5 && durationHours < 6) {
      // Fair (short)
      return 60
    } else if (durationHours > 10 && durationHours <= 11) {
      // Fair (long)
      return 60
    } else if (durationHours >= 4 && durationHours < 5) {
      // Poor (very short)
      return 40
    } else if (durationHours > 11 && durationHours <= 12) {
      // Poor (very long)
      return 40
    } else if (durationHours < 4) {
      // Very poor (extremely short)
      return 20
    } else {
      // Extremely long (>12h)
      return 20
    }
  })()

  // 4. SLEEP STAGES SCORE (0-100, 10% weight)
  // Optimal: Deep 15-20%, REM 20-25% (total 35-45%)
  // Good: Deep 12-25%, REM 18-30% (total 30-55%)
  // Fair: Deep 10-30%, REM 15-35% (total 25-65%)
  // Poor: Outside these ranges
  const totalRestorativeSleep = (deepPercent || 0) + (remPercent || 0)
  const stagesScore = (() => {
    if (totalRestorativeSleep >= 35 && totalRestorativeSleep <= 45) {
      // Optimal
      return 100
    } else if (totalRestorativeSleep >= 30 && totalRestorativeSleep < 35) {
      // Good (slightly low)
      return 85
    } else if (totalRestorativeSleep > 45 && totalRestorativeSleep <= 55) {
      // Good (slightly high)
      return 85
    } else if (totalRestorativeSleep >= 25 && totalRestorativeSleep < 30) {
      // Fair (low)
      return 65
    } else if (totalRestorativeSleep > 55 && totalRestorativeSleep <= 65) {
      // Fair (high)
      return 65
    } else if (totalRestorativeSleep >= 20 && totalRestorativeSleep < 25) {
      // Poor (very low)
      return 40
    } else if (totalRestorativeSleep > 65 && totalRestorativeSleep <= 75) {
      // Poor (very high)
      return 40
    } else {
      // Very poor (extremely low or high)
      return 20
    }
  })()

  // Calculate weighted composite score
  const weights = {
    qualityWeight: 0.40, // 40%
    efficiencyWeight: 0.30, // 30%
    durationWeight: 0.20, // 20%
    stagesWeight: 0.10, // 10%
  }

  const compositeScore = Math.round(
    qualityScore * weights.qualityWeight +
    efficiencyScore * weights.efficiencyWeight +
    durationScore * weights.durationWeight +
    stagesScore * weights.stagesWeight
  )

  // Clamp to 0-100
  const finalScore = Math.max(0, Math.min(100, compositeScore))

  // Determine quality rating label
  const qualityRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' = (() => {
    if (finalScore >= 80) return 'Excellent'
    if (finalScore >= 60) return 'Good'
    if (finalScore >= 40) return 'Fair'
    return 'Poor'
  })()

  return {
    score: finalScore,
    qualityRating,
    efficiency: clampedEfficiency,
    durationScore,
    stagesScore,
    factors: weights,
  }
}

