/**
 * ShiftLag Calculation
 * 
 * A comprehensive score (0-100) that measures the "jet lag" effect of shift work
 * Combines: Sleep Debt (0-40), Circadian Misalignment (0-40), Schedule Instability (0-20)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type ShiftLagCategory = "low" | "moderate" | "high"

export interface ShiftLagMetrics {
  score: number // 0-100
  category: ShiftLagCategory
  sleepDebtScore: number // 0-40
  misalignmentScore: number // 0-40
  instabilityScore: number // 0-20
  sleepDebtHours: number // Weekly sleep debt in hours
  avgNightOverlapHours: number // Average hours of shift during biological night
  shiftStartVariabilityHours: number // Standard deviation of shift start times
  explanation: string
  drivers: {
    sleepDebt: string
    misalignment: string
    instability: string
  }
  recommendations: string[]
}

/**
 * Calculate user's typical sleep need from off-days
 * Uses rolling median of sleep on days off, capped between 7-9 hours
 */
async function calculateTypicalSleepNeed(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // Get shifts to identify off-days - same data source as calendar
  // Uses the same 'shifts' table that the calendar page queries
  const { data: shifts } = await supabase
    .from('shifts')
    .select('date, label')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
    .order('date', { ascending: false })
  
  // Create a set of dates that have shifts (work days)
  // Days with label 'OFF' are considered off-days for sleep need calculation
  const workDays = new Set<string>()
  if (shifts) {
    for (const shift of shifts) {
      if (shift.label && shift.label !== 'OFF') {
        workDays.add(shift.date)
      }
    }
  }
  
  // Get sleep logs from last 30 days
  const { data: sleepLogs } = await supabase
    .from('sleep_logs')
    .select('start_at, end_at, start_ts, end_ts, date, type, naps')
    .eq('user_id', userId)
    .gte('start_at', thirtyDaysAgo.toISOString())
    .order('start_at', { ascending: false })
    .limit(100)
  
  // If start_at doesn't exist, try start_ts
  if (!sleepLogs || sleepLogs.length === 0) {
    const { data: oldSleepLogs } = await supabase
      .from('sleep_logs')
      .select('start_ts, end_ts, date, naps')
      .eq('user_id', userId)
      .gte('start_ts', thirtyDaysAgo.toISOString())
      .order('start_ts', { ascending: false })
      .limit(100)
    
    if (!oldSleepLogs || oldSleepLogs.length === 0) {
      return 7.5 // Default
    }
    
    // Calculate sleep on off-days
    const offDaySleeps: number[] = []
    const sleepByDate = new Map<string, number>()
    
    for (const log of oldSleepLogs) {
      const date = log.date || new Date(log.start_ts).toISOString().slice(0, 10)
      if (!workDays.has(date)) {
        // This is an off-day
        const start = new Date(log.start_ts)
        const end = new Date(log.end_ts)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        
        const existing = sleepByDate.get(date) || 0
        sleepByDate.set(date, existing + hours)
      }
    }
    
    offDaySleeps.push(...Array.from(sleepByDate.values()))
    
    if (offDaySleeps.length === 0) {
      return 7.5 // Default if no off-day data
    }
    
    // Calculate median
    offDaySleeps.sort((a, b) => a - b)
    const mid = Math.floor(offDaySleeps.length / 2)
    const median = offDaySleeps.length % 2 === 0
      ? (offDaySleeps[mid - 1] + offDaySleeps[mid]) / 2
      : offDaySleeps[mid]
    
    return Math.max(7, Math.min(9, median)) // Cap between 7-9 hours
  }
  
  // Calculate sleep on off-days (new schema)
  const offDaySleeps: number[] = []
  const sleepByDate = new Map<string, number>()
  
  for (const log of sleepLogs) {
    const date = log.date || new Date(log.start_at || log.start_ts).toISOString().slice(0, 10)
    if (!workDays.has(date)) {
      // This is an off-day
      const start = new Date(log.start_at || log.start_ts)
      const end = new Date(log.end_at || log.end_ts)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      
      const existing = sleepByDate.get(date) || 0
      sleepByDate.set(date, existing + hours)
    }
  }
  
  offDaySleeps.push(...Array.from(sleepByDate.values()))
  
  if (offDaySleeps.length === 0) {
    return 7.5 // Default if no off-day data
  }
  
  // Calculate median
  offDaySleeps.sort((a, b) => a - b)
  const mid = Math.floor(offDaySleeps.length / 2)
  const median = offDaySleeps.length % 2 === 0
    ? (offDaySleeps[mid - 1] + offDaySleeps[mid]) / 2
    : offDaySleeps[mid]
  
  return Math.max(7, Math.min(9, median)) // Cap between 7-9 hours
}

/**
 * Calculate sleep debt score (0-40 points)
 */
