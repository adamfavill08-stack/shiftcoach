type ShiftSlot = 'M' | 'A' | 'D' | 'N' | 'O'

const PATTERN_SLOTS: Record<string, ShiftSlot[]> = {
  '8h-5on-2off-days': ['M', 'M', 'M', 'A', 'A', 'O', 'O'],
  '8h-5on-2off-rotating': ['M', 'A', 'A', 'N', 'N', 'O', 'O'],
  '8h-2e-2l-4off': ['M', 'M', 'A', 'A', 'O', 'O', 'O', 'O'],
  '8h-2e-2l-2n-4off': ['M', 'M', 'A', 'A', 'N', 'N', 'O', 'O'],
  '8h-3e-3l-6off': ['M', 'M', 'M', 'A', 'A', 'A', 'O', 'O'],
  '8h-4on-2off': ['M', 'M', 'A', 'A', 'O', 'O'],
  '8h-6on-3off': ['M', 'M', 'M', 'A', 'A', 'A', 'O', 'O', 'O'],
  '8h-7on-2off-7off': ['M', 'M', 'M', 'M', 'A', 'A', 'A', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
  '8h-2d-2n-4off': ['M', 'M', 'N', 'N', 'O', 'O', 'O', 'O'],
  '8h-custom': ['M', 'A', 'N', 'N', 'O', 'O'],
  '12h-4on-4off': ['D', 'D', 'D', 'D', 'O', 'O', 'O', 'O'],
  '12h-2d-2n-4off': ['D', 'D', 'N', 'N', 'O', 'O', 'O', 'O'],
  '12h-3on-3off': ['D', 'D', 'D', 'O', 'O', 'O'],
  '12h-7on-7off': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
  '12h-panama-223': ['D', 'D', 'O', 'O', 'D', 'D', 'D'],
  '12h-du-pont': ['D', 'D', 'D', 'O', 'O', 'N', 'N', 'N', 'O', 'O'],
  '12h-continental': ['D', 'D', 'O', 'D', 'D', 'O', 'N', 'N', 'O'],
  '12h-2d-3off-2n-3off': ['D', 'D', 'O', 'O', 'O', 'N', 'N', 'O', 'O', 'O'],
  '12h-3d-3n-6off': ['D', 'D', 'D', 'N', 'N', 'N', 'O', 'O', 'O', 'O', 'O', 'O'],
  '12h-custom': ['D', 'D', 'N', 'N', 'O', 'O'],
  '16h-2on-2off': ['D', 'D', 'O', 'O'],
  '16h-3on-3off': ['D', 'D', 'D', 'O', 'O', 'O'],
  '16h-4on-4off': ['D', 'D', 'D', 'D', 'O', 'O', 'O', 'O'],
  '16h-2d-2off-2n-3off': ['D', 'D', 'O', 'O', 'N', 'N', 'O', 'O', 'O'],
  '16h-1on-2off': ['D', 'O', 'O'],
  '16h-custom': ['D', 'D', 'N', 'N', 'O', 'O'],
}

const DEFAULT_PREVIEW: ShiftSlot[] = ['M', 'A', 'N', 'O']

export type { ShiftSlot }

export function getPatternSlots(patternId?: string): ShiftSlot[] {
  if (!patternId) return DEFAULT_PREVIEW
  return PATTERN_SLOTS[patternId] ?? DEFAULT_PREVIEW
}
