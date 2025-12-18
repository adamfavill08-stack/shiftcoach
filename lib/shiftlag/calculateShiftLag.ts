/**
 * ShiftLag Calculation Engine
 * 
 * Calculates a 0-100 score representing "jet lag" for shift workers based on:
 * 1. Sleep debt (0-40 points)
 * 2. Circadian misalignment (0-40 points) 
 * 3. Schedule instability (0-20 points)
 */

export type ShiftLagLevel = 'low' | 'moderate' | 'high'

export interface ShiftLagMetrics {
  score: number // 0-100
  level: ShiftLagLevel
  sleepDebtScore: number // 0-40
  misalignmentScore: number // 0-40
  instabilityScore: number // 0-20
  sleepDebtHours: number // Weekly sleep debt
  avgNightOverlapHours: number // Average hours of shift during biological night
  shiftStartVariabilityHours: number // Standard deviation of shift start times
  explanation: string
  drivers: {
    sleepDebt: string
    misalignment: string
    instability: string
  }
}

interface SleepDay {
  date: string // YYYY-MM-DD
  totalHours: number
}

interface ShiftDay {
  date: string // YYYY-MM-DD
  label: string // e.g., "NIGHT", "DAY", "OFF"
  start_ts: string | null
  end_ts: string | null
}

interface BiologicalNight {
  startHour: number // 0-23
  endHour: number // 0-23 (may wrap around)
}

/**
 * Calculate typical sleep need from off-days
 * Uses median of sleep on days with label "OFF" or no shift
 */
function calculateTypicalSleepNeed(
  sleepDays: SleepDay[],
  shiftDays: ShiftDay[]
): number {
  // Create set of work days (days with shifts that aren't OFF)
  const workDays = new Set<string>()
  for (const shift of shiftDays) {
    if (shift.label && shift.label !== 'OFF') {
      workDays.add(shift.date)
    }
  }

  // Get sleep on off-days only
  const offDaySleeps = sleepDays
    .filter(day => !workDays.has(day.date) && day.totalHours > 0)
    .map(day => day.totalHours)

  if (offDaySleeps.length === 0) {
    return 8.0 // Default fallback
  }

  // Calculate median
  offDaySleeps.sort((a, b) => a - b)
  const mid = Math.floor(offDaySleeps.length / 2)
  const median = offDaySleeps.length % 2 === 0
    ? (offDaySleeps[mid - 1] + offDaySleeps[mid]) / 2
    : offDaySleeps[mid]

  // Cap between 7-9 hours (reasonable range)
  return Math.max(7, Math.min(9, median))
}

/**
 * Calculate sleep debt score (0-40 points)
 */
function calculateSleepDebtScore(
  sleepDays: SleepDay[],
  typicalSleepNeed: number
): { score: number; debtHours: number } {
  // Calculate daily debt for last 7 days
  let weeklyDebt = 0

  for (const day of sleepDays) {
    const debt = Math.max(0, typicalSleepNeed - day.totalHours)
    weeklyDebt += debt
  }

  // Map to 0-40 points
  let score = 0
  if (weeklyDebt <= 3) {
    score = 0
  } else if (weeklyDebt <= 7) {
    // Linear interpolation: 3h -> 0, 7h -> 20
    score = ((weeklyDebt - 3) / 4) * 20
  } else if (weeklyDebt <= 14) {
    // Linear interpolation: 7h -> 20, 14h -> 35
    score = 20 + ((weeklyDebt - 7) / 7) * 15
  } else {
    score = 40
  }

  return {
    score: Math.round(score),
    debtHours: Math.round(weeklyDebt * 10) / 10, // Round to 1 decimal
  }
}

/**
 * Calculate hours of overlap between a shift and biological night
 */
function calculateShiftNightOverlap(
  shiftStart: Date,
  shiftEnd: Date,
  bioNight: BiologicalNight
): number {
  const startHour = shiftStart.getHours() + shiftStart.getMinutes() / 60
  const endHour = shiftEnd.getHours() + shiftEnd.getMinutes() / 60

  // Handle overnight shifts (end is next day)
  let actualEndHour = endHour
  if (endHour < startHour) {
    actualEndHour += 24
  }

  // Biological night window (e.g., 23:00 - 07:00 = 23 to 31)
  const nightStart = bioNight.startHour
  const nightEnd = bioNight.endHour < bioNight.startHour
    ? bioNight.endHour + 24
    : bioNight.endHour

  // Calculate overlap
  const shiftStartIn24 = startHour < nightStart ? startHour + 24 : startHour
  const shiftEndIn24 = actualEndHour < nightStart ? actualEndHour + 24 : actualEndHour

  const overlapStart = Math.max(shiftStartIn24, nightStart)
  const overlapEnd = Math.min(shiftEndIn24, nightEnd)

  if (overlapStart >= overlapEnd) {
    return 0
  }

  return overlapEnd - overlapStart
}