async function calculateSleepDebtScore(
  supabase: SupabaseClient,
  userId: string,
  typicalSleepNeed: number
): Promise<{ score: number; debtHours: number }> {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // Get sleep logs from last 7 days
  const { data: sleepLogs } = await supabase
    .from('sleep_logs')
    .select('start_at, end_at, start_ts, end_ts, date, type, naps')
    .eq('user_id', userId)
    .gte('start_at', sevenDaysAgo.toISOString())
    .order('start_at', { ascending: true })
    .limit(100)
  
  // If start_at doesn't exist, try start_ts
  let logs: any[] | null = sleepLogs
  if (!logs || logs.length === 0) {
    const { data: oldLogs } = await supabase
      .from('sleep_logs')
      .select('start_ts, end_ts, date, naps')
      .eq('user_id', userId)
      .gte('start_ts', sevenDaysAgo.toISOString())
      .order('start_ts', { ascending: true })
      .limit(100)
    
    logs = oldLogs
  }
  
  if (!logs || logs.length === 0) {
    return { score: 0, debtHours: 0 }
  }
  
  // Group sleep by day and calculate daily debt
  const sleepByDate = new Map<string, number>()
  
  for (const log of logs) {
    const date = log.date || new Date(log.start_at || log.start_ts).toISOString().slice(0, 10)
    const start = new Date(log.start_at || log.start_ts)
    const end = new Date(log.end_at || log.end_ts)
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    const existing = sleepByDate.get(date) || 0
    sleepByDate.set(date, existing + hours)
  }
  
  // Calculate weekly debt for last 7 days (including today)
  let weeklyDebtHours = 0
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i) // Go backwards from today
    const dateStr = date.toISOString().slice(0, 10)
    const actualSleep = sleepByDate.get(dateStr) || 0
    const dailyDebt = Math.max(0, typicalSleepNeed - actualSleep)
    weeklyDebtHours += dailyDebt
  }
  
  // Map to score (0-40 points)
  let score = 0
  if (weeklyDebtHours >= 14) {
    score = 40
  } else if (weeklyDebtHours >= 7) {
    // 7-14h: 20-35 points (linear interpolation)
    score = 20 + ((weeklyDebtHours - 7) / 7) * 15
  } else if (weeklyDebtHours >= 3) {
    // 3-7h: 10-20 points
    score = 10 + ((weeklyDebtHours - 3) / 4) * 10
  } else {
    // 0-3h: 0 points
    score = 0
  }
  
  return { score: Math.round(score), debtHours: Math.round(weeklyDebtHours * 10) / 10 }
}

/**
 * Calculate circadian misalignment score (0-40 points)
 * Measures how many hours of work overlap with biological night
 */
async function calculateMisalignmentScore(
  supabase: SupabaseClient,
  userId: string,
  biologicalNightStart: number, // Hours from midnight (e.g., 23 for 11 PM)
  biologicalNightEnd: number // Hours from midnight (e.g., 7 for 7 AM)
): Promise<{ score: number; avgOverlapHours: number }> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const fiveDaysAgo = new Date(now)
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  
  // Get shifts from last 5 days (including today) - same data source as calendar
  // Uses the same 'shifts' table that the calendar page queries
  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, date, start_ts, end_ts, label')
    .eq('user_id', userId)
    .gte('date', fiveDaysAgo.toISOString().slice(0, 10))
    .lte('date', todayStr) // Include today's shift
    .neq('label', 'OFF') // Only work shifts, same as calendar filters
    .order('date', { ascending: true })
    .limit(50)
  
  if (!shifts || shifts.length === 0) {
    return { score: 0, avgOverlapHours: 0 }
  }
  
  // Calculate overlap for each shift
  const overlaps: number[] = []
  
  for (const shift of shifts) {
    // Skip shifts without start time (they won't be in calendar's time-based calculations either)
    if (!shift.start_ts) {
      continue
    }
    
    const shiftStart = new Date(shift.start_ts)
    const shiftStartHour = shiftStart.getHours() + shiftStart.getMinutes() / 60
    
    // Get shift end time
    let shiftEndHour: number
    if (shift.end_ts) {
      const shiftEnd = new Date(shift.end_ts)
      shiftEndHour = shiftEnd.getHours() + shiftEnd.getMinutes() / 60
    } else {
      // Estimate: assume 8-12 hour shift based on label
      const shiftLength = shift.label?.includes('12') ? 12 : 8
      shiftEndHour = (shiftStartHour + shiftLength) % 24
    }
    
    // Calculate overlap with biological night
    // Biological night wraps around midnight (e.g., 23:00 to 07:00)
    // Convert everything to a continuous timeline in minutes
    const shiftStartMin = shiftStartHour * 60
    const shiftEndMin = shiftStartHour > shiftEndHour 
      ? (shiftEndHour + 24) * 60  // Shift crosses midnight, add 24h to end
      : shiftEndHour * 60
    
    const bioNightStartMin = biologicalNightStart * 60  // e.g., 23:00 = 1380 min
    const bioNightEndMin = (biologicalNightEnd + 24) * 60  // e.g., 07:00 next day = 1860 min
    
    // Calculate overlap on continuous timeline
    const overlapStart = Math.max(shiftStartMin, bioNightStartMin)
    const overlapEnd = Math.min(shiftEndMin, bioNightEndMin)
    const overlapMinutes = Math.max(0, overlapEnd - overlapStart)
    const overlap = overlapMinutes / 60
    
    overlaps.push(overlap)
  }
  
  if (overlaps.length === 0) {
    return { score: 0, avgOverlapHours: 0 }
  }
  
  // Calculate average overlap
  const avgOverlap = overlaps.reduce((sum, o) => sum + o, 0) / overlaps.length
  
  // Map to score (0-40 points)
  let score = 0
  if (avgOverlap >= 8) {
    score = 40
  } else if (avgOverlap >= 6) {
    // 6-8h: 35-40 points
    score = 35 + ((avgOverlap - 6) / 2) * 5
  } else if (avgOverlap >= 4) {
    // 4-6h: 25-35 points
    score = 25 + ((avgOverlap - 4) / 2) * 10
  } else if (avgOverlap >= 2) {
    // 2-4h: 15-25 points
    score = 15 + ((avgOverlap - 2) / 2) * 10
  } else if (avgOverlap > 0) {
    // 0-2h: 5 points
    score = 5
  } else {
    score = 0
  }
  
  return { score: Math.round(score), avgOverlapHours: Math.round(avgOverlap * 10) / 10 }
}

