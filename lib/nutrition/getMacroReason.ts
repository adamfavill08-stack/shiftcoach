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

type TimingCoachShift = 'day' | 'night' | 'off' | 'early' | 'late' | 'other'

function daySeed(dayKey: string): number {
  let h = 0
  for (let i = 0; i < dayKey.length; i += 1) h = (h * 31 + dayKey.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pickDaily<T>(items: readonly T[], dayKey: string): T {
  return items[daySeed(dayKey) % items.length]
}

/**
 * Personalized, rota-aware coaching line for the adjusted-calories page.
 * - Uses today's shifted day key to rotate message variants daily.
 * - Uses shift kind (off/day/night/...) to keep advice context-relevant.
 */
export function getMacroTimingCoachMessage(args: {
  shiftType?: TimingCoachShift | null
  shiftedDayKey?: string | null
  firstName?: string | null
}): string {
  const shift = args.shiftType ?? 'other'
  const dayKey = args.shiftedDayKey ?? new Date().toISOString().slice(0, 10)
  const first = args.firstName?.trim()
  const intro = first ? `${first}, ` : ''

  if (shift === 'off') {
    return intro + pickDaily([
      'today is a day off, so keep meals steady and avoid late heavy eating to protect tomorrow’s energy.',
      'use your day off to keep a regular breakfast-lunch-dinner rhythm and support body-clock recovery.',
      'on off days, a consistent first meal and an earlier dinner helps keep your next shift transition smoother.',
    ] as const, dayKey)
  }

  if (shift === 'night') {
    return intro + pickDaily([
      'on night shift days, anchor your biggest meal within 2–3 hours of waking, then keep overnight meals lighter.',
      'for tonight’s shift, front-load your calories after waking and use smaller protein-led meals overnight.',
      'your best night-shift rhythm today is one main post-wake meal, then lighter meals as the shift progresses.',
    ] as const, dayKey)
  }

  if (shift === 'early' || shift === 'late' || shift === 'day') {
    return intro + pickDaily([
      'on shift days, placing your largest meal within 2–3 hours of waking helps keep energy steadier across the shift.',
      'today, start with a proper anchor meal after waking, then keep later meals more even to reduce dips.',
      'for this shift pattern, a strong early meal and predictable follow-up meals usually improves focus and appetite control.',
    ] as const, dayKey)
  }

  return intro + pickDaily([
    'keeping your biggest meal within 2–3 hours of waking usually gives steadier energy across the day.',
    'today, a clear first meal anchor and regular spacing between meals will help stabilise energy and hunger.',
    'a consistent meal rhythm today should support calmer energy and fewer sharp appetite swings.',
  ] as const, dayKey)
}
