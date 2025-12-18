/**
 * Infers the high-level shift_pattern from pattern slots
 * Used to auto-update profiles.shift_pattern when rota patterns are saved
 */

type ShiftSlot = 'M' | 'A' | 'D' | 'N' | 'O'

export function inferShiftPattern(patternSlots: ShiftSlot[]): 'rotating' | 'mostly_days' | 'mostly_nights' | 'custom' {
  if (!patternSlots || patternSlots.length === 0) {
    return 'custom'
  }

  // Count shift types (excluding 'O' for off days)
  const workingSlots = patternSlots.filter(slot => slot !== 'O')
  
  if (workingSlots.length === 0) {
    return 'custom' // All off days, unusual pattern
  }

  // Count day shifts (M, A, D) vs night shifts (N)
  const dayShifts = workingSlots.filter(slot => slot === 'M' || slot === 'A' || slot === 'D').length
  const nightShifts = workingSlots.filter(slot => slot === 'N').length

  // If pattern has both day and night shifts, it's rotating
  if (dayShifts > 0 && nightShifts > 0) {
    return 'rotating'
  }

  // If mostly day shifts (>= 70% of working slots are day)
  if (dayShifts > 0 && dayShifts / workingSlots.length >= 0.7) {
    return 'mostly_days'
  }

  // If mostly night shifts (>= 70% of working slots are night)
  if (nightShifts > 0 && nightShifts / workingSlots.length >= 0.7) {
    return 'mostly_nights'
  }

  // Default to custom for unusual patterns
  return 'custom'
}