/**
 * Calculate schedule instability score (0-20 points)
 * Measures variation in shift start times
 */
async function calculateInstabilityScore(
  supabase: SupabaseClient,
  userId: string
): Promise<{ score: number; variabilityHours: number }> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  
  // Get shift start times from last 14 days (including today) - same data source as calendar
  // Uses the same 'shifts' table that the calendar page queries
  const { data: shifts } = await supabase
    .from('shifts')
    .select('date, start_ts, label')
    .eq('user_id', userId)
    .gte('date', fourteenDaysAgo.toISOString().slice(0, 10))
    .lte('date', todayStr) // Include today's shift
    .neq('label', 'OFF') // Only work shifts, same as calendar filters
    .order('date', { ascending: true })
    .limit(100)
  
  if (!shifts || shifts.length < 2) {
    return { score: 0, variabilityHours: 0 }
  }
  
  // Extract start times in minutes since midnight
  const startTimes: number[] = []
  
  for (const shift of shifts) {
    // Skip shifts without start time (they won't affect schedule variability calculation)
    if (!shift.start_ts) continue
    const shiftStart = new Date(shift.start_ts)
    const minutesSinceMidnight = shiftStart.getHours() * 60 + shiftStart.getMinutes()
    startTimes.push(minutesSinceMidnight)
  }
  
  if (startTimes.length < 2) {
    return { score: 0, variabilityHours: 0 }
  }
  
  // Calculate standard deviation
  const mean = startTimes.reduce((sum, t) => sum + t, 0) / startTimes.length
  const variance = startTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / startTimes.length
  const stdDevMinutes = Math.sqrt(variance)
  const stdDevHours = stdDevMinutes / 60
  
  // Map to score (0-20 points)
  let score = 0
  if (stdDevHours >= 8) {
    score = 20
  } else if (stdDevHours >= 6) {
    // 6-8h: 15-20 points
    score = 15 + ((stdDevHours - 6) / 2) * 5
  } else if (stdDevHours >= 4) {
    // 4-6h: 10-15 points
    score = 10 + ((stdDevHours - 4) / 2) * 5
  } else if (stdDevHours >= 2) {
    // 2-4h: 5-10 points
    score = 5 + ((stdDevHours - 2) / 2) * 5
  } else {
    // <2h: 0 points
    score = 0
  }
  
  return { score: Math.round(score), variabilityHours: Math.round(stdDevHours * 10) / 10 }
}

/**
 * Get biological night window from circadian engine
 * Defaults to 23:00-07:00 if not available
 */
async function getBiologicalNight(
  supabase: SupabaseClient,
  userId: string
): Promise<{ start: number; end: number }> {
  // Try to get from circadian logs or calculate from recent sleep patterns
  // For now, use default based on typical circadian rhythm
  // In future, this could come from the circadian engine's output
  
  // Default biological night: 23:00 (11 PM) to 07:00 (7 AM)
  return { start: 23, end: 7 }
}

/**
 * Main function to calculate ShiftLag metrics
 */
