import type { ShiftContextResult } from '@/lib/shift-context/types'

/** Append transition-aware context to social jetlag copy (does not replace numeric jetlag). */
export function jetlagExplanationWithShiftContext(
  baseExplanation: string,
  ctx: ShiftContextResult | null | undefined,
): string {
  if (!ctx) return baseExplanation
  const ts = ctx.transitionState
  const gm = ctx.guidanceMode

  let suffix = ''
  if (ts === 'day_to_night' || gm === 'pre_night_shift' || gm === 'transition_day_to_night') {
    suffix =
      ' With a night shift ahead, expect your sleep midpoint to move until you stabilise on that pattern.'
  } else if (ts === 'night_to_day' || gm === 'transition_night_to_day') {
    suffix =
      ' After nights, the body clock often lags for a few days — morning light and a steady wake time help.'
  } else if (gm === 'recovery_after_night' || ts === 'post_night_recovery') {
    suffix = ' On recovery days, midpoint drift is common; keep one anchor wake time when you can.'
  }

  if (!suffix) return baseExplanation
  return baseExplanation.endsWith('.') ? `${baseExplanation}${suffix}` : `${baseExplanation}. ${suffix}`
}