/**
 * Calculate circadian misalignment score (0-40 points)
 */
function calculateMisalignmentScore(
  shiftDays: ShiftDay[],
  bioNight: BiologicalNight
): { score: number; avgOverlapHours: number } {
  // Get workdays (non-OFF shifts) from last 3-5 days
  const workShifts = shiftDays
    .filter(s => s.label && s.label !== 'OFF' && s.start_ts && s.end_ts)
    .slice(-5) // Last 5 workdays

  if (workShifts.length === 0) {
    return { score: 0, avgOverlapHours: 0 }
  }

  // Calculate overlap for each shift
  const overlaps: number[] = []
  for (const shift of workShifts) {
    if (!shift.start_ts || !shift.end_ts) continue

    const start = new Date(shift.start_ts)
    const end = new Date(shift.end_ts)
    const overlap = calculateShiftNightOverlap(start, end, bioNight)
    overlaps.push(overlap)
  }

  if (overlaps.length === 0) {
    return { score: 0, avgOverlapHours: 0 }
  }

  const avgOverlap = overlaps.reduce((sum, o) => sum + o, 0) / overlaps.length

  // Map to 0-40 points
  let score = 0
  if (avgOverlap <= 2) {
    score = 5
  } else if (avgOverlap <= 4) {
    // Linear: 2h -> 5, 4h -> 15
    score = 5 + ((avgOverlap - 2) / 2) * 10
  } else if (avgOverlap <= 6) {
    // Linear: 4h -> 15, 6h -> 25
    score = 15 + ((avgOverlap - 4) / 2) * 10
  } else if (avgOverlap <= 8) {
    // Linear: 6h -> 25, 8h -> 35
    score = 25 + ((avgOverlap - 6) / 2) * 10
  } else {
    score = 40
  }

  return {
    score: Math.round(score),
    avgOverlapHours: Math.round(avgOverlap * 10) / 10,
  }
}

/**
 * Estimate start time from shift label if start_ts is not available
 */
function estimateStartTimeFromLabel(label: string): number | null {
  const lower = label.toLowerCase()
  // Typical shift start times based on label
  if (lower.includes('night')) return 22 * 60 // 22:00
  if (lower.includes('morning') || lower.includes('early')) return 6 * 60 // 06:00
  if (lower.includes('day')) return 8 * 60 // 08:00
  if (lower.includes('afternoon') || lower.includes('late')) return 14 * 60 // 14:00
  if (lower.includes('evening')) return 16 * 60 // 16:00
  return null
}

/**
 * Calculate schedule instability score (0-20 points)
 */
function calculateInstabilityScore(
  shiftDays: ShiftDay[]
): { score: number; variabilityHours: number } {
  // Get shifts with start times from last 7-14 days
  // Include shifts that have start_ts OR can estimate from label
  const shiftsWithTimes = shiftDays
    .filter(s => {
      if (!s.label || s.label === 'OFF') return false
      // Include if has start_ts OR can estimate from label
      return s.start_ts || estimateStartTimeFromLabel(s.label) !== null
    })
    .slice(-14) // Last 14 days

  if (shiftsWithTimes.length < 2) {
    return { score: 0, variabilityHours: 0 }
  }

  // Convert start times to minutes since midnight
  const startMinutes: number[] = []
  for (const shift of shiftsWithTimes) {
    let minutes: number | null = null
    
    if (shift.start_ts) {
      // Use actual start time
      const date = new Date(shift.start_ts)
      minutes = date.getHours() * 60 + date.getMinutes()
    } else if (shift.label) {
      // Estimate from label
      minutes = estimateStartTimeFromLabel(shift.label)
    }
    
    if (minutes !== null) {
      startMinutes.push(minutes)
    }
  }

  if (startMinutes.length < 2) {
    return { score: 0, variabilityHours: 0 }
  }

  // Calculate standard deviation
  const mean = startMinutes.reduce((sum, m) => sum + m, 0) / startMinutes.length
  const variance = startMinutes.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / startMinutes.length
  const stdDev = Math.sqrt(variance)
  const stdDevHours = stdDev / 60

  // Map to 0-20 points
  let score = 0
  if (stdDevHours < 2) {
    score = 0
  } else if (stdDevHours < 4) {
    // Linear: 2h -> 0, 4h -> 5
    score = ((stdDevHours - 2) / 2) * 5
  } else if (stdDevHours < 6) {
    // Linear: 4h -> 5, 6h -> 10
    score = 5 + ((stdDevHours - 4) / 2) * 5
  } else if (stdDevHours < 8) {
    // Linear: 6h -> 10, 8h -> 15
    score = 10 + ((stdDevHours - 6) / 2) * 5
  } else {
    score = 20
  }

  return {
    score: Math.round(score),
    variabilityHours: Math.round(stdDevHours * 10) / 10,
  }
}

