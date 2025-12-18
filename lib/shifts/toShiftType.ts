/**
 * Shared utility for classifying shift types from labels and/or times.
 * 
 * This ensures consistent shift type classification across the entire app.
 * 
 * @param label - Shift label from database (e.g., "NIGHT", "DAY", "OFF", "CUSTOM")
 * @param startTs - Optional shift start timestamp for time-based classification
 * @param checkRotating - Optional: if true, checks if pattern is rotating (requires shift history)
 * @param recentShifts - Optional: array of recent shifts for rotating detection
 * @returns Standardized shift type
 */

export type StandardShiftType = 'morning' | 'day' | 'evening' | 'night' | 'rotating' | 'off'

/**
 * Classify shift type from label and optional start time.
 * This is the primary classification function used throughout the app.
 */
export function toShiftType(
  label?: string | null,
  startTs?: string | null,
  checkRotating?: boolean,
  recentShifts?: Array<{ label?: string | null }>
): StandardShiftType {
  // Handle null/undefined
  if (!label) {
    // If no label but we have a start time, classify by time
    if (startTs) {
      return classifyByTime(startTs)
    }
    return 'off'
  }

  const normalized = label.toUpperCase().trim()

  // Explicit OFF
  if (normalized === 'OFF') {
    return 'off'
  }

  // Explicit NIGHT
  if (normalized === 'NIGHT' || normalized.includes('NIGHT')) {
    return 'night'
  }

  // Explicit MORNING
  if (normalized === 'MORNING' || normalized.includes('MORNING')) {
    return 'morning'
  }

  // AFTERNOON or LATE
  if (normalized === 'AFTERNOON' || normalized === 'LATE' || normalized.includes('AFTERNOON') || normalized.includes('LATE')) {
    return 'evening' // Map afternoon/late to "evening" for circadian calculations
  }

  // DAY shift - may need time-based refinement
  if (normalized === 'DAY' || normalized.includes('DAY')) {
    // If we have a start time, refine classification
    if (startTs) {
      const startHour = new Date(startTs).getHours()
      // Morning: 5-9
      if (startHour >= 5 && startHour < 9) {
        return 'morning'
      }
      // Day: 9-17
      if (startHour >= 9 && startHour < 17) {
        return 'day'
      }
      // Evening: 17-22
      if (startHour >= 17 && startHour < 22) {
        return 'evening'
      }
      // Night: 22-5
      return 'night'
    }
    // Default to 'day' if no time available
    return 'day'
  }

  // CUSTOM shift - classify by time if available
  if (normalized === 'CUSTOM' && startTs) {
    return classifyByTime(startTs)
  }

  // Check for rotating pattern if requested
  if (checkRotating && recentShifts && recentShifts.length > 0) {
    const uniqueNonOffLabels = new Set(
      recentShifts
        .filter(s => s.label && s.label.toUpperCase() !== 'OFF')
        .map(s => s.label?.toUpperCase())
    )
    if (uniqueNonOffLabels.size > 2) {
      return 'rotating'
    }
  }

  // Default fallback
  return 'off'
}

/**
 * Classify shift type purely from start time (when label is unavailable)
 */
function classifyByTime(startTs: string): StandardShiftType {
  const startHour = new Date(startTs).getHours()
  
  // Night: 22:00 - 05:59
  if (startHour >= 22 || startHour < 6) {
    return 'night'
  }
  // Morning: 06:00 - 09:59
  if (startHour >= 6 && startHour < 10) {
    return 'morning'
  }
  // Day: 10:00 - 13:59
  if (startHour >= 10 && startHour < 14) {
    return 'day'
  }
  // Evening: 14:00 - 21:59
  if (startHour >= 14 && startHour < 22) {
    return 'evening'
  }
  
  // Fallback
  return 'day'
}

/**
 * Convert standard shift type to shift-rhythm engine format.
 * The shift-rhythm engine uses slightly different types.
 */
export function toShiftRhythmType(shiftType: StandardShiftType): 'night' | 'day' | 'off' | 'morning' | 'afternoon' {
  switch (shiftType) {
    case 'night':
      return 'night'
    case 'morning':
      return 'morning'
    case 'evening':
      return 'afternoon' // Map evening to afternoon for shift-rhythm
    case 'day':
      return 'day'
    case 'rotating':
      return 'day' // Default rotating to day
    case 'off':
    default:
      return 'off'
  }
}

/**
 * Convert standard shift type to activity API format.
 * The activity API uses: 'day' | 'night' | 'late' | 'off'
 */
export function toActivityShiftType(shiftType: StandardShiftType): 'day' | 'night' | 'late' | 'off' {
  switch (shiftType) {
    case 'night':
      return 'night'
    case 'morning':
    case 'day':
    case 'evening':
      return 'day' // All non-night shifts are "day" for activity
    case 'rotating':
      return 'day'
    case 'off':
    default:
      return 'off'
  }
}

