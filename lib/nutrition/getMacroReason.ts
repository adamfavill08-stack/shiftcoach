export type MacroReasonInput = {
  shiftType?: 'day' | 'night' | 'off' | 'early' | 'late' | 'other' | null
  goal?: 'lose' | 'maintain' | 'gain' | null
  rhythmScore?: number | null
  sleepHoursLast24h?: number | null
  macroPreset?: 'balanced' | 'high_protein' | 'custom' | null
}

/**
 * One short, non-medical explanation for why today's macro split looks the way it does.
 */
export function getMacroReason({
  shiftType,
  goal,
  rhythmScore,
  sleepHoursLast24h,
  macroPreset,
}: MacroReasonInput): string {
  const poorRecovery =
    (rhythmScore != null && rhythmScore < 50) ||
    (sleepHoursLast24h != null && sleepHoursLast24h < 6)

  if (macroPreset === 'high_protein') {
    return 'Protein is prioritised in your current macro preset.'
  }

  if (goal === 'lose') {
    return 'Protein is slightly prioritised to support fat loss and recovery.'
  }

  if (shiftType === 'night' && poorRecovery) {
    return 'Carbs are slightly moderated today for night-shift recovery.'
  }

  if (shiftType === 'night') {
    return 'Macros are tuned to support your night-shift eating pattern.'
  }

  if (goal === 'gain') {
    return 'Macros support your calorie surplus and training recovery.'
  }

  return 'Macros are balanced around your adjusted calorie target today.'
}

export function getMacroTimingTip(
  shiftType?: 'day' | 'night' | 'off' | 'early' | 'late' | 'other' | null,
): string {
  if (shiftType === 'night') {
    return 'Keep your biggest meal within 2–3 hours of waking to stabilise energy on night shifts.'
  }
  if (shiftType === 'day' || shiftType === 'early' || shiftType === 'late') {
    return 'Keep your biggest meal within 2–3 hours of waking to stabilise energy on shift days.'
  }
  return 'Keep your biggest meal within 2–3 hours of waking to stabilise energy throughout the day.'
}