/**
 * Get biological night window from circadian data or use default
 */
function getBiologicalNight(
  circadianMidpoint?: number // minutes from midnight (0-1440)
): BiologicalNight {
  if (circadianMidpoint !== undefined) {
    // Use circadian midpoint to estimate biological night
    // Typical biological night is ~8 hours centered around midpoint
    // For midpoint at 03:00, night is roughly 23:00 - 07:00
    const midpointHour = circadianMidpoint / 60
    const nightStart = (midpointHour - 4 + 24) % 24 // 4 hours before midpoint
    const nightEnd = (midpointHour + 4) % 24 // 4 hours after midpoint
    return {
      startHour: Math.round(nightStart),
      endHour: Math.round(nightEnd),
    }
  }

  // Default: 23:00 - 07:00 (typical for day workers)
  return {
    startHour: 23,
    endHour: 7,
  }
}

/**
 * Generate explanation text based on score and drivers
 */
function generateExplanation(
  level: ShiftLagLevel,
  score: number,
  debtHours: number,
  avgOverlap: number,
  variability: number
): string {
  if (level === 'low') {
    return 'Your body clock is coping well with your current schedule.'
  } else if (level === 'moderate') {
    return 'You\'re carrying some shift lag from your recent shifts.'
  } else {
    return 'Your body clock is out of sync due to recent night shifts and sleep debt.'
  }
}

/**
 * Generate driver descriptions
 */
function generateDrivers(
  debtHours: number,
  avgOverlap: number,
  variability: number
): { sleepDebt: string; misalignment: string; instability: string } {
  return {
    sleepDebt: debtHours > 0
      ? `Sleep debt (7 days): ${debtHours.toFixed(1)}h`
      : 'Sleep debt (7 days): None',
    misalignment: avgOverlap > 0
      ? `Night work during biological night: ${avgOverlap.toFixed(1)}h/shift`
      : 'Night work during biological night: Minimal',
    instability: variability > 0
      ? `Shift start variation: ${variability.toFixed(1)}h`
      : 'Shift start variation: Low',
  }
}

/**
 * Main ShiftLag calculation function
 */
export function calculateShiftLag(
  sleepDays: SleepDay[],
  shiftDays: ShiftDay[],
  circadianMidpoint?: number
): ShiftLagMetrics {
  // Need at least some data
  if (sleepDays.length === 0 && shiftDays.length === 0) {
    return {
      score: 0,
      level: 'low',
      sleepDebtScore: 0,
      misalignmentScore: 0,
      instabilityScore: 0,
      sleepDebtHours: 0,
      avgNightOverlapHours: 0,
      shiftStartVariabilityHours: 0,
      explanation: 'Track a few days of sleep and shifts to unlock your ShiftLag score.',
      drivers: {
        sleepDebt: 'No data',
        misalignment: 'No data',
        instability: 'No data',
      },
    }
  }

  // Calculate typical sleep need
  const typicalSleepNeed = calculateTypicalSleepNeed(sleepDays, shiftDays)

  // Calculate sleep debt score
  const { score: sleepDebtScore, debtHours } = calculateSleepDebtScore(
    sleepDays,
    typicalSleepNeed
  )

  // Get biological night window
  const bioNight = getBiologicalNight(circadianMidpoint)

  // Calculate misalignment score
  const { score: misalignmentScore, avgOverlapHours } = calculateMisalignmentScore(
    shiftDays,
    bioNight
  )

  // Calculate instability score
  const { score: instabilityScore, variabilityHours } = calculateInstabilityScore(
    shiftDays
  )

  // Calculate total score (0-100)
  const totalScore = Math.max(0, Math.min(100, sleepDebtScore + misalignmentScore + instabilityScore))

  // Determine level
  let level: ShiftLagLevel
  if (totalScore <= 20) {
    level = 'low'
  } else if (totalScore <= 50) {
    level = 'moderate'
  } else {
    level = 'high'
  }

  // Generate explanation and drivers
  const explanation = generateExplanation(level, totalScore, debtHours, avgOverlapHours, variabilityHours)
  const drivers = generateDrivers(debtHours, avgOverlapHours, variabilityHours)

  return {
    score: Math.round(totalScore),
    level,
    sleepDebtScore,
    misalignmentScore,
    instabilityScore,
    sleepDebtHours: debtHours,
    avgNightOverlapHours: avgOverlapHours,
    shiftStartVariabilityHours: variabilityHours,
    explanation,
    drivers,
  }
}