export async function calculateShiftLag(
  supabase: SupabaseClient,
  userId: string
): Promise<ShiftLagMetrics> {
  try {
    // Step 1: Calculate typical sleep need
    const typicalSleepNeed = await calculateTypicalSleepNeed(supabase, userId)
    
    // Step 2: Calculate sleep debt score
    const { score: sleepDebtScore, debtHours } = await calculateSleepDebtScore(
      supabase,
      userId,
      typicalSleepNeed
    )
    
    // Step 3: Get biological night window
    const { start: bioNightStart, end: bioNightEnd } = await getBiologicalNight(supabase, userId)
    
    // Step 4: Calculate misalignment score
    const { score: misalignmentScore, avgOverlapHours } = await calculateMisalignmentScore(
      supabase,
      userId,
      bioNightStart,
      bioNightEnd
    )
    
    // Step 5: Calculate instability score
    const { score: instabilityScore, variabilityHours } = await calculateInstabilityScore(
      supabase,
      userId
    )
    
    // Step 6: Calculate total score (0-100)
    const totalScore = Math.max(0, Math.min(100, sleepDebtScore + misalignmentScore + instabilityScore))
    
    // Step 7: Classify
    let category: ShiftLagCategory
    if (totalScore <= 20) {
      category = "low"
    } else if (totalScore <= 50) {
      category = "moderate"
    } else {
      category = "high"
    }
    
    // Step 8: Generate explanation and recommendations
    const explanation = generateExplanation(category, totalScore, debtHours, avgOverlapHours, variabilityHours)
    const drivers = generateDrivers(debtHours, avgOverlapHours, variabilityHours)
    const recommendations = generateRecommendations(category, debtHours, avgOverlapHours, variabilityHours)
    
    return {
      score: Math.round(totalScore),
      category,
      sleepDebtScore,
      misalignmentScore,
      instabilityScore,
      sleepDebtHours: debtHours,
      avgNightOverlapHours: avgOverlapHours,
      shiftStartVariabilityHours: variabilityHours,
      explanation,
      drivers,
      recommendations,
    }
  } catch (err: any) {
    console.error('[calculateShiftLag] Error:', err)
    // Return default metrics on error
    return {
      score: 0,
      category: "low",
      sleepDebtScore: 0,
      misalignmentScore: 0,
      instabilityScore: 0,
      sleepDebtHours: 0,
      avgNightOverlapHours: 0,
      shiftStartVariabilityHours: 0,
      explanation: "Unable to calculate ShiftLag. Please ensure you have logged sleep and shifts.",
      drivers: {
        sleepDebt: "No data",
        misalignment: "No data",
        instability: "No data",
      },
      recommendations: [],
    }
  }
}

function generateExplanation(
  category: ShiftLagCategory,
  score: number,
  debtHours: number,
  overlapHours: number,
  variabilityHours: number
): string {
  if (category === "low") {
    return "Your body clock is coping well with your current shift pattern."
  } else if (category === "moderate") {
    return `You're carrying some shift lag (${score}/100) from recent sleep debt and shift timing changes.`
  } else {
    return `Your body clock is significantly out of sync (${score}/100) due to night shifts during biological night, sleep debt, and schedule changes.`
  }
}

function generateDrivers(
  debtHours: number,
  overlapHours: number,
  variabilityHours: number
): { sleepDebt: string; misalignment: string; instability: string } {
  return {
    sleepDebt: debtHours > 0 ? `Sleep debt: ${debtHours.toFixed(1)}h this week` : "Sleep debt: On track",
    misalignment: overlapHours > 0 ? `Night work during biological night: ${overlapHours.toFixed(1)}h per shift` : "Circadian alignment: Good",
    instability: variabilityHours > 0 ? `Schedule changes: ${variabilityHours.toFixed(1)}h variation in start times` : "Schedule stability: Consistent",
  }
}

function generateRecommendations(
  category: ShiftLagCategory,
  debtHours: number,
  overlapHours: number,
  variabilityHours: number
): string[] {
  const recommendations: string[] = []
  
  if (category === "high") {
    recommendations.push("Prioritise a solid sleep block today (aim for 7-9 hours)")
    if (overlapHours > 4) {
      recommendations.push("Use blackout curtains and avoid bright light 1-2h before daytime sleep")
    }
    if (debtHours > 7) {
      recommendations.push("Focus on catching up on sleep debt with longer sleep blocks when possible")
    }
  } else if (category === "moderate") {
    recommendations.push("Try to keep wake-up time consistent for the next 3 days")
    if (variabilityHours > 4) {
      recommendations.push("Minimise shift pattern changes where possible")
    }
  } else {
    recommendations.push("Keep maintaining your current sleep and shift routine")
  }
  
  return recommendations
}

