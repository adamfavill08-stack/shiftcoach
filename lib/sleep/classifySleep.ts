/**
 * Smart Sleep Classification for Shift Workers
 * Classifies sleep sessions based on:
 * - Duration
 * - Time of day
 * - Shift context
 * - Circadian patterns
 */

export type SleepClassification =
  | "main_sleep"
  | "post_shift_recovery"
  | "pre_shift_nap"
  | "split_sleep"
  | "micro_nap"
  | "irregular_sleep"
  | "day_sleep"

export interface SleepClassificationResult {
  classification: SleepClassification
  confidence: number // 0-100
  reasoning: string
  displayLabel: string
  color: string // For UI display
}

interface SleepSession {
  start_at: string | Date
  end_at: string | Date
  durationHours: number
}

interface ShiftContext {
  recentShiftEnd?: Date | null
  upcomingShiftStart?: Date | null
  recentShiftType?: 'night' | 'morning' | 'day' | 'afternoon' | null
}

/**
 * Classify a sleep session
 */
export function classifySleep(
  session: SleepSession,
  context?: ShiftContext
): SleepClassificationResult {
  const start = typeof session.start_at === 'string' 
    ? new Date(session.start_at) 
    : session.start_at
  const end = typeof session.end_at === 'string' 
    ? new Date(session.end_at) 
    : session.end_at
  
  const durationHours = session.durationHours
  const startHour = start.getHours()
  const endHour = end.getHours()
  
  // Day sleep (common after night shifts)
  // Sleep that starts and ends during daylight hours (06:00-18:00)
  if (startHour >= 6 && startHour < 18 && endHour >= 6 && endHour < 18) {
    if (durationHours >= 4 && durationHours <= 8) {
      return {
        classification: 'day_sleep',
        confidence: 90,
        reasoning: 'Daytime sleep session (4-8h) typical after night shift',
        displayLabel: 'Day Sleep',
        color: 'amber'
      }
    }
  }
  
  // Post-shift recovery
  // Sleep starting within 2 hours of shift end, especially after night shift
  if (context?.recentShiftEnd) {
    const hoursSinceShiftEnd = (start.getTime() - context.recentShiftEnd.getTime()) / (1000 * 60 * 60)
    if (hoursSinceShiftEnd >= 0 && hoursSinceShiftEnd <= 2) {
      if (context.recentShiftType === 'night' && durationHours >= 4 && durationHours <= 7) {
        return {
          classification: 'post_shift_recovery',
          confidence: 95,
          reasoning: 'Post-night-shift recovery sleep',
          displayLabel: 'Post-Shift Recovery',
          color: 'blue'
        }
      }
    }
  }
  
  // Pre-shift nap
  // Short nap (1-3h) before a shift, especially night shift
  if (context?.upcomingShiftStart) {
    const hoursUntilShift = (context.upcomingShiftStart.getTime() - end.getTime()) / (1000 * 60 * 60)
    if (hoursUntilShift >= 0 && hoursUntilShift <= 4) {
      if (durationHours >= 1 && durationHours <= 3) {
        return {
          classification: 'pre_shift_nap',
          confidence: 90,
          reasoning: 'Pre-shift nap to boost alertness',
          displayLabel: 'Pre-Shift Nap',
          color: 'indigo'
        }
      }
    }
  }
  
  // Micro nap
  // Very short sleep (10-60 min)
  if (durationHours < 1) {
    return {
      classification: 'micro_nap',
      confidence: 95,
      reasoning: 'Micro nap for quick energy boost',
      displayLabel: 'Micro Nap',
      color: 'purple'
    }
  }
  
  // Main sleep
  // Traditional night sleep: 6-9 hours, starting 20:00-01:00
  if (durationHours >= 6 && durationHours <= 9) {
    if (startHour >= 20 || startHour <= 1) {
      return {
        classification: 'main_sleep',
        confidence: 85,
        reasoning: 'Main sleep session during night hours',
        displayLabel: 'Main Sleep',
        color: 'slate'
      }
    }
  }
  
  // Split sleep
  // Two sleep periods in same 24h, both substantial (3+ hours each)
  // This would need to be detected across multiple sessions
  // For now, mark as potential split if duration is moderate but timing is unusual
  if (durationHours >= 3 && durationHours <= 5) {
    if (startHour >= 20 || startHour <= 1 || (startHour >= 6 && startHour < 12)) {
      return {
        classification: 'split_sleep',
        confidence: 60,
        reasoning: 'Potential split sleep pattern',
        displayLabel: 'Split Sleep',
        color: 'teal'
      }
    }
  }
  
  // Irregular sleep
  // Doesn't fit standard patterns
  return {
    classification: 'irregular_sleep',
    confidence: 70,
    reasoning: 'Sleep pattern doesn\'t match standard classifications',
    displayLabel: 'Sleep',
    color: 'gray'
  }
}

/**
 * Get display color for classification
 */
export function getClassificationColor(classification: SleepClassification): string {
  const colors: Record<SleepClassification, string> = {
    main_sleep: 'bg-slate-500',
    post_shift_recovery: 'bg-blue-500',
    pre_shift_nap: 'bg-indigo-500',
    split_sleep: 'bg-teal-500',
    micro_nap: 'bg-purple-500',
    irregular_sleep: 'bg-gray-500',
    day_sleep: 'bg-amber-500',
  }
  return colors[classification] || 'bg-gray-500'
}

