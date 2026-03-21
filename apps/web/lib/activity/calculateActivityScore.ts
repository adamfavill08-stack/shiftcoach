/**
 * Calculate activity score for shift workers
 * Based on steps, active minutes, intensity breakdown, and shift context
 */

import type { IntensityBreakdown } from './calculateIntensityBreakdown'

export type ActivityScoreInputs = {
  // Steps data
  steps: number
  stepTarget: number
  
  // Active minutes
  activeMinutes: number | null
  activeMinutesTarget: number
  
  // Intensity breakdown
  intensityBreakdown: IntensityBreakdown
  
  // Shift context
  shiftType: 'day' | 'night' | 'off' | 'other'
  shiftActivityLevel?: 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null
}

/**
 * Calculate activity score (0-100)
 */
export function calculateActivityScore(inputs: ActivityScoreInputs): {
  score: number
  level: 'Low' | 'Low-Moderate' | 'Moderate' | 'High'
  description: string
} {
  const {
    steps,
    stepTarget,
    activeMinutes,
    activeMinutesTarget,
    intensityBreakdown,
    shiftType,
    shiftActivityLevel,
  } = inputs

  let score = 50 // Base score

  // 1. Steps progress (0-30 points)
  if (stepTarget > 0) {
    const stepRatio = steps / stepTarget
    if (stepRatio >= 1.0) {
      score += 30 // Met or exceeded target
    } else if (stepRatio >= 0.8) {
      score += 25 // Close to target
    } else if (stepRatio >= 0.6) {
      score += 20 // Good progress
    } else if (stepRatio >= 0.4) {
      score += 15 // Moderate progress
    } else if (stepRatio >= 0.2) {
      score += 10 // Some progress
    } else {
      score += 5 // Minimal progress
    }
  }

  // 2. Active minutes progress (0-25 points)
  if (activeMinutes !== null && activeMinutesTarget > 0) {
    const activeRatio = activeMinutes / activeMinutesTarget
    if (activeRatio >= 1.0) {
      score += 25
    } else if (activeRatio >= 0.8) {
      score += 20
    } else if (activeRatio >= 0.6) {
      score += 15
    } else if (activeRatio >= 0.4) {
      score += 10
    } else {
      score += 5
    }
  } else if (intensityBreakdown.totalActiveMinutes > 0) {
    // Use estimated active minutes from intensity breakdown
    const estimatedTarget = intensityBreakdown.light.target + 
                           intensityBreakdown.moderate.target + 
                           intensityBreakdown.vigorous.target
    const estimatedRatio = intensityBreakdown.totalActiveMinutes / estimatedTarget
    if (estimatedRatio >= 1.0) {
      score += 20
    } else if (estimatedRatio >= 0.7) {
      score += 15
    } else if (estimatedRatio >= 0.5) {
      score += 10
    } else {
      score += 5
    }
  }

  // 3. Intensity breakdown progress (0-25 points)
  const lightProgress = intensityBreakdown.light.target > 0 
    ? intensityBreakdown.light.minutes / intensityBreakdown.light.target 
    : 0
  const moderateProgress = intensityBreakdown.moderate.target > 0 
    ? intensityBreakdown.moderate.minutes / intensityBreakdown.moderate.target 
    : 0
  const vigorousProgress = intensityBreakdown.vigorous.target > 0 
    ? intensityBreakdown.vigorous.minutes / intensityBreakdown.vigorous.target 
    : 0
  
  const avgIntensityProgress = (lightProgress + moderateProgress + vigorousProgress) / 3
  
  if (avgIntensityProgress >= 0.8) {
    score += 25
  } else if (avgIntensityProgress >= 0.6) {
    score += 20
  } else if (avgIntensityProgress >= 0.4) {
    score += 15
  } else if (avgIntensityProgress >= 0.2) {
    score += 10
  } else {
    score += 5
  }

  // 4. Shift context adjustment (-10 to +10 points)
  if (shiftType === 'night') {
    // Night shifts: lower expectations, but still reward activity
    if (steps < stepTarget * 0.5) {
      score -= 5 // Very low for night shift
    } else if (steps >= stepTarget * 0.7) {
      score += 5 // Good for night shift
    }
  } else if (shiftType === 'off') {
    // Off days: can be more active
    if (steps >= stepTarget * 0.8) {
      score += 10 // Good use of off day
    }
  }

  // 5. Shift activity level adjustment (-5 to +10 points)
  if (shiftActivityLevel) {
    if (shiftActivityLevel === 'intense' || shiftActivityLevel === 'busy') {
      // High activity shift = more credit for activity
      score += 10
    } else if (shiftActivityLevel === 'very_light') {
      // Very light shift = should have more capacity for additional activity
      if (steps < stepTarget * 0.6) {
        score -= 5 // Could do more
      }
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)))

  // Determine level
  let level: 'Low' | 'Low-Moderate' | 'Moderate' | 'High'
  if (score >= 70) {
    level = 'High'
  } else if (score >= 50) {
    level = 'Moderate'
  } else if (score >= 30) {
    level = 'Low-Moderate'
  } else {
    level = 'Low'
  }

  // Generate description
  let description = ''
  if (level === 'High') {
    description = 'You\'ve been very active today. Great job maintaining movement throughout your shift. Keep it up!'
  } else if (level === 'Moderate') {
    if (steps < stepTarget * 0.7) {
      description = 'You\'ve accumulated a moderate amount of activity so far. There\'s still room for more movement if you feel up to it.'
    } else {
      description = 'Good activity level today. You\'re on track with your movement goals.'
    }
  } else if (level === 'Low-Moderate') {
    description = 'You\'ve accumulated a small amount of strain so far. Your body still has plenty of capacity left for movement or training.'
  } else {
    if (shiftType === 'night') {
      description = 'Low activity so far, which is normal for night shifts. Focus on gentle movement when possible.'
    } else {
      description = 'Activity is low today. Consider adding a short walk or light movement to boost your energy and health.'
    }
  }

  return {
    score,
    level,
    description,
  }
}

