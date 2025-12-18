/**
 * Social Jetlag Calculation for ShiftCoach
 * 
 * Definition: How many hours your current sleep midpoint is shifted away from your usual midpoint.
 * 
 * Method:
 * - Group sleep by "ShiftCoach day" (07:00 → 07:00)
 * - For each day: compute midpoint (halfway between first sleep start and last sleep end)
 * - Baseline: median midpoint of previous 7-10 stable days
 * - Current misalignment: |current_midpoint - baseline_midpoint|
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type SocialJetlagCategory = "low" | "moderate" | "high"

export interface SocialJetlagMetrics {
  currentMisalignmentHours: number
  weeklyAverageMisalignmentHours: number
  baselineMidpointClock?: number // hours from midnight (0-24)
  currentMidpointClock?: number   // hours from midnight (0-24)
  category: SocialJetlagCategory
  explanation: string
}

/**
 * Get the start of a ShiftCoach day (07:00) for a given date
 */
function getShiftCoachDayStart(date: Date): Date {
  const dayStart = new Date(date)
  dayStart.setHours(7, 0, 0, 0)
  // If current time is before 07:00, this day started yesterday at 07:00
  if (date.getHours() < 7) {
    dayStart.setDate(dayStart.getDate() - 1)
  }
  return dayStart
}

/**
 * Get the end of a ShiftCoach day (07:00 next day) for a given date
 */
function getShiftCoachDayEnd(date: Date): Date {
  const dayEnd = new Date(getShiftCoachDayStart(date))
  dayEnd.setDate(dayEnd.getDate() + 1)
  return dayEnd
}

/**
 * Convert a date to hours from midnight (0-24)
 * Handles over-midnight correctly
 */
function toClockHours(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
}

/**
 * Calculate sleep midpoint for a day in clock hours (0-24)
 * Takes the earliest sleep start and latest sleep end, computes midpoint
 */
function calculateDayMidpoint(sessions: Array<{ start: Date; end: Date }>): number | null {
  if (sessions.length === 0) return null

  // Find earliest start and latest end
  let earliestStart = sessions[0].start
  let latestEnd = sessions[0].end

  for (const session of sessions) {
    if (session.start.getTime() < earliestStart.getTime()) {
      earliestStart = session.start
    }
    if (session.end.getTime() > latestEnd.getTime()) {
      latestEnd = session.end
    }
  }

  // Calculate midpoint in milliseconds
  const midpointMs = (earliestStart.getTime() + latestEnd.getTime()) / 2
  const midpoint = new Date(midpointMs)

  // Convert to clock hours (0-24)
  return toClockHours(midpoint)
}

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Get social jetlag metrics for a user
 */
