/**
 * Activity level utilities for shift workers
 * Maps shift-specific activity levels to calorie multipliers and other impacts
 */

export type ShiftActivityLevel = 'very_light' | 'light' | 'moderate' | 'busy' | 'intense'

export const ACTIVITY_LEVELS: Record<ShiftActivityLevel, { 
  label: string
  description: string
  factor: number
  calorieEstimate: (weightKg: number) => number
  bingeRiskScore: number
  recoveryHours: number
}> = {
  very_light: {
    label: 'Very Light',
    description: 'Mostly sitting, admin work, calm shift',
    factor: 1.0,
    calorieEstimate: (weight) => Math.round(weight * 22 * 0.0), // No additional calories
    bingeRiskScore: 0,
    recoveryHours: 7,
  },
  light: {
    label: 'Light',
    description: 'Some walking or movement, a few tasks',
    factor: 1.1,
    calorieEstimate: (weight) => Math.round(weight * 22 * 0.1), // +10% additional
    bingeRiskScore: 2,
    recoveryHours: 7,
  },
  moderate: {
    label: 'Moderate',
    description: 'On your feet most of the shift, steady pace',
    factor: 1.2,
    calorieEstimate: (weight) => Math.round(weight * 22 * 0.2), // +20% additional
    bingeRiskScore: 5,
    recoveryHours: 7.5,
  },
  busy: {
    label: 'Busy',
    description: 'Lots of walking, lifting, stocking, patient rounds',
    factor: 1.35,
    calorieEstimate: (weight) => Math.round(weight * 22 * 0.35), // +35% additional
    bingeRiskScore: 10,
    recoveryHours: 8,
  },
  intense: {
    label: 'Intense',
    description: 'Emergency pace, constant movement, high stress',
    factor: 1.5,
    calorieEstimate: (weight) => Math.round(weight * 22 * 0.5), // +50% additional
    bingeRiskScore: 15,
    recoveryHours: 8.5,
  },
}

/**
 * Get activity level details
 */
export function getActivityLevelDetails(level: ShiftActivityLevel | null | undefined) {
  if (!level) return null
  return ACTIVITY_LEVELS[level] || null
}

/**
 * Get activity factor for calorie calculations
 */
export function getActivityFactor(level: ShiftActivityLevel | null | undefined): number {
  if (!level) return 1.0
  return ACTIVITY_LEVELS[level]?.factor ?? 1.0
}

/**
 * Get estimated additional calories burned
 */
export function getEstimatedCaloriesBurned(
  level: ShiftActivityLevel | null | undefined,
  weightKg: number
): number {
  if (!level) return 0
  const details = ACTIVITY_LEVELS[level]
  return details ? details.calorieEstimate(weightKg) : 0
}

/**
 * Get binge risk score contribution from activity level
 */
export function getActivityBingeRiskScore(level: ShiftActivityLevel | null | undefined): number {
  if (!level) return 0
  return ACTIVITY_LEVELS[level]?.bingeRiskScore ?? 0
}

/**
 * Get recovery suggestion based on activity level
 */
export function getRecoverySuggestion(level: ShiftActivityLevel | null | undefined): string {
  if (!level) {
    return 'Maintain consistent sleep timing to support your body clock.'
  }

  const details = ACTIVITY_LEVELS[level]
  if (!details) return ''

  switch (level) {
    case 'intense':
      return `Aim for ${details.recoveryHours} hours of sleep after an intense shift. Your body needs extra recovery time.`
    case 'busy':
      return `Aim for ${details.recoveryHours} hours of sleep. Your body needs additional recovery after a busy shift.`
    case 'moderate':
      return `Aim for ${details.recoveryHours} hours of sleep to maintain your energy levels.`
    case 'light':
      return `Aim for ${details.recoveryHours} hours of sleep to support recovery.`
    case 'very_light':
      return `Aim for ${details.recoveryHours} hours of sleep. Lower activity may affect sleep quality, so consistency is key.`
    default:
      return 'Maintain consistent sleep timing to support your body clock.'
  }
}

/**
 * Get activity impact label for display
 */
export function getActivityImpactLabel(level: ShiftActivityLevel | null | undefined): string {
  if (!level) return 'Not set'
  
  switch (level) {
    case 'intense':
      return 'Very High'
    case 'busy':
      return 'High'
    case 'moderate':
      return 'Moderate'
    case 'light':
      return 'Low'
    case 'very_light':
      return 'Minimal'
    default:
      return 'Not set'
  }
}

