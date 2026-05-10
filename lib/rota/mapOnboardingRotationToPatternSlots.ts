import type { ShiftSlot } from '@/lib/rota/patternSlots'

/** Maps fixed/rotating onboarding blocks to rota slot letters (12h-style day / night). */
export function mapOnboardingRotationToPatternSlots(
  rotation: readonly ('off' | 'day' | 'night')[],
): ShiftSlot[] {
  return rotation.map((r) => {
    if (r === 'off') return 'O'
    if (r === 'day') return 'D'
    return 'N'
  })
}