export async function getSocialJetlagMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<SocialJetlagMetrics> {
  const now = new Date()
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  // Fetch sleep sessions from last 14 days
  // Use date-based query first as it's more reliable across schemas
  const dateStr = fourteenDaysAgo.toISOString().slice(0, 10) // YYYY-MM-DD
  
  // Try querying by date field (works for both old and new schema)
  let { data: sleepData, error } = await supabase
    .from('sleep_logs')
    .select('id, start_at, end_at, type, start_ts, end_ts, naps, date')
    .eq('user_id', userId)
    .gte('date', dateStr)
    .order('date', { ascending: true })
    .order('start_ts', { ascending: false })
    .limit(100) // Limit to prevent huge queries

  // If date field doesn't exist or query fails, try timestamp-based queries
  if (error) {
    const errorMsg = error.message || ''
    const errorCode = error.code || ''
    
    console.log('[getSocialJetlagMetrics] Date-based query failed, trying timestamp queries')
    
    // Try new schema with start_at
    let newSchemaResult = await supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, type, start_ts, end_ts, naps, date')
      .eq('user_id', userId)
      .gte('start_at', fourteenDaysAgo.toISOString())
      .order('start_at', { ascending: true })
      .limit(100) // Limit to prevent huge queries
    
    if (!newSchemaResult.error && newSchemaResult.data && newSchemaResult.data.length > 0) {
      // Map to include date if missing
      sleepData = newSchemaResult.data.map((s: any) => ({
        ...s,
        date: s.date || (s.start_at ? new Date(s.start_at).toISOString().slice(0, 10) : null)
      }))
      error = null
    } else {
      // Try old schema with start_ts
      const oldSchemaResult = await supabase
        .from('sleep_logs')
        .select('id, start_ts, end_ts, naps, date')
        .eq('user_id', userId)
        .gte('start_ts', fourteenDaysAgo.toISOString())
        .order('start_ts', { ascending: true })
        .limit(100) // Limit to prevent huge queries

      if (!oldSchemaResult.error && oldSchemaResult.data) {
        // Map old schema to unified format
        sleepData = (oldSchemaResult.data || []).map((s: any) => ({
          id: s.id,
          start_at: s.start_ts,
          end_at: s.end_ts,
          start_ts: s.start_ts,
          end_ts: s.end_ts,
          type: (s.naps === 0 || !s.naps) ? 'sleep' : 'nap',
          naps: s.naps,
          date: s.date,
        }))
        error = null
      } else {
        console.error('[getSocialJetlagMetrics] All query attempts failed:', {
          dateError: error,
          newSchemaError: newSchemaResult.error,
          oldSchemaError: oldSchemaResult.error,
        })
        return getDefaultMetrics('Failed to fetch sleep data')
      }
    }
  }

  console.log('[getSocialJetlagMetrics] Fetched sleep data:', sleepData?.length || 0, 'records')
  
  // Error is already handled in the if block above, so this check is redundant
  // But keeping it for safety with proper type handling
  if (error && (error as any).message) {
    console.error('[getSocialJetlagMetrics] Query error:', error)
    return getDefaultMetrics(`Failed to fetch sleep data: ${(error as any).message || 'Unknown error'}`)
  }

  if (!sleepData || sleepData.length === 0) {
    console.log('[getSocialJetlagMetrics] No sleep data found in last 14 days')
    return getDefaultMetrics('No sleep data available. Log at least 2 days of main sleep to calculate social jetlag.')
  }

  // Filter for main sleep only (not naps)
  const mainSleepSessions = sleepData
    .filter((s: any) => {
      const isMainSleep = s.type === 'sleep' || s.type === 'main' || 
                         (s.naps === 0 || s.naps === null || !s.naps)
      return isMainSleep
    })
    .map((s: any) => {
      try {
        const start = new Date(s.start_at || s.start_ts)
        const end = new Date(s.end_at || s.end_ts)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
        return { start, end }
      } catch (err) {
        return null
      }
    })
    .filter((s: any): s is { start: Date; end: Date } => s !== null)

  console.log('[getSocialJetlagMetrics] Main sleep sessions:', mainSleepSessions.length)
  
  if (mainSleepSessions.length === 0) {
    console.log('[getSocialJetlagMetrics] No main sleep sessions found (only naps or no valid sessions)')
    return getDefaultMetrics('No main sleep sessions found. Log main sleep (not just naps) to calculate social jetlag.')
  }
  
  if (mainSleepSessions.length < 2) {
    console.log('[getSocialJetlagMetrics] Not enough main sleep sessions:', mainSleepSessions.length)
    return getDefaultMetrics('Not enough main sleep data. Log at least 2 days of main sleep to calculate social jetlag.')
  }

  // Group sessions by ShiftCoach day (07:00 → 07:00)
  const dayMap = new Map<string, Array<{ start: Date; end: Date }>>()

  for (const session of mainSleepSessions) {
    const dayStart = getShiftCoachDayStart(session.start)
    const dayKey = dayStart.toISOString().slice(0, 10) // YYYY-MM-DD

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, [])
    }
    dayMap.get(dayKey)!.push(session)
  }

  // Calculate midpoint for each day
  const dayMidpoints: Array<{ date: string; midpoint: number }> = []
  
  for (const [dateKey, sessions] of dayMap.entries()) {
    const midpoint = calculateDayMidpoint(sessions)
    if (midpoint !== null) {
      dayMidpoints.push({ date: dateKey, midpoint })
    }
  }

  console.log('[getSocialJetlagMetrics] Days with midpoints:', dayMidpoints.length)
  
  if (dayMidpoints.length < 2) {
    console.log('[getSocialJetlagMetrics] Not enough days with sleep data')
    return getDefaultMetrics('Not enough sleep data (need at least 2 days with main sleep)')
  }

  // Sort by date (oldest first)
  dayMidpoints.sort((a, b) => a.date.localeCompare(b.date))

  // Calculate baseline: median of previous 7-10 days (excluding today)
  const todayKey = getShiftCoachDayStart(now).toISOString().slice(0, 10)
  const baselineDays = dayMidpoints
    .filter(d => d.date !== todayKey)
    .slice(-10) // Last 10 days (excluding today)
    .slice(0, 7) // Take up to 7 days for baseline

  if (baselineDays.length < 2) {
    return getDefaultMetrics('Not enough baseline data')
  }

  const baselineMidpoints = baselineDays.map(d => d.midpoint)
  const baselineMidpoint = median(baselineMidpoints)

  // Get current day's midpoint (or most recent day with sleep)
  const currentDayData = dayMidpoints.find(d => d.date === todayKey) || dayMidpoints[dayMidpoints.length - 1]
  const currentMidpoint = currentDayData.midpoint

  // Calculate current misalignment
  let currentMisalignmentHours = Math.abs(currentMidpoint - baselineMidpoint)
  
  // Handle wrap-around (e.g., 23:00 vs 1:00 should be 2h, not 22h)
  if (currentMisalignmentHours > 12) {
    currentMisalignmentHours = 24 - currentMisalignmentHours
  }

  // Calculate weekly average misalignment (last 7 days)
  const last7Days = dayMidpoints.slice(-7)
  const weeklyMisalignments = last7Days.map(d => {
    let misalignment = Math.abs(d.midpoint - baselineMidpoint)
    if (misalignment > 12) misalignment = 24 - misalignment
    return misalignment
  })
  const weeklyAverageMisalignmentHours = weeklyMisalignments.length > 0
    ? weeklyMisalignments.reduce((sum, m) => sum + m, 0) / weeklyMisalignments.length
    : currentMisalignmentHours

  // Determine category
  let category: SocialJetlagCategory
  if (currentMisalignmentHours <= 1.5) {
    category = "low"
  } else if (currentMisalignmentHours <= 3.5) {
    category = "moderate"
  } else {
    category = "high"
  }

  // Generate explanation
  const explanation = getExplanation(category, currentMisalignmentHours)

  return {
    currentMisalignmentHours: Math.round(currentMisalignmentHours * 10) / 10, // Round to 1 decimal
    weeklyAverageMisalignmentHours: Math.round(weeklyAverageMisalignmentHours * 10) / 10,
    baselineMidpointClock: baselineMidpoint,
    currentMidpointClock: currentMidpoint,
    category,
    explanation,
  }
}

function getExplanation(category: SocialJetlagCategory, hours: number): string {
  switch (category) {
    case "low":
      return "Your sleep timing has stayed close to your usual rhythm this week."
    case "moderate":
      return `Your sleep midpoint has shifted by around ${hours.toFixed(1)} hours due to recent shift changes.`
    case "high":
      return `Your body clock is heavily shifted (~${hours.toFixed(1)}h) from your usual pattern after recent day/night rotations.`
    default:
      return "Unable to calculate social jetlag."
  }
}

function getDefaultMetrics(reason: string): SocialJetlagMetrics {
  return {
    currentMisalignmentHours: 0,
    weeklyAverageMisalignmentHours: 0,
    category: "low",
    explanation: reason,
  }
}

