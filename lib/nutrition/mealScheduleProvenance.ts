import type { GuidanceMode, OffDayContext } from '@/lib/shift-context/types'
import type { WakeAnchorRhythm } from '@/lib/nutrition/resolveDiurnalWakeAnchor'

export type MealScheduleSource = 'server' | 'client_overlay'

/** Why this schedule was shaped this way (server planner + optional client overlay). */
export type MealScheduleReason =
  | 'standard_day'
  | 'long_day'
  | 'standard_night'
  | 'transition_day_to_night'
  | 'pre_night_shift'
  | 'standard_late'
  | 'long_late'
  | 'off_normal'
  | 'off_before_first_night'
  | 'off_between_nights'
  | 'off_after_final_night'
  | 'off_permanent_night_off'
  | 'biological_night_policy'
  | 'client_transition_overlay'
  | 'client_recovery_overlay'
  | 'client_day_normal_overlay'
  | 'client_night_normal_overlay'

/** Emitted by `getTodayMealSchedule` for the API to merge into `mealScheduleMeta`. */
export type MealSchedulePlannerProvenance = {
  longShiftDay: boolean
  /** Long late shift (≥10h) template — on-shift fuel, lighter post-finish bite. */
  longShiftLate: boolean
  /** True when `applyBiologicalNightMealPolicy` ran (night shifts or off-day night-bridge patterns). */
  biologicalNightPolicyApplied: boolean
  transitionDayToNight: boolean
  preNightShift: boolean
  /** Set when `shiftType === 'off'`; see `inferOffDayContext`. */
  offDayContext: OffDayContext | null
}

export type MealScheduleMeta = {
  scheduleSource: MealScheduleSource
  scheduleReason: MealScheduleReason[]
  shiftType: 'day' | 'night' | 'late' | 'off'
  guidanceMode: GuidanceMode | null
  /** Wake anchor rhythm used for meal spacing on the server (`inferWakeAnchorRhythm`). */
  rhythmMode: WakeAnchorRhythm | null
  longShift: boolean
  /** True when a 10h+ late shift template was used. */
  longShiftLate?: boolean
  biologicalNightPolicyApplied: boolean
  transitionDayToNight: boolean
  /** Template key from `getTodayMealSchedule` (`off` | `day` | `night` | `late`). */
  templateUsed: string
  /** Same as planner provenance when `shiftType === 'off'`. */
  offDayContext?: OffDayContext | null
  /** Present when the client rebuilt the schedule on top of server output. */
  originalMealScheduleMeta?: MealScheduleMeta | null
}

export function buildMealScheduleReasons(
  p: MealSchedulePlannerProvenance,
  shiftType: 'day' | 'night' | 'late' | 'off',
): MealScheduleReason[] {
  const out: MealScheduleReason[] = []
  if (shiftType === 'day') {
    out.push(p.longShiftDay ? 'long_day' : 'standard_day')
  } else if (shiftType === 'night') {
    if (p.transitionDayToNight) out.push('transition_day_to_night')
    else if (p.preNightShift) out.push('pre_night_shift')
    else out.push('standard_night')
  } else if (shiftType === 'late') {
    out.push(p.longShiftLate ? 'long_late' : 'standard_late')
  } else if (shiftType === 'off') {
    const oc = p.offDayContext ?? 'normal_off'
    if (oc === 'before_first_night') out.push('off_before_first_night')
    else if (oc === 'between_nights') out.push('off_between_nights')
    else if (oc === 'after_final_night') out.push('off_after_final_night')
    else if (oc === 'permanent_night_off') out.push('off_permanent_night_off')
    else out.push('off_normal')
  }
  if (p.biologicalNightPolicyApplied) {
    out.push('biological_night_policy')
  }
  return out
}

export function buildServerMealScheduleMeta(args: {
  provenance: MealSchedulePlannerProvenance
  shiftType: 'day' | 'night' | 'late' | 'off'
  guidanceMode: GuidanceMode
  rhythmMode: WakeAnchorRhythm
  templateUsed: string
}): MealScheduleMeta {
  const { provenance, shiftType, guidanceMode, rhythmMode, templateUsed } = args
  return {
    scheduleSource: 'server',
    scheduleReason: buildMealScheduleReasons(provenance, shiftType),
    shiftType,
    guidanceMode,
    rhythmMode,
    longShift: provenance.longShiftDay,
    longShiftLate: provenance.longShiftLate,
    biologicalNightPolicyApplied: provenance.biologicalNightPolicyApplied,
    transitionDayToNight: provenance.transitionDayToNight,
    templateUsed,
    offDayContext: provenance.offDayContext ?? null,
  }
}
