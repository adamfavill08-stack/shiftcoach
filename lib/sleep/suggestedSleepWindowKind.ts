import type { SleepPlanTransition } from '@/lib/sleep/sleepShiftWallClock'
import { isNightLikeInstant, type WallShiftInstant } from '@/lib/sleep/sleepShiftWallClock'

/**
 * What kind of main-sleep window the planner is recommending — drives copy and expectations
 * (post-shift vs civil night off-day vs pre–next shift, etc.).
 */
export type SuggestedSleepWindowKind =
  | 'post_shift_recovery'
  | 'reset_after_final_night'
  | 'off_day_overnight_recovery'
  | 'pre_next_shift_bedtime'
  | 'pre_night_shift_preparation'
  | 'nap_only'
  | 'none'

function isPreNightTransition(t: SleepPlanTransition): boolean {
  return t === 'dayish_work_to_night' || t === 'early_to_night' || t === 'off_to_night'
}

/**
 * Classify the night-shift engine result (shift-anchored paths only — not consecutive-off builder).
 */
export function classifyNightShiftSleepWindowKind(input: {
  transition: SleepPlanTransition
  napSuggested: boolean
  napWindowStartMs: number | null
  napWindowEndMs: number | null
  suggestedSleepStartMs: number | null
  suggestedSleepEndMs: number | null
  modelSleepMs: number
}): SuggestedSleepWindowKind {
  const hasMain =
    input.suggestedSleepStartMs != null &&
    input.suggestedSleepEndMs != null &&
    Number.isFinite(input.suggestedSleepStartMs) &&
    Number.isFinite(input.suggestedSleepEndMs) &&
    input.modelSleepMs > 0

  const hasNap =
    input.napSuggested &&
    input.napWindowStartMs != null &&
    input.napWindowEndMs != null &&
    input.napWindowEndMs > input.napWindowStartMs

  if (!hasMain && !hasNap) return 'none'
  if (!hasMain && hasNap) return 'nap_only'

  if (isPreNightTransition(input.transition)) return 'pre_night_shift_preparation'

  if (input.transition === 'night_to_off' || input.transition === 'no_next_shift') {
    return 'reset_after_final_night'
  }

  if (input.transition === 'late_to_early') return 'pre_next_shift_bedtime'

  return 'post_shift_recovery'
}

/** Consecutive civil days off — window is not immediate post-shift recovery. */
export function classifyConsecutiveOffDayWindowKind(
  nextShift: WallShiftInstant | null | undefined,
  timeZone: string,
): SuggestedSleepWindowKind {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  if (!nextShift) return 'off_day_overnight_recovery'
  if (isNightLikeInstant(nextShift, tz)) return 'pre_night_shift_preparation'
  return 'pre_next_shift_bedtime'
}

export function transitionSummaryKeyForOffDayKind(kind: SuggestedSleepWindowKind): string {
  switch (kind) {
    case 'pre_night_shift_preparation':
      return 'sleepPlan.transition.dayOffBeforeNight'
    case 'pre_next_shift_bedtime':
      return 'sleepPlan.transition.dayOffBeforeWork'
    default:
      return 'sleepPlan.transition.day_off_normal'
  }
}
