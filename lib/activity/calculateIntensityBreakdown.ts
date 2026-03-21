/**
 * Calculate intensity breakdown (light/moderate/vigorous minutes)
 * from shift activity level and steps data
 * 
 * This provides smart estimates for shift workers without wearables
 */

import type { ShiftActivityLevel } from './activityLevels'

export type IntensityBreakdown = {
  light: { minutes: number; target: number }
  moderate: { minutes: number; target: number }
  vigorous: { minutes: number; target: number }
  totalActiveMinutes: number
}

export type ShiftType = 'day' | 'night' | 'off' | 'other'

/**
 * Calculate shift-aware intensity targets based on shift type
 */
function getShiftAwareTargets(shiftType: ShiftType): {
  light: number
  moderate: number
  vigorous: number
} {
  // Shift workers need different targets based on their shift
  switch (shiftType) {
    case 'night':
      // Night shift: Lower targets, focus on recovery
      return {
        light: 8,
        moderate: 12,
        vigorous: 3,
      }
    case 'off':
      // Off day: Maintenance targets
      return {
        light: 10,
        moderate: 15,
        vigorous: 5,
      }
    case 'day':
    default:
      // Day shift: Standard targets
      return {
        light: 10,
        moderate: 15,
        vigorous: 5,
      }
  }
}

/**
 * Estimate intensity breakdown from shift activity level
 */
function estimateFromActivityLevel(
  level: ShiftActivityLevel | null,
  totalMinutes: number
): { light: number; moderate: number; vigorous: number } {
  if (!level || totalMinutes === 0) {
    return { light: 0, moderate: 0, vigorous: 0 }
  }

  // Distribute total minutes across intensities based on activity level
  switch (level) {
    case 'very_light':
      // Mostly light activity
      return {
        light: Math.round(totalMinutes * 0.9),
        moderate: Math.round(totalMinutes * 0.1),
        vigorous: 0,
      }
    case 'light':
      // Mostly light, some moderate
      return {
        light: Math.round(totalMinutes * 0.7),
        moderate: Math.round(totalMinutes * 0.3),
        vigorous: 0,
      }
    case 'moderate':
      // Mix of light and moderate
      return {
        light: Math.round(totalMinutes * 0.4),
        moderate: Math.round(totalMinutes * 0.6),
        vigorous: 0,
      }
    case 'busy':
      // Mostly moderate, some vigorous
      return {
        light: Math.round(totalMinutes * 0.2),
        moderate: Math.round(totalMinutes * 0.65),
        vigorous: Math.round(totalMinutes * 0.15),
      }
    case 'intense':
      // Mix of moderate and vigorous
      return {
        light: Math.round(totalMinutes * 0.1),
        moderate: Math.round(totalMinutes * 0.5),
        vigorous: Math.round(totalMinutes * 0.4),
      }
  }
}

/**
 * Refine estimates based on step count
 */
function refineWithSteps(
  steps: number,
  currentBreakdown: { light: number; moderate: number; vigorous: number },
  totalMinutes: number
): { light: number; moderate: number; vigorous: number } {
  // Steps per minute thresholds (rough estimates)
  const stepsPerMinute = totalMinutes > 0 ? steps / totalMinutes : 0

  // If steps suggest more activity, adjust breakdown
  if (stepsPerMinute > 100) {
    // High step rate - shift more to moderate/vigorous
    return {
      light: Math.max(0, Math.round(currentBreakdown.light * 0.7)),
      moderate: Math.round(
        currentBreakdown.moderate + currentBreakdown.light * 0.2
      ),
      vigorous: Math.round(
        currentBreakdown.vigorous + currentBreakdown.light * 0.1
      ),
    }
  } else if (stepsPerMinute < 30) {
    // Low step rate - shift more to light
    return {
      light: Math.round(
        currentBreakdown.light +
          currentBreakdown.moderate * 0.3 +
          currentBreakdown.vigorous * 0.2
      ),
      moderate: Math.round(currentBreakdown.moderate * 0.7),
      vigorous: Math.max(0, Math.round(currentBreakdown.vigorous * 0.8)),
    }
  }

  // Moderate step rate - keep current breakdown
  return currentBreakdown
}

/**
 * Estimate total active minutes from shift activity level
 */
function estimateTotalActiveMinutes(
  level: ShiftActivityLevel | null,
  steps: number,
  actualActiveMinutes: number | null
): number {
  // If we have actual active minutes, use them
  if (actualActiveMinutes !== null && actualActiveMinutes > 0) {
    return actualActiveMinutes
  }

  // Otherwise, estimate from activity level and steps
  if (!level) {
    // No activity level - estimate from steps only
    // Rough estimate: 1 active minute per 100 steps (very conservative)
    return Math.round(steps / 100)
  }

  // Estimate based on activity level
  // Shift workers typically have 6-12 hour shifts
  // Active minutes are a portion of that time
  const baseMinutes: Record<ShiftActivityLevel, number> = {
    very_light: 5, // Minimal activity
    light: 15, // Some movement
    moderate: 25, // Steady activity
    busy: 40, // High activity
    intense: 60, // Very high activity
  }

  let estimated = baseMinutes[level]

  // Adjust based on steps
  // More steps = more active minutes
  if (steps > 10000) {
    estimated = Math.round(estimated * 1.3) // 30% more
  } else if (steps > 7000) {
    estimated = Math.round(estimated * 1.15) // 15% more
  } else if (steps < 3000) {
    estimated = Math.round(estimated * 0.7) // 30% less
  }

  return Math.max(0, Math.min(estimated, 120)) // Cap at 120 minutes
}

/**
 * Main function to calculate intensity breakdown
 */
export function calculateIntensityBreakdown(
  shiftActivityLevel: ShiftActivityLevel | null,
  steps: number,
  actualActiveMinutes: number | null,
  shiftType: ShiftType = 'other'
): IntensityBreakdown {
  // Get shift-aware targets
  const targets = getShiftAwareTargets(shiftType)

  // Estimate total active minutes
  const totalActiveMinutes = estimateTotalActiveMinutes(
    shiftActivityLevel,
    steps,
    actualActiveMinutes
  )

  // If no active minutes, return zeros
  if (totalActiveMinutes === 0) {
    return {
      light: { minutes: 0, target: targets.light },
      moderate: { minutes: 0, target: targets.moderate },
      vigorous: { minutes: 0, target: targets.vigorous },
      totalActiveMinutes: 0,
    }
  }

  // Estimate breakdown from activity level
  let breakdown = estimateFromActivityLevel(shiftActivityLevel, totalActiveMinutes)

  // Refine with steps data
  breakdown = refineWithSteps(steps, breakdown, totalActiveMinutes)

  // Ensure breakdown sums to total (with small rounding tolerance)
  const sum = breakdown.light + breakdown.moderate + breakdown.vigorous
  if (sum !== totalActiveMinutes && sum > 0) {
    // Normalize to match total
    const factor = totalActiveMinutes / sum
    breakdown = {
      light: Math.round(breakdown.light * factor),
      moderate: Math.round(breakdown.moderate * factor),
      vigorous: Math.round(breakdown.vigorous * factor),
    }
  }

  return {
    light: { minutes: breakdown.light, target: targets.light },
    moderate: { minutes: breakdown.moderate, target: targets.moderate },
    vigorous: { minutes: breakdown.vigorous, target: targets.vigorous },
    totalActiveMinutes,
  }
}

