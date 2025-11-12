/* eslint-disable import/prefer-default-export */

export type ShiftCode = 'day' | 'night' | 'off' | 'other'

export const PATTERN_SEQUENCES: Record<string, ShiftCode[]> = {
  '8h-custom': ['day', 'other', 'day', 'other', 'off'],
  '8h-5on2off': ['day', 'day', 'day', 'day', 'day', 'off', 'off'],
  '8h-6on3off': ['day', 'day', 'day', 'day', 'day', 'day', 'off', 'off', 'off'],
  '12h-4on4off': ['day', 'day', 'night', 'night', 'off', 'off', 'off', 'off'],
  '12h-2d2n4off': ['day', 'day', 'night', 'night', 'off', 'off', 'off', 'off'],
  '12h-panama': ['day', 'day', 'off', 'off', 'night', 'night', 'night', 'off', 'off'],
  '12h-custom': ['day', 'night', 'other', 'off'],
  '16h-2on2off': ['other', 'other', 'off', 'off'],
  '16h-weekend': ['off', 'other', 'other', 'off', 'off', 'off', 'off'],
  '16h-custom': ['other', 'off', 'off', 'other'],
  default: ['day', 'day', 'night', 'off'],
}

export function getPatternCycle(patternId: string): ShiftCode[] {
  const sequence = PATTERN_SEQUENCES[patternId]
  if (sequence && sequence.length > 0) {
    return sequence
  }
  return PATTERN_SEQUENCES.default
}
