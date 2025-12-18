/**
 * AI-based Sleep Stage Prediction
 * Predicts sleep stages (Awake, REM, Light, Deep) based on:
 * - Total sleep duration
 * - Sleep timing (circadian alignment)
 * - Sleep quality
 * - Shift type
 * - Age (if available)
 */

export type SleepStageBreakdown = {
  awake: number    // minutes
  rem: number      // minutes
  light: number    // minutes
  deep: number     // minutes
}

export type SleepStageInput = {
  totalMinutes: number
  sleepStart: Date
  sleepEnd: Date
  quality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | string | null
  shiftType?: 'morning' | 'day' | 'evening' | 'night' | 'rotating' | null
  age?: number | null
  sleepDebtHours?: number
}

/**
 * Predict sleep stages based on sleep data
 * Uses scientific models of typical sleep architecture
 */
export function predictSleepStages(input: SleepStageInput): SleepStageBreakdown {
  const { totalMinutes, sleepStart, sleepEnd, quality, shiftType, age, sleepDebtHours } = input
  
  if (totalMinutes <= 0) {
    return { awake: 0, rem: 0, light: 0, deep: 0 }
  }

  // Base percentages for healthy adult sleep (7-8 hours)
  // These are typical distributions based on sleep research
  let basePercentages = {
    awake: 0.05,   // 5% awake (micro-awakenings)
    rem: 0.22,     // 22% REM
    light: 0.55,   // 55% Light (N1 + N2)
    deep: 0.18,    // 18% Deep (N3)
  }

  // Adjust based on total sleep duration
  // Shorter sleep = less deep sleep, more light sleep
  if (totalMinutes < 360) { // Less than 6 hours
    basePercentages.deep = Math.max(0.10, basePercentages.deep - 0.05)
    basePercentages.light = Math.min(0.65, basePercentages.light + 0.05)
    basePercentages.rem = Math.max(0.15, basePercentages.rem - 0.03)
  } else if (totalMinutes > 540) { // More than 9 hours
    basePercentages.deep = Math.min(0.22, basePercentages.deep + 0.02)
    basePercentages.rem = Math.min(0.25, basePercentages.rem + 0.02)
    basePercentages.light = Math.max(0.50, basePercentages.light - 0.04)
  }

  // Adjust based on sleep quality
  if (quality === 'Excellent') {
    basePercentages.awake = Math.max(0.02, basePercentages.awake - 0.02)
    basePercentages.deep = Math.min(0.25, basePercentages.deep + 0.04)
    basePercentages.rem = Math.min(0.25, basePercentages.rem + 0.01)
  } else if (quality === 'Good') {
    basePercentages.awake = Math.max(0.03, basePercentages.awake - 0.01)
    basePercentages.deep = Math.min(0.22, basePercentages.deep + 0.02)
  } else if (quality === 'Fair') {
    basePercentages.awake = Math.min(0.08, basePercentages.awake + 0.02)
    basePercentages.deep = Math.max(0.12, basePercentages.deep - 0.03)
  } else if (quality === 'Poor') {
    basePercentages.awake = Math.min(0.12, basePercentages.awake + 0.05)
    basePercentages.deep = Math.max(0.08, basePercentages.deep - 0.06)
    basePercentages.rem = Math.max(0.15, basePercentages.rem - 0.04)
  }

  // Adjust based on shift type (circadian misalignment)
  if (shiftType === 'night') {
    // Night shifts disrupt REM and deep sleep
    basePercentages.deep = Math.max(0.10, basePercentages.deep - 0.05)
    basePercentages.rem = Math.max(0.18, basePercentages.rem - 0.03)
    basePercentages.awake = Math.min(0.10, basePercentages.awake + 0.03)
    basePercentages.light = Math.min(0.65, basePercentages.light + 0.05)
  } else if (shiftType === 'rotating') {
    // Rotating shifts cause more disruption
    basePercentages.deep = Math.max(0.12, basePercentages.deep - 0.04)
    basePercentages.rem = Math.max(0.18, basePercentages.rem - 0.02)
    basePercentages.awake = Math.min(0.08, basePercentages.awake + 0.02)
  } else if (shiftType === 'morning') {
    // Morning shifts may have slightly less REM (earlier wake)
    basePercentages.rem = Math.max(0.20, basePercentages.rem - 0.02)
  }

  // Adjust based on age (older = less deep sleep)
  if (age) {
    if (age > 60) {
      basePercentages.deep = Math.max(0.08, basePercentages.deep - 0.06)
      basePercentages.light = Math.min(0.70, basePercentages.light + 0.06)
      basePercentages.awake = Math.min(0.10, basePercentages.awake + 0.03)
    } else if (age > 40) {
      basePercentages.deep = Math.max(0.12, basePercentages.deep - 0.03)
      basePercentages.light = Math.min(0.65, basePercentages.light + 0.03)
    }
  }

  // Adjust based on sleep debt (more debt = more deep sleep needed)
  if (sleepDebtHours && sleepDebtHours > 2) {
    // High sleep debt prioritizes deep sleep recovery
    basePercentages.deep = Math.min(0.25, basePercentages.deep + 0.04)
    basePercentages.rem = Math.max(0.18, basePercentages.rem - 0.02)
  }

  // Calculate circadian timing effect
  // REM is more common in later sleep cycles (toward morning)
  // Deep sleep is more common in earlier cycles (first 3 hours)
  const sleepMidpoint = (sleepStart.getTime() + sleepEnd.getTime()) / 2
  const midpointHour = new Date(sleepMidpoint).getHours()
  
  // If sleep is misaligned (midpoint far from 3 AM), reduce deep sleep
  const idealMidpoint = 3 // 3 AM is ideal
  const midpointOffset = Math.abs(midpointHour - idealMidpoint)
  if (midpointOffset > 4) {
    basePercentages.deep = Math.max(0.10, basePercentages.deep - 0.04)
    basePercentages.awake = Math.min(0.10, basePercentages.awake + 0.02)
  }

  // Normalize percentages to ensure they sum to 1.0
  const total = basePercentages.awake + basePercentages.rem + basePercentages.light + basePercentages.deep
  const normalize = (val: number) => val / total

  // Calculate minutes for each stage
  const awake = Math.round(totalMinutes * normalize(basePercentages.awake))
  const rem = Math.round(totalMinutes * normalize(basePercentages.rem))
  const light = Math.round(totalMinutes * normalize(basePercentages.light))
  const deep = Math.round(totalMinutes * normalize(basePercentages.deep))

  // Ensure total matches (rounding may cause small differences)
  const calculated = awake + rem + light + deep
  const diff = totalMinutes - calculated
  if (diff !== 0) {
    // Add difference to light sleep (most flexible stage)
    return {
      awake,
      rem,
      light: light + diff,
      deep,
    }
  }

  return { awake, rem, light, deep }
}

