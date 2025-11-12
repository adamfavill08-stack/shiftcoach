export type ShiftLength = '8h' | '12h' | '16h'

export type ShiftPattern = {
  id: string
  label: string
}

export const PATTERNS_BY_LENGTH: Record<ShiftLength, ShiftPattern[]> = {
  '8h': [
    { id: '8h-5on-2off-days', label: '5 on / 2 off · Mon–Fri days' },
    { id: '8h-5on-2off-rotating', label: '5 on / 2 off · rotating' },
    { id: '8h-2e-2l-4off', label: '2 early / 2 late / 4 off' },
    { id: '8h-2e-2l-2n-4off', label: '2 early / 2 late / 2 nights / 4 off' },
    { id: '8h-3e-3l-6off', label: '3 early / 3 late / 6 off' },
    { id: '8h-4on-2off', label: '4 on / 2 off · rotating' },
    { id: '8h-6on-3off', label: '6 on / 3 off · rotating' },
    { id: '8h-7on-2off-7off', label: '7 on / 2 off / 7 off' },
    { id: '8h-2d-2n-4off', label: '2 days / 2 nights / 4 off · 8h' },
    { id: '8h-custom', label: 'Custom 8h pattern' },
  ],
  '12h': [
    { id: '12h-4on-4off', label: '4 on / 4 off · 12h' },
    { id: '12h-2d-2n-4off', label: '2 days / 2 nights / 4 off · 12h' },
    { id: '12h-3on-3off', label: '3 on / 3 off · 12h' },
    { id: '12h-7on-7off', label: '7 on / 7 off · 12h' },
    { id: '12h-panama-223', label: 'Panama 2–2–3 · 12h' },
    { id: '12h-du-pont', label: 'DuPont · 12h rotating' },
    { id: '12h-continental', label: 'Continental 2–2–3 · 12h' },
    { id: '12h-2d-3off-2n-3off', label: '2 days / 3 off / 2 nights / 3 off' },
    { id: '12h-3d-3n-6off', label: '3 days / 3 nights / 6 off' },
    { id: '12h-custom', label: 'Custom 12h pattern' },
  ],
  '16h': [
    { id: '16h-2on-2off', label: '2 on / 2 off · 16h' },
    { id: '16h-3on-3off', label: '3 on / 3 off · 16h' },
    { id: '16h-4on-4off', label: '4 on / 4 off · 16h' },
    { id: '16h-2d-2off-2n-3off', label: '2 long days / 2 off / 2 long nights / 3 off' },
    { id: '16h-1on-2off', label: '1 on / 2 off · 16h (very heavy shifts)' },
    { id: '16h-custom', label: 'Custom 16h pattern' },
  ],
}

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  '8h-5on-2off-days': 'Standard Mon–Fri day shifts with weekends off.',
  '8h-5on-2off-rotating': 'Five on, two off, rotating through the week.',
  '8h-2e-2l-4off': 'Good for teams mixing early and late shifts with long recovery.',
  '8h-2e-2l-2n-4off': 'Balanced rotation across early, late and nights.',
  '8h-3e-3l-6off': 'Longer blocks of early and late shifts with extended rest.',
  '8h-4on-2off': 'Classic 4 on / 2 off for 24/7 cover.',
  '8h-6on-3off': 'High-intensity pattern with regular 3-day breaks.',
  '8h-7on-2off-7off': 'Block of 7 worked days followed by a long rest block.',
  '8h-2d-2n-4off': 'Alternating days and nights with equal recovery time.',
  '8h-custom': 'Build your own 8h pattern to match your rota exactly.',
  '12h-4on-4off': 'Very common 12h rota for emergency, plant and security teams.',
  '12h-2d-2n-4off': 'Two day shifts, two nights, then four days off.',
  '12h-3on-3off': 'Simple 3 on / 3 off rhythm for 24/7 cover.',
  '12h-7on-7off': 'Intense block of seven long shifts followed by a full week off.',
  '12h-panama-223': 'Popular 2–2–3 pattern with every other weekend off.',
  '12h-du-pont': 'Continuous 24/7 DuPont rotation with regular long breaks.',
  '12h-continental': 'Continental style rotation with a repeating 2–2–3 structure.',
  '12h-2d-3off-2n-3off': 'Separates day and night blocks with three-day recovery windows.',
  '12h-3d-3n-6off': 'Three days, three nights, then six full days off.',
  '12h-custom': 'Build your own 12h pattern to match your rota exactly.',
  '16h-2on-2off': 'Long 16h shifts with equal time off for recovery.',
  '16h-3on-3off': 'Three long shifts followed by three full days off.',
  '16h-4on-4off': 'Maximises long shifts with extended rest blocks.',
  '16h-2d-2off-2n-3off': 'Split between long days and long nights with recovery between.',
  '16h-1on-2off': 'Occasional very long shifts with plenty of time off.',
  '16h-custom': 'Build your own 16h pattern for non-standard long shifts.',
}

export function getPatternDescription(patternId?: string): string {
  if (!patternId) {
    return 'We’ll tile this pattern across your year so everything stays in sync.'
  }
  return (
    PATTERN_DESCRIPTIONS[patternId] ||
    'We’ll tile this pattern across your year so everything stays in sync.'
  )
}
