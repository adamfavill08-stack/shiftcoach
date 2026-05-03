import type {
  OffDayContext,
  ShiftContextResult,
  ShiftContextSnapshot,
} from '@/lib/shift-context/types'

export function snapshotIsNightWork(s: ShiftContextSnapshot | null | undefined): boolean {
  if (!s) return false
  return s.standardType === 'night' || s.operationalKind === 'night'
}

const BEFORE_FIRST_NIGHT_MAX_H = 24

/**
 * Refines calendar off days when {@link GuidanceMode} is `off_day`.
 * Pure helper — callers should pass `guidanceMode` from the same resolver pass.
 */
export function inferOffDayContext(
  ctx: Pick<ShiftContextResult, 'guidanceMode' | 'lastCompletedShift' | 'nextShift'>,
  now: Date,
): OffDayContext {
  if (ctx.guidanceMode !== 'off_day') return 'normal_off'

  const last = ctx.lastCompletedShift
  const next = ctx.nextShift
  const lastNight = snapshotIsNightWork(last)
  const nextNight = snapshotIsNightWork(next)

  if (lastNight && nextNight) {
    return 'between_nights'
  }

  if (lastNight && !nextNight) {
    return 'after_final_night'
  }

  if (nextNight && next?.startTs) {
    const nextStart = new Date(next.startTs)
    if (!Number.isNaN(nextStart.getTime())) {
      const hoursTo = (nextStart.getTime() - now.getTime()) / (3600 * 1000)
      if (hoursTo > 0 && hoursTo <= BEFORE_FIRST_NIGHT_MAX_H && !lastNight) {
        return 'before_first_night'
      }
    }
  }

  return 'normal_off'
}

export function inferOffDayNightAnchor(
  ctx: Pick<ShiftContextResult, 'nextShift' | 'mealPlanningShift'>,
  offDayContext: OffDayContext,
): ShiftContextSnapshot | null {
  if (offDayContext !== 'before_first_night' && offDayContext !== 'between_nights') {
    return null
  }
  if (snapshotIsNightWork(ctx.nextShift)) return ctx.nextShift
  if (snapshotIsNightWork(ctx.mealPlanningShift)) return ctx.mealPlanningShift
  return null
}
