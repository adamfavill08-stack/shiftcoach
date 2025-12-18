/**
 * Smart Sleep Prediction for Shift Workers
 * Predicts optimal sleep times based on:
 * - Recent shifts
 * - Upcoming shifts
 * - Circadian phase
 * - Sleep deficit
 * - Time of day
 * - Last 7 days of sleep
 */

import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getSleepDeficitForCircadian } from '@/lib/circadian/sleep'

export type SleepType = "main" | "post_shift" | "pre_shift_nap" | "recovery" | "nap"

export interface SleepPrediction {
  suggestedStart: Date
  suggestedEnd: Date
  type: SleepType
  confidence: number // 0-100
  reasoning: string
}

interface ShiftData {
  date: string
  label: string | null
  start_ts: string | null
  end_ts: string | null
}

interface RecentSleep {
  start_at: string
  end_at: string
  type: string
}

/**
 * Get most recent shift (ended within last 24h)
 */
async function getRecentShift(userId: string): Promise<ShiftData | null> {
  const supabase = supabaseServer
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const { data } = await supabase
    .from('shifts')
    .select('date, label, start_ts, end_ts')
    .eq('user_id', userId)
    .lte('date', now.toISOString().slice(0, 10))
    .order('date', { ascending: false })
    .limit(5)
  
  if (!data || data.length === 0) return null
  
  // Find shift that ended recently
  for (const shift of data) {
    if (shift.end_ts) {
      const endTime = new Date(shift.end_ts)
      const hoursSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60)
      if (hoursSinceEnd >= 0 && hoursSinceEnd <= 24) {
        return shift
      }
    }
  }
  
  // Fallback to most recent shift
  return data[0] || null
}

/**
 * Get upcoming shift (starts within next 36h)
 */
async function getUpcomingShift(userId: string): Promise<ShiftData | null> {
  const supabase = supabaseServer
  const now = new Date()
  const future = new Date(now.getTime() + 36 * 60 * 60 * 1000)
  
  const { data } = await supabase
    .from('shifts')
    .select('date, label, start_ts, end_ts')
    .eq('user_id', userId)
    .gte('date', now.toISOString().slice(0, 10))
    .lte('date', future.toISOString().slice(0, 10))
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle()
  
  return data || null
}

/**
 * Classify shift type from times
 */
function classifyShiftType(shift: ShiftData | null): 'night' | 'morning' | 'day' | 'afternoon' | null {
  if (!shift || !shift.start_ts) return null
  
  const start = new Date(shift.start_ts)
  const hour = start.getHours()
  
  if (hour >= 22 || hour < 6) return 'night'
  if (hour >= 6 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 14) return 'day'
  if (hour >= 14 && hour < 18) return 'afternoon'
  return 'day'
}

/**
 * Predict Post-Shift Sleep
 * After night shift (06:00-08:00 finish) → 5-6 hour sleep
 */
function predictPostShiftSleep(recentShift: ShiftData): SleepPrediction | null {
  if (!recentShift.end_ts) return null
  
  const endTime = new Date(recentShift.end_ts)
  const hour = endTime.getHours()
  
  // Night shift typically ends 06:00-08:00
  if (hour >= 6 && hour <= 8) {
    const now = new Date()
    const suggestedStart = new Date(now)
    // Add 30-60 min buffer after shift end
    suggestedStart.setMinutes(suggestedStart.getMinutes() + 45)
    
    const suggestedEnd = new Date(suggestedStart)
    suggestedEnd.setHours(suggestedEnd.getHours() + 5.5) // 5.5 hours typical post-night
    
    return {
      suggestedStart,
      suggestedEnd,
      type: 'post_shift',
      confidence: 85,
      reasoning: 'Post-night-shift recovery sleep (5.5 hours)'
    }
  }
  
  return null
}

/**
 * Predict Pre-Shift Nap
 * Before night shift (~19:00 start) → 90-120 min nap between 14:00-17:00
 */
