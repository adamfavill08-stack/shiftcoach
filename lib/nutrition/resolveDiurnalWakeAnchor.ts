/**
 * Wake anchors for meal spacing: which clock-time sleep ends are treated as the user's
 * "main wake" vs ignored (naps, noise) vs defaulted when outside plausible windows.
 *
 * Day-centric-only rules break permanent and rotating night workers; rhythm-aware
 * windows trust afternoon wakes when context indicates night/recovery rhythms.
 */
import type { GuidanceMode, OffDayContext, TransitionState } from '@/lib/shift-context/types'

export type WakeAnchorRhythm = 'day_rhythm' | 'night_rhythm' | 'transition_to_night' | 'recovery_from_night'

/** Inclusive minutes-from-midnight (local) trust band for logged sleep end. */
type TrustWindow = { start: number; end: number }

const RHYTHM_WINDOWS: Record<WakeAnchorRhythm, TrustWindow> = {
  /** Typical day worker / off-day recovery toward days */
  day_rhythm: { start: 4 * 60, end: 10 * 60 + 30 },
  /** First night prep: allow slightly later morning wake before nap */
  transition_to_night: { start: 4 * 60, end: 11 * 60 + 30 },
  /** Post–night-shift or flip back to days: morning through afternoon */
  recovery_from_night: { start: 8 * 60, end: 17 * 60 },
  /** Night block / day sleep before nights: trust afternoon “main wake” */
  night_rhythm: { start: 11 * 60, end: 19 * 60 },
}

const RHYTHM_FALLBACK: Record<WakeAnchorRhythm, { hour: number; minute: number }> = {
  day_rhythm: { hour: 7, minute: 0 },
  transition_to_night: { hour: 7, minute: 0 },
  recovery_from_night: { hour: 12, minute: 0 },
  night_rhythm: { hour: 15, minute: 0 },
}

function minutesFromMidnightLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Infer rhythm from the same shift context that drives meal templates.
 * Keeps meal wake anchors aligned with transition / night / recovery states.
 */
export function inferWakeAnchorRhythm(args: {
  shiftType: 'day' | 'night' | 'late' | 'off'
  guidanceMode: GuidanceMode
  transitionState: TransitionState
  /** When `guidanceMode === 'off_day'`, refines wake trust bands for rotating off patterns. */
  offDayContext?: OffDayContext | null
}): WakeAnchorRhythm {
  const { shiftType, guidanceMode, transitionState, offDayContext } = args

  if (offDayContext === 'between_nights') {
    return 'night_rhythm'
  }
  if (offDayContext === 'after_final_night') {
    return 'recovery_from_night'
  }
  if (offDayContext === 'before_first_night') {
    return 'transition_to_night'
  }

  if (guidanceMode === 'transition_day_to_night' || guidanceMode === 'pre_night_shift') {
    return 'transition_to_night'
  }

  if (
    guidanceMode === 'recovery_after_night' ||
    guidanceMode === 'transition_night_to_day' ||
    transitionState === 'post_night_recovery'
  ) {
    return 'recovery_from_night'
  }

  if (shiftType === 'night' || guidanceMode === 'night_shift') {
    return 'night_rhythm'
  }

  // Off calendar day but heading into first night — still day-ish morning, not afternoon default
  if (shiftType === 'off' && transitionState === 'day_to_night') {
    return 'transition_to_night'
  }

  return 'day_rhythm'
}

/**
 * Map latest sleep end to a same-calendar-day wake time on `now` for meal slot math.
 * Uses trust windows per rhythm; outside the window uses a rhythm-specific default
 * (not always 07:00 — see `night_rhythm` / `recovery_from_night`).
 */
export function resolveWakeAnchorForMeals(
  rawWakeEnd: Date | null,
  now: Date,
  rhythm: WakeAnchorRhythm,
): Date {
  const out = new Date(now)
  const fb = RHYTHM_FALLBACK[rhythm]

  if (!rawWakeEnd || Number.isNaN(rawWakeEnd.getTime())) {
    out.setHours(fb.hour, fb.minute, 0, 0)
    return out
  }

  const rw = new Date(rawWakeEnd)
  const m = minutesFromMidnightLocal(rw)
  const { start, end } = RHYTHM_WINDOWS[rhythm]

  if (m >= start && m <= end) {
    out.setHours(rw.getHours(), rw.getMinutes(), 0, 0)
    return out
  }

  out.setHours(fb.hour, fb.minute, 0, 0)
  return out
}

/**
 * Legacy day-worker anchor: trust morning sleep end only (~04:00–10:30), else 07:00.
 * Prefer {@link resolveWakeAnchorForMeals} + {@link inferWakeAnchorRhythm} for meal APIs.
 */
export function resolveDiurnalWakeAnchor(rawWakeEnd: Date | null, now: Date): Date {
  return resolveWakeAnchorForMeals(rawWakeEnd, now, 'day_rhythm')
}

/**
 * When we have no logged sleep but model a post–night-shift day, use a typical late-morning anchor.
 */
export function resolveDefaultWakeNoSleep(now: Date, shiftType: 'day' | 'night' | 'late' | 'off'): Date {
  const out = new Date(now)
  if (shiftType === 'night') {
    out.setHours(8, 30, 0, 0)
  } else {
    out.setHours(7, 0, 0, 0)
  }
  return out
}
