/**
 * Calculate tonight's sleep target based on:
 * - Weekly sleep deficit
 * - Upcoming shift type
 * - Recent sleep patterns
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSleepDeficitForCircadian } from './sleep'

export interface TonightTarget {
  targetHours: number
  explanation: string
}

type ShiftCategory = 'none' | 'early' | 'day' | 'late' | 'night'

/**
 * Categorize shift start time
 */
function categorizeShift(startTime: Date): ShiftCategory {
  const hours = startTime.getHours()
  
  if (hours >= 4 && hours < 8) {
    return 'early'
  } else if (hours >= 8 && hours < 17) {
    return 'day'
  } else if (hours >= 17 && hours < 23) {
    return 'late'
  } else {
    return 'night' // 23:00-03:59
  }
}

/**
 * Format time for display (e.g., "6:30 AM")
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Calculate tonight's sleep target
 */
export async function calculateTonightTarget(
  supabase: SupabaseClient,
  userId: string
): Promise<TonightTarget> {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString().slice(0, 10)
  
  // Look for shifts starting within the next ~36 hours
  const thirtySixHoursFromNow = new Date(now.getTime() + 36 * 60 * 60 * 1000)
  const futureIso = thirtySixHoursFromNow.toISOString().slice(0, 10)
  
  // Query upcoming shifts - check both date and start_ts
  let nextShift: { date: string; label: string | null; start_ts: string | null } | null = null
  
  try {
    // First try querying by date range
    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('date, label, start_ts')
      .eq('user_id', userId)
      .gte('date', now.toISOString().slice(0, 10))
      .lte('date', futureIso)
      .neq('label', 'OFF')
      .order('date', { ascending: true })
      .order('start_ts', { ascending: true })
      .limit(10) // Get multiple to filter by actual start time
    
    if (!error && shifts && shifts.length > 0) {
      // Filter to find the first shift that actually starts within 36 hours
      for (const shift of shifts) {
        if (shift.start_ts) {
          const shiftStart = new Date(shift.start_ts)
          if (shiftStart >= now && shiftStart <= thirtySixHoursFromNow) {
            nextShift = shift
            break
          }
        } else {
          // If no start_ts, use the date as fallback (assume it's today or tomorrow)
          const shiftDate = new Date(shift.date)
          if (shiftDate >= now && shiftDate <= thirtySixHoursFromNow) {
            nextShift = shift
            break
          }
        }
      }
    }
  } catch (err) {
    console.warn('[circadian/tonight-target] Failed to fetch shifts:', err)
  }
  
  // Get sleep deficit
  const sleepDeficit = await getSleepDeficitForCircadian(supabase, userId, 7.5)
  const weeklyDeficitHours = sleepDeficit?.weeklyDeficit ?? 0
  
  // Base target
  let target = 7.5
  
  // 1) Adjust for weekly sleep deficit
  if (weeklyDeficitHours >= 8) {
    target += 1.0 // strong catch-up
  } else if (weeklyDeficitHours >= 4) {
    target += 0.5 // mild catch-up
  } else if (weeklyDeficitHours <= -2) {
    target -= 0.5 // slightly ahead, can ease a bit
  }
  
  // 2) Adjust for upcoming shift type
  let shiftCategory: ShiftCategory = 'none'
  let shiftStartTime: Date | null = null
  
  if (nextShift && nextShift.start_ts) {
    shiftStartTime = new Date(nextShift.start_ts)
    shiftCategory = categorizeShift(shiftStartTime)
    
    if (shiftCategory === 'early') {
      // Early shifts are hard; prioritise full sleep
      target = Math.max(target, 8.0)
    }
    
    if (shiftCategory === 'night') {
      // For night shifts, we still aim for a solid core sleep; avoid extreme values
      target = Math.min(Math.max(target, 7.5), 8.5)
    }
  }
  
  // 3) Clamp to a safe range
  if (target < 6.5) target = 6.5
  if (target > 9.0) target = 9.0
  
  // Build explanation
  let explanation: string
  
  if (!nextShift || !shiftStartTime) {
    explanation = "You don't have a shift starting soon, so we're aiming for your normal 7–9 hours of sleep."
  } else {
    const formattedShiftStart = formatTime(shiftStartTime)
    
    if (shiftCategory === 'early' && weeklyDeficitHours >= 4) {
      explanation = `You've built up about ${weeklyDeficitHours.toFixed(1)} hours of sleep debt and you have an early shift at ${formattedShiftStart}. Tonight's goal is a longer sleep to help you catch up.`
    } else if (shiftCategory === 'early') {
      explanation = `You have an early shift at ${formattedShiftStart}. A solid sleep tonight will protect your alertness in the morning.`
    } else if (shiftCategory === 'night') {
      explanation = `You're working a night shift starting at ${formattedShiftStart}. This target balances recovery with your upcoming shift so you don't over- or under-sleep.`
    } else if (weeklyDeficitHours >= 4) {
      explanation = `You're about ${weeklyDeficitHours.toFixed(1)} hours behind your weekly sleep target, so tonight's goal is slightly higher to help you recover.`
    } else {
      explanation = "You're close to your weekly sleep target. Keeping a steady routine tonight will support your body clock."
    }
  }
  
  return {
    targetHours: Math.round(target * 10) / 10, // Round to 1 decimal
    explanation,
  }
}