function predictPreShiftNap(upcomingShift: ShiftData): SleepPrediction | null {
  if (!upcomingShift.start_ts) return null
  
  const startTime = new Date(upcomingShift.start_ts)
  const hour = startTime.getHours()
  
  // Night shift typically starts 18:00-22:00
  if (hour >= 18 && hour <= 22) {
    const now = new Date()
    const suggestedStart = new Date(now)
    
    // Target nap window: 14:00-17:00
    const targetHour = 15 // 3 PM
    suggestedStart.setHours(targetHour, 0, 0, 0)
    
    // If it's already past 15:00, suggest 1 hour from now
    if (suggestedStart.getTime() < now.getTime()) {
      suggestedStart.setTime(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    }
    
    const suggestedEnd = new Date(suggestedStart)
    suggestedEnd.setHours(suggestedEnd.getHours() + 1.75) // 1h 45min nap
    
    return {
      suggestedStart,
      suggestedEnd,
      type: 'pre_shift_nap',
      confidence: 80,
      reasoning: 'Pre-night-shift nap (1h 45min) to boost alertness'
    }
  }
  
  return null
}

/**
 * Predict Main Sleep
 * Based on circadian phase and no upcoming shift
 */
function predictMainSleep(
  circadianPhase: number | null,
  weeklyDeficit: number
): SleepPrediction {
  const now = new Date()
  const suggestedStart = new Date(now)
  
  // Base bedtime: 22:00 (10 PM)
  suggestedStart.setHours(22, 0, 0, 0)
  
  // Adjust for sleep deficit
  if (weeklyDeficit > 6) {
    // High deficit: go to bed 30-60 min earlier
    suggestedStart.setHours(21, 30 - Math.min(30, (weeklyDeficit - 6) * 10), 0, 0)
  } else if (weeklyDeficit < -2) {
    // Surplus: can go to bed slightly later
    suggestedStart.setHours(22, 30, 0, 0)
  }
  
  // If it's already past suggested start, use tomorrow
  if (suggestedStart.getTime() < now.getTime()) {
    suggestedStart.setDate(suggestedStart.getDate() + 1)
  }
  
  const suggestedEnd = new Date(suggestedStart)
  // Base duration: 7.5 hours, adjust for deficit
  let duration = 7.5
  if (weeklyDeficit > 4) duration += 0.5
  if (weeklyDeficit > 8) duration += 0.5
  suggestedEnd.setHours(suggestedEnd.getHours() + duration)
  
  return {
    suggestedStart,
    suggestedEnd,
    type: 'main',
    confidence: circadianPhase ? 75 : 70,
    reasoning: weeklyDeficit > 4 
      ? `Main sleep with recovery boost (${duration.toFixed(1)}h) to address ${weeklyDeficit.toFixed(1)}h deficit`
      : `Main sleep (${duration.toFixed(1)}h)`
  }
}

/**
 * Predict Recovery Sleep
 * When weekly deficit > 6 hours, add extra sleep
 */
function predictRecoverySleep(weeklyDeficit: number): SleepPrediction | null {
  if (weeklyDeficit <= 6) return null
  
  const now = new Date()
  const suggestedStart = new Date(now)
  
  // Recovery sleep: start soon, add 45-90 min to normal sleep
  suggestedStart.setHours(suggestedStart.getHours() + 1) // 1 hour from now
  
  const suggestedEnd = new Date(suggestedStart)
  const extraMinutes = Math.min(90, (weeklyDeficit - 6) * 15) // 15 min per hour deficit
  suggestedEnd.setMinutes(suggestedEnd.getMinutes() + 60 + extraMinutes) // Base 1h + extra
  
  return {
    suggestedStart,
    suggestedEnd,
    type: 'recovery',
    confidence: 75,
    reasoning: `Recovery sleep (+${Math.round(extraMinutes)}min) to address ${weeklyDeficit.toFixed(1)}h deficit`
  }
}

/**
 * Main prediction function
 */
export async function predictSleep(
  type: SleepType,
  userId?: string
): Promise<SleepPrediction | null> {
  try {
    // Get user ID if not provided
    let actualUserId = userId
    if (!actualUserId) {
      const { userId: uid } = await getServerSupabaseAndUserId()
      if (!uid) return null
      actualUserId = uid
    }
    
    // Fetch context data
    const supabase = supabaseServer
    const [recentShift, upcomingShift, sleepDeficitResult] = await Promise.all([
      getRecentShift(actualUserId),
      getUpcomingShift(actualUserId),
      getSleepDeficitForCircadian(supabase, actualUserId).catch(() => null)
    ])
    
    const sleepDeficit = sleepDeficitResult
    
    const weeklyDeficit = sleepDeficit?.weeklyDeficit ?? 0
    
    // Route to appropriate prediction
    switch (type) {
      case 'post_shift':
        if (recentShift) {
          return predictPostShiftSleep(recentShift)
        }
        break
        
      case 'pre_shift_nap':
        if (upcomingShift) {
          return predictPreShiftNap(upcomingShift)
        }
        break
        
      case 'recovery':
        return predictRecoverySleep(weeklyDeficit)
        
      case 'main':
        return predictMainSleep(null, weeklyDeficit) // TODO: get circadian phase
        
      case 'nap':
        // Micro nap: 20-30 minutes, anytime
        const now = new Date()
        const suggestedStart = new Date(now.getTime() + 30 * 60 * 1000) // 30 min from now
        const suggestedEnd = new Date(suggestedStart.getTime() + 25 * 60 * 1000) // 25 min nap
        return {
          suggestedStart,
          suggestedEnd,
          type: 'nap',
          confidence: 60,
          reasoning: 'Micro nap (25 min) for quick energy boost'
        }
    }
    
    return null
  } catch (error) {
    console.error('[predictSleep] Error:', error)
    return null
  }
}

