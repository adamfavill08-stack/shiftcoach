import type { NightShiftSleepPlanResult } from '@/lib/sleep/nightShiftSleepPlan'
import { isNightLikeInstant, type WallShiftInstant } from '@/lib/sleep/sleepShiftWallClock'
import { toShiftType } from '@/lib/shifts/toShiftType'

const MS_H = 60 * 60 * 1000
const POST_NIGHT_RECOVERY_TRANSITIONS = new Set([
  'night_to_off',
  'night_to_day',
  'night_to_night',
  'no_next_shift',
])

type RotaForScope =
  | {
      state: 'ok'
      shiftJustEnded: WallShiftInstant
    }
  | { state: 'insufficient_data' }

/**
 * Standard midnight carry-over is short, but night-to-OFF recovery should stay attached to the
 * night-duty cycle until the suggested post-night sleep window has had time to finish.
 */
export function shouldKeepPreviousNightRecoveryScope(input: {
  nowMs: number
  currentShiftLabel: string | null | undefined
  previousPlan: NightShiftSleepPlanResult | null
  previousRota: RotaForScope
  timeZone: string
  shortPinMs: number
  recoveryGraceMs?: number
}): boolean {
  const { nowMs, previousPlan, previousRota, timeZone, shortPinMs } = input
  if (!previousPlan?.ok || previousPlan.suggestedSleepStartMs == null) return false
  if (!Number.isFinite(previousPlan.suggestedSleepStartMs)) return false

  if (nowMs < previousPlan.suggestedSleepStartMs + shortPinMs) return true

  if (previousRota.state !== 'ok') return false
  if (!isNightLikeInstant(previousRota.shiftJustEnded, timeZone)) return false
  if (toShiftType(input.currentShiftLabel, null) !== 'off') return false
  if (!POST_NIGHT_RECOVERY_TRANSITIONS.has(previousPlan.transition)) {
    return false
  }

  const recoveryPinUntil =
    previousPlan.suggestedSleepEndMs != null && Number.isFinite(previousPlan.suggestedSleepEndMs)
      ? previousPlan.suggestedSleepEndMs
      : previousPlan.suggestedSleepStartMs + 12 * MS_H

  return nowMs < recoveryPinUntil + (input.recoveryGraceMs ?? 2 * MS_H)
}
