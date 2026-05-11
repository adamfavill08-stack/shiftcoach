/**
 * Night-shift recovery sleep plan — pure logic (no I/O).
 * Mirrors the marketing Night Shift Sleep Calculator style: wind-down, commute caps,
 * prep before next shift, caffeine offset, optional nap, extended timeline via absolute ms.
 */

import {
  classifySleepPlanTransition,
  eveningBedFloorYmd,
  EVENING_MAIN_BED_FLOOR_MINUTES_DEFAULT,
  EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED,
  gapMsAnchorEndToSleepStart,
  isoDateInTimeZone,
  isNightLikeInstant,
  LONG_REST_GAP_BEFORE_SLEEP_MS,
  OPEN_RECOVERY_MAX_MS,
  SHIFT_END_TO_NIGHT_START_FOR_PREFERRED_FLOOR_MS,
  TIGHT_SAME_LOCAL_DAY_DAY_TO_NIGHT_MS,
  TIGHT_TURNAROUND_MS,
  type SleepPlanTransition,
  utcMsAtLocalWallOnDate,
} from '@/lib/sleep/sleepShiftWallClock'
import {
  parsePostNightSleepToWallMinutes,
  resolvePostNightAsleepByUtcMs,
} from '@/lib/sleep/postNightSleepHabit'

import { resolveForcedDayToNightPreNightNapWindow } from '@/lib/sleep/forcedDayToNightNap'

export { resolveForcedDayToNightPreNightNapWindow }

export const DAY_MINUTES = 24 * 60

export const WIND_DOWN_MINUTES = 30
export const MAX_COMMUTE_MINUTES = 45
export const PREP_BEFORE_NEXT_SHIFT = 60
export const NAP_END_BEFORE_SHIFT = 90
export const NAP_LENGTH = 25
export const MIN_SLEEP_MINUTES = 240
export const MAX_TARGET_SLEEP_MINUTES = 600
export const DEFAULT_TARGET_SLEEP_H = 7

/** After work before a night block — minimum time after shift end (still combined with local evening floor for pre-night). */
export const POST_DAY_BEFORE_NIGHT_MIN_REST_MS = (3 * 60 + 30) * 60 * 1000 // 3.5h

/** Pre-night nap: ends this long before night shift start; duration up to this (may shorten to avoid overlap). */
export const PRE_NIGHT_NAP_WAKE_BEFORE_SHIFT_MS = 90 * 60 * 1000
export const PRE_NIGHT_NAP_DURATION_MS = 90 * 60 * 1000
const NAP_AFTER_MAIN_GAP_MS = 15 * 60 * 1000
const MIN_PRE_NIGHT_NAP_MS = 20 * 60 * 1000

export type { SleepPlanTransition } from '@/lib/sleep/sleepShiftWallClock'

const MS_MIN = 60_000
const MS_H = 60 * MS_MIN

export type CaffeineSensitivity = 'low' | 'medium' | 'high'

export function caffeineOffsetBeforeSleep(s: CaffeineSensitivity): number {
  const hours = s === 'low' ? 4 : s === 'medium' ? 6 : 8
  return hours * 60
}

/** Parse "HH:mm" or "H:mm" to minutes from midnight (0–1439 typical; allows larger for extended UI). */
export function parseToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 47 || min < 0 || min > 59) {
    return null
  }
  return h * 60 + min
}

export function fmtClock(minutesFromMidnight: number, opts?: { nextDay?: boolean }): string {
  let m = minutesFromMidnight % DAY_MINUTES
  if (m < 0) m += DAY_MINUTES
  const h = Math.floor(m / 60)
  const mm = m % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(mm)}${opts?.nextDay ? ' (+1)' : ''}`
}

export type ShiftInstant = {
  label: string
  date: string
  startMs: number
  endMs: number
}

export type SleepInterval = { startMs: number; endMs: number }

export type NightShiftSleepPlanInput = {
  shiftJustEnded: ShiftInstant | null
  nextShift: ShiftInstant | null
  /** One-way commute (minutes), capped in compute */
  commuteMinutes: number
  targetSleepMinutes: number
  caffeineSensitivity: CaffeineSensitivity
  loggedMainSleep: SleepInterval | null
  loggedNaps: SleepInterval[]
  /** IANA zone for wall-clock rules. */
  timeZone?: string
  /** True when anchor was synthesised (e.g. rest/off day before night with no prior work row). */
  restAnchorSynthetic?: boolean
  /** Optional shortfall vs target — high debt relaxes the local evening bed floor. */
  sleepDebtMinutes?: number | null
  /**
   * Latest instant the user should wake for main sleep (ms UTC), e.g. prep + commute before
   * **tonight’s** night shift when rota `nextShift` resolved to a later calendar row.
   */
  forcedLatestWakeMs?: number | null
  /**
   * Preferred main-sleep start (UTC ms) from the page resolver — duty-relative for real nights, or
   * scope-day+1 when synthetic/off. Ignored for real nights when duty-relative resolve is recomputed
   * here and null (see `allowPagePreferredRaw`).
   */
  postNightPreferredStartUtcMs?: number | null
  /**
   * @deprecated Prefer `postNightPreferredStartUtcMs`. Scope civil day after chart day when synthetic/off.
   */
  postNightPreferredStartTomorrowUtcMs?: number | null
  /** Profile `post_night_sleep` raw string for duty resolve and outside-window copy. */
  postNightSleepRaw?: string | null
}

export type PlanFeedbackCode =
  | 'overlap_shift'
  | 'shorter_than_planned'
  | 'wake_close_next_shift'
  | 'missing_next_shift'
  | 'missing_prior_shift'
  | 'tight_recovery_window'
  | 'tight_recovery_before_night'
  | 'open_ended_recovery'
  | 'pre_night_plan_split'
  | 'pre_night_avoid_rush_bed'
  | 'pre_night_nap_timing'
  | 'pre_night_nap_adjusted'
  | 'sleep_debt_earlier_recovery'
  | 'post_night_profile_outside_window'
  | 'none'

export type NightShiftSleepPlanResult = {
  ok: boolean
  reason?: 'no_main_sleep' | 'no_prior_shift'

  transition: SleepPlanTransition
  /** i18n key, e.g. sleepPlan.transition.night_to_day */
  transitionSummaryKey: string

  earliestSleepStartMs: number | null
  latestWakeMs: number | null
  suggestedSleepStartMs: number | null
  suggestedSleepEndMs: number | null
  /** Modelled main-sleep duration (ms) in the available window */
  modelSleepMs: number

  caffeineCutoffMs: number | null

  napSuggested: boolean
  napWindowStartMs: number | null
  napWindowEndMs: number | null

  feedback: Array<{ code: PlanFeedbackCode; severity: 'info' | 'warn' }>

  /** Stable keys for i18n / “how calculated” */
  calculationStepKeys: string[]
}

function clampTargetMinutes(raw: number): number {
  const n = Math.round(raw)
  if (!Number.isFinite(n) || n <= 0) return Math.round(DEFAULT_TARGET_SLEEP_H * 60)
  return Math.min(MAX_TARGET_SLEEP_MINUTES, Math.max(MIN_SLEEP_MINUTES, n))
}

function intervalsOverlap(a: SleepInterval, b: { startMs: number; endMs: number }): boolean {
  return a.startMs < b.endMs && a.endMs > b.startMs
}

const WAKE_BUFFER_MS = 15 * MS_MIN
const DEBT_RELAX_SOCIAL_MIN = 120

function preNightFamily(t: SleepPlanTransition): boolean {
  return t === 'dayish_work_to_night' || t === 'early_to_night' || t === 'off_to_night'
}

export function computeNightShiftSleepPlan(input: NightShiftSleepPlanInput): NightShiftSleepPlanResult {
  const feedback: NightShiftSleepPlanResult['feedback'] = []
  const stepKeys: string[] = []

  if (!input.loggedMainSleep) {
    return {
      ok: false,
      reason: 'no_main_sleep',
      transition: 'other',
      transitionSummaryKey: 'sleepPlan.transition.unavailable',
      earliestSleepStartMs: null,
      latestWakeMs: null,
      suggestedSleepStartMs: null,
      suggestedSleepEndMs: null,
      modelSleepMs: 0,
      caffeineCutoffMs: null,
      napSuggested: false,
      napWindowStartMs: null,
      napWindowEndMs: null,
      feedback: [{ code: 'none', severity: 'info' }],
      calculationStepKeys: ['sleepPlan.calc.noMainSleep'],
    }
  }

  const log = input.loggedMainSleep
  const timeZone = (input.timeZone ?? 'UTC').trim() || 'UTC'
  const commute = Math.min(Math.max(0, input.commuteMinutes), MAX_COMMUTE_MINUTES)
  const commuteMs = commute * MS_MIN
  const targetMin = clampTargetMinutes(input.targetSleepMinutes)
  let targetMs = targetMin * MS_MIN
  const restSynthetic = Boolean(input.restAnchorSynthetic)
  const debtMin = input.sleepDebtMinutes
  const debtHigh = typeof debtMin === 'number' && Number.isFinite(debtMin) && debtMin >= DEBT_RELAX_SOCIAL_MIN

  if (!input.shiftJustEnded) {
    feedback.push({ code: 'missing_prior_shift', severity: 'info' })
    return {
      ok: false,
      reason: 'no_prior_shift',
      transition: 'other',
      transitionSummaryKey: 'sleepPlan.transition.unavailable',
      earliestSleepStartMs: null,
      latestWakeMs: null,
      suggestedSleepStartMs: null,
      suggestedSleepEndMs: null,
      modelSleepMs: 0,
      caffeineCutoffMs: null,
      napSuggested: false,
      napWindowStartMs: null,
      napWindowEndMs: null,
      feedback,
      calculationStepKeys: ['sleepPlan.calc.needShiftBeforeSleep'],
    }
  }

  const shift = input.shiftJustEnded
  const transition = classifySleepPlanTransition({
    anchor: shift,
    next: input.nextShift,
    timeZone,
    offAnchorSynthetic: restSynthetic,
  })
  const transitionSummaryKey = `sleepPlan.transition.${transition}`

  const shiftBlock = { startMs: shift.startMs, endMs: shift.endMs }
  if (intervalsOverlap(log, shiftBlock)) {
    feedback.push({ code: 'overlap_shift', severity: 'warn' })
  }

  const homeArrivalMs = shift.endMs + commuteMs
  let earliestSleepStartMs = homeArrivalMs + WIND_DOWN_MINUTES * MS_MIN
  stepKeys.push('sleepPlan.calc.shiftEnd', 'sleepPlan.calc.commuteHome', 'sleepPlan.calc.windDown')

  let latestWakeMs: number | null = null
  if (input.nextShift) {
    latestWakeMs = input.nextShift.startMs - PREP_BEFORE_NEXT_SHIFT * MS_MIN - commuteMs
    stepKeys.push('sleepPlan.calc.nextShift', 'sleepPlan.calc.prepCommute')
    if (latestWakeMs <= log.endMs + WAKE_BUFFER_MS) {
      feedback.push({ code: 'wake_close_next_shift', severity: 'warn' })
    }
  } else {
    stepKeys.push('sleepPlan.calc.noNextShift')
  }

  const forcedCap = input.forcedLatestWakeMs
  if (typeof forcedCap === 'number' && Number.isFinite(forcedCap)) {
    if (latestWakeMs == null || forcedCap < latestWakeMs) {
      latestWakeMs = forcedCap
      stepKeys.push('sleepPlan.calc.forcedWakeCapDutyTonight')
    }
  }

  const gapMs = gapMsAnchorEndToSleepStart(shift, log.startMs)
  const pNight = preNightFamily(transition)

  if (!input.nextShift && transition !== 'night_to_off' && transition !== 'no_next_shift') {
    feedback.push({ code: 'missing_next_shift', severity: 'info' })
  }

  let tightSameLocalDayNight = false
  if (pNight && input.nextShift && latestWakeMs != null) {
    const gapToNight = input.nextShift.startMs - shift.endMs
    const dEnd = isoDateInTimeZone(shift.endMs, timeZone)
    const dNight = isoDateInTimeZone(input.nextShift.startMs, timeZone)
    tightSameLocalDayNight = dEnd === dNight && gapToNight < TIGHT_SAME_LOCAL_DAY_DAY_TO_NIGHT_MS
    if (tightSameLocalDayNight) {
      feedback.push({ code: 'tight_recovery_before_night', severity: 'warn' })
      stepKeys.push('sleepPlan.calc.tightBeforeNight')
    }

    const socialMs = shift.endMs + POST_DAY_BEFORE_NIGHT_MIN_REST_MS
    const capLatestStartForMinSleep = latestWakeMs - MIN_SLEEP_MINUTES * MS_MIN
    const relaxEveningFloor =
      debtHigh ||
      tightSameLocalDayNight ||
      latestWakeMs - earliestSleepStartMs < MIN_SLEEP_MINUTES * MS_MIN + 3 * MS_H

    if (debtHigh) {
      feedback.push({ code: 'sleep_debt_earlier_recovery', severity: 'info' })
      stepKeys.push('sleepPlan.calc.sleepDebtEveningRelax')
    }

    let floorMin = Math.max(earliestSleepStartMs, socialMs)

    if (!relaxEveningFloor) {
      const ymd = eveningBedFloorYmd(shift.endMs, input.nextShift.startMs, timeZone)
      const usePreferred = gapToNight >= SHIFT_END_TO_NIGHT_START_FOR_PREFERRED_FLOOR_MS
      const wallMin = usePreferred ? EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED : EVENING_MAIN_BED_FLOOR_MINUTES_DEFAULT
      const centerMs = shift.endMs + Math.floor(gapToNight / 2)
      const eveningUtc = utcMsAtLocalWallOnDate(ymd, wallMin, timeZone, centerMs)
      if (eveningUtc != null) {
        floorMin = Math.max(floorMin, eveningUtc)
        stepKeys.push('sleepPlan.calc.preNightEveningFloor')
      }
      if (transition !== 'off_to_night') {
        stepKeys.push('sleepPlan.calc.preNightEvening')
      }
    }

    if (transition === 'off_to_night') {
      stepKeys.push('sleepPlan.calc.preNightOff')
    }

    if (floorMin > capLatestStartForMinSleep) {
      floorMin = Math.max(earliestSleepStartMs, socialMs, Math.min(capLatestStartForMinSleep, latestWakeMs - MS_H))
      stepKeys.push('sleepPlan.calc.preNightEveningRelaxed')
    }

    if (floorMin <= latestWakeMs - MIN_SLEEP_MINUTES * MS_MIN) {
      earliestSleepStartMs = floorMin
    } else {
      earliestSleepStartMs = Math.max(earliestSleepStartMs, floorMin)
    }
  }

  if (pNight && input.nextShift && latestWakeMs != null && gapMs > LONG_REST_GAP_BEFORE_SLEEP_MS) {
    const longGapFloor = Math.min(log.startMs - 3 * MS_H, input.nextShift.startMs - 24 * MS_H)
    const room = latestWakeMs - MIN_SLEEP_MINUTES * MS_MIN
    const raised = Math.max(earliestSleepStartMs, longGapFloor)
    if (raised < room && raised > earliestSleepStartMs) {
      earliestSleepStartMs = raised
      stepKeys.push('sleepPlan.calc.preNightLongGap')
    }
  }

  if (pNight && input.nextShift && latestWakeMs != null) {
    const availableMs = latestWakeMs - earliestSleepStartMs
    if (availableMs >= 8 * MS_H) {
      const floor8 = 8 * MS_H
      const cap9 = 9 * MS_H
      targetMs = Math.min(Math.max(targetMs, floor8), cap9)
      stepKeys.push('sleepPlan.calc.preNightTargetBand')
    }
  }

  /** When a wake cap (e.g. duty tonight) is tighter than the pre-night evening floor, pull bed time earlier so the window is non-empty. */
  if (latestWakeMs != null) {
    const maxStartForMinSleep = latestWakeMs - MIN_SLEEP_MINUTES * MS_MIN
    const minStart = homeArrivalMs + WIND_DOWN_MINUTES * MS_MIN
    if (earliestSleepStartMs > maxStartForMinSleep && maxStartForMinSleep >= minStart) {
      earliestSleepStartMs = maxStartForMinSleep
      stepKeys.push('sleepPlan.calc.relaxedEarliestForWakeCap')
      feedback.push({ code: 'tight_recovery_window', severity: 'warn' })
    }
  }

  const turnaroundMs =
    input.nextShift != null ? input.nextShift.startMs - shift.endMs : Number.POSITIVE_INFINITY
  if (
    input.nextShift &&
    Number.isFinite(turnaroundMs) &&
    turnaroundMs < TIGHT_TURNAROUND_MS &&
    (transition === 'late_to_early' || transition === 'night_to_day')
  ) {
    feedback.push({ code: 'tight_recovery_window', severity: 'warn' })
    stepKeys.push('sleepPlan.calc.tightTurnaround')
  }

  let suggestedSleepEndMs: number | null = null
  let suggestedSleepStartMs: number | null = null
  let modelSleepMs = 0

  const hasCappedWindow = latestWakeMs != null && latestWakeMs > earliestSleepStartMs

  if (hasCappedWindow) {
    const availableMs = latestWakeMs! - earliestSleepStartMs
    suggestedSleepStartMs = earliestSleepStartMs
    const targetCapped = Math.min(targetMs, availableMs)
    const idealEndMs = earliestSleepStartMs + targetCapped
    suggestedSleepEndMs = Math.min(idealEndMs, latestWakeMs!)
    modelSleepMs = suggestedSleepEndMs - suggestedSleepStartMs

    if (modelSleepMs < MIN_SLEEP_MINUTES * MS_MIN && availableMs >= MIN_SLEEP_MINUTES * MS_MIN) {
      suggestedSleepEndMs = Math.min(earliestSleepStartMs + MIN_SLEEP_MINUTES * MS_MIN, latestWakeMs!)
      modelSleepMs = suggestedSleepEndMs - suggestedSleepStartMs
    }
    stepKeys.push('sleepPlan.calc.windowFit')
  } else if (latestWakeMs != null) {
    suggestedSleepEndMs = null
    suggestedSleepStartMs = null
    modelSleepMs = 0
    stepKeys.push('sleepPlan.calc.noRoom')
  } else {
    suggestedSleepStartMs = earliestSleepStartMs
    const dur = Math.min(targetMs, OPEN_RECOVERY_MAX_MS)
    suggestedSleepEndMs = earliestSleepStartMs + dur
    modelSleepMs = dur
    stepKeys.push('sleepPlan.calc.openEndedRecovery')
    feedback.push({ code: 'open_ended_recovery', severity: 'info' })
  }

  // Open-ended recovery can extend past an upcoming night start when `nextShift` was missing from
  // rota resolution; re-apply the same wake cap as `latestWakeMs` whenever we do have a next block.
  if (
    input.nextShift != null &&
    suggestedSleepStartMs != null &&
    suggestedSleepEndMs != null &&
    Number.isFinite(input.nextShift.startMs)
  ) {
    const wakeCapMs =
      input.nextShift.startMs - PREP_BEFORE_NEXT_SHIFT * MS_MIN - commuteMs
    if (Number.isFinite(wakeCapMs) && suggestedSleepEndMs > wakeCapMs) {
      suggestedSleepEndMs = wakeCapMs
      if (suggestedSleepEndMs <= suggestedSleepStartMs) {
        suggestedSleepEndMs = null
        suggestedSleepStartMs = null
        modelSleepMs = 0
        feedback.push({ code: 'tight_recovery_window', severity: 'warn' })
        stepKeys.push('sleepPlan.calc.clampedRemovedNoRoom')
      } else {
        modelSleepMs = suggestedSleepEndMs - suggestedSleepStartMs
        if (modelSleepMs < targetMs * 0.85) {
          feedback.push({ code: 'wake_close_next_shift', severity: 'info' })
        }
        stepKeys.push('sleepPlan.calc.clampedBeforeUpcomingWork')
      }
    }
  }

  const anchorWasNight = isNightLikeInstant(shift, timeZone)
  const homeArrivalPlusWindDownMs = shift.endMs + commuteMs + WIND_DOWN_MINUTES * MS_MIN
  const isPostNightTransition =
    transition === 'night_to_off' ||
    transition === 'night_to_day' ||
    transition === 'night_to_night' ||
    transition === 'no_next_shift'

  const preferredPostNightStartMsRaw =
    input.postNightPreferredStartUtcMs ?? input.postNightPreferredStartTomorrowUtcMs
  const profileWallParsed = parsePostNightSleepToWallMinutes(input.postNightSleepRaw ?? null)
  const preferredFromProfileDuty =
    profileWallParsed != null &&
    anchorWasNight &&
    isPostNightTransition &&
    !restSynthetic
      ? resolvePostNightAsleepByUtcMs(shift.endMs, input.postNightSleepRaw, timeZone)
      : null
  const allowPagePreferredRaw =
    !anchorWasNight ||
    !isPostNightTransition ||
    restSynthetic ||
    preferredFromProfileDuty != null
  const preferredPostNightStartMs =
    preferredFromProfileDuty ??
    (allowPagePreferredRaw &&
    preferredPostNightStartMsRaw != null &&
    Number.isFinite(preferredPostNightStartMsRaw)
      ? preferredPostNightStartMsRaw
      : null)

  const preferredIsUsable =
    preferredPostNightStartMs != null &&
    preferredPostNightStartMs >= shift.endMs - MS_H &&
    preferredPostNightStartMs <= shift.endMs + 18 * MS_H

  if (anchorWasNight && isPostNightTransition) {
    const baseStartMs = preferredIsUsable
      ? Math.max(preferredPostNightStartMs!, homeArrivalPlusWindDownMs)
      : homeArrivalPlusWindDownMs

    suggestedSleepStartMs = baseStartMs

    let wakeCap: number | null =
      latestWakeMs != null && Number.isFinite(latestWakeMs) ? latestWakeMs : null
    if (input.nextShift != null && Number.isFinite(input.nextShift.startMs)) {
      const dutyWakeCap =
        input.nextShift.startMs - PREP_BEFORE_NEXT_SHIFT * MS_MIN - commuteMs
      if (Number.isFinite(dutyWakeCap)) {
        wakeCap = wakeCap == null ? dutyWakeCap : Math.min(wakeCap, dutyWakeCap)
      }
    }

    const openCeiling =
      wakeCap != null && Number.isFinite(wakeCap)
        ? wakeCap
        : baseStartMs + OPEN_RECOVERY_MAX_MS

    let endAt = Math.min(baseStartMs + targetMs, openCeiling)

    if (wakeCap != null && Number.isFinite(wakeCap) && endAt > wakeCap) {
      endAt = wakeCap
      suggestedSleepStartMs = Math.max(homeArrivalPlusWindDownMs, endAt - targetMs)
    }

    if (endAt > suggestedSleepStartMs!) {
      suggestedSleepEndMs = endAt
      modelSleepMs = endAt - suggestedSleepStartMs!
      const profileParsed = parsePostNightSleepToWallMinutes(input.postNightSleepRaw ?? null) != null
      const profileBeforeCommuteWindDownFloor =
        preferredIsUsable &&
        preferredPostNightStartMs != null &&
        preferredPostNightStartMs < homeArrivalPlusWindDownMs
      if (profileBeforeCommuteWindDownFloor) {
        stepKeys.push('sleepPlan.calc.postNightProfileAdjustedCommuteWindDown')
      } else if (preferredIsUsable) {
        stepKeys.push('sleepPlan.calc.postNightProfileSavedTime')
      } else if (profileParsed) {
        stepKeys.push('sleepPlan.calc.postNightProfileOutsideWindow')
        feedback.push({ code: 'post_night_profile_outside_window', severity: 'info' })
      }
      if (modelSleepMs < targetMs * 0.85) {
        feedback.push({ code: 'shorter_than_planned', severity: 'info' })
      }
    } else {
      suggestedSleepEndMs = null
      suggestedSleepStartMs = null
      modelSleepMs = 0
      feedback.push({ code: 'tight_recovery_window', severity: 'warn' })
      stepKeys.push('sleepPlan.calc.postNightOnboardingNoRoom')
    }
  }

  const loggedMs = log.endMs - log.startMs
  if (modelSleepMs > 0 && loggedMs < modelSleepMs * 0.9) {
    feedback.push({ code: 'shorter_than_planned', severity: 'info' })
  }

  const offsetMin = caffeineOffsetBeforeSleep(input.caffeineSensitivity)
  let caffeineCutoffMs: number | null = null

  const plannedMinutes = modelSleepMs / MS_MIN
  let napSuggested = false
  let napWindowStartMs: number | null = null
  let napWindowEndMs: number | null = null

  if (input.nextShift && latestWakeMs != null) {
    if (pNight) {
      const afterShiftHome = shift.endMs + commuteMs
      const nightStartMs = input.nextShift.startMs
      const idealNapEndMs = nightStartMs - PRE_NIGHT_NAP_WAKE_BEFORE_SHIFT_MS
      let napEndMs = Math.min(nightStartMs - 1, idealNapEndMs)
      let napStartMs = napEndMs - PRE_NIGHT_NAP_DURATION_MS
      napStartMs = Math.max(napStartMs, afterShiftHome)

      if (suggestedSleepStartMs != null && suggestedSleepEndMs != null) {
        const mainStart = suggestedSleepStartMs
        const mainEnd = suggestedSleepEndMs
        const afterMain = mainEnd + NAP_AFTER_MAIN_GAP_MS
        const overlapsMain = napStartMs < mainEnd && napEndMs > mainStart

        if (overlapsMain) {
          napEndMs = idealNapEndMs
          napStartMs = Math.max(afterMain, napEndMs - PRE_NIGHT_NAP_DURATION_MS)
          if (napEndMs - napStartMs < MIN_PRE_NIGHT_NAP_MS || napStartMs >= napEndMs) {
            napEndMs = Math.min(idealNapEndMs, mainStart - NAP_AFTER_MAIN_GAP_MS)
            napStartMs = napEndMs - PRE_NIGHT_NAP_DURATION_MS
            napStartMs = Math.max(napStartMs, afterShiftHome)
            if (napEndMs <= mainStart - NAP_AFTER_MAIN_GAP_MS && napEndMs - napStartMs >= MIN_PRE_NIGHT_NAP_MS) {
              stepKeys.push('sleepPlan.calc.preNightNapBeforeMain')
            }
          }
        }

        if (napStartMs < mainEnd && napEndMs > mainStart) {
          napEndMs = Math.min(napEndMs, mainStart - NAP_AFTER_MAIN_GAP_MS)
          napStartMs = napEndMs - PRE_NIGHT_NAP_DURATION_MS
          napStartMs = Math.max(napStartMs, afterShiftHome)
          if (napEndMs - napStartMs >= MIN_PRE_NIGHT_NAP_MS) {
            feedback.push({ code: 'pre_night_nap_adjusted', severity: 'info' })
            stepKeys.push('sleepPlan.calc.preNightNapShortened')
          }
        }
      }

      if (intervalsOverlap(log, { startMs: napStartMs, endMs: napEndMs })) {
        napStartMs = Math.max(napStartMs, log.endMs)
      }
      const napDur = napEndMs - napStartMs
      if (napDur >= MIN_PRE_NIGHT_NAP_MS && napStartMs < napEndMs && napEndMs <= input.nextShift.startMs) {
        napWindowStartMs = napStartMs
        napWindowEndMs = napEndMs
        napSuggested = true
        stepKeys.push('sleepPlan.calc.preNightNapDynamic')
        stepKeys.push('sleepPlan.calc.preNightSplit')
        feedback.push({ code: 'pre_night_plan_split', severity: 'info' })
        feedback.push({ code: 'pre_night_avoid_rush_bed', severity: 'info' })
        feedback.push({ code: 'pre_night_nap_timing', severity: 'info' })
        if (napDur < PRE_NIGHT_NAP_DURATION_MS - MS_MIN) {
          feedback.push({ code: 'pre_night_nap_adjusted', severity: 'info' })
          stepKeys.push('sleepPlan.calc.preNightNapShortened')
        }
      } else {
        napWindowStartMs = null
        napWindowEndMs = null
        napSuggested = false
      }
    } else {
      napWindowEndMs = input.nextShift.startMs - NAP_END_BEFORE_SHIFT * MS_MIN
      napWindowStartMs = napWindowEndMs - NAP_LENGTH * MS_MIN
      const shortfall = Math.round(targetMs / MS_MIN) - plannedMinutes
      const napThreshold = transition === 'night_to_night' ? 25 : 30
      napSuggested =
        shortfall >= napThreshold &&
        napWindowStartMs >= log.endMs - 2 * MS_MIN &&
        napWindowEndMs <= input.nextShift.startMs &&
        napWindowStartMs < napWindowEndMs
      if (napSuggested) stepKeys.push('sleepPlan.calc.nap')
    }

    const dayToNightForceNapTransition =
      transition === 'dayish_work_to_night' || transition === 'early_to_night'

    if (dayToNightForceNapTransition && !napSuggested) {
      const forced = resolveForcedDayToNightPreNightNapWindow({
        nightStartMs: input.nextShift.startMs,
        afterShiftHome: shift.endMs + commuteMs,
        logStartMs: log.startMs,
        logEndMs: log.endMs,
        mainStartMs: suggestedSleepStartMs,
        mainEndMs: suggestedSleepEndMs,
      })
      if (forced) {
        napWindowStartMs = forced.startMs
        napWindowEndMs = forced.endMs
        napSuggested = true
        if (!stepKeys.includes('sleepPlan.calc.preNightNapDynamic')) {
          stepKeys.push('sleepPlan.calc.preNightNapDynamic')
        }
        stepKeys.push('sleepPlan.calc.preNightSplit')
        stepKeys.push('sleepPlan.calc.dayToNightNapAlways')
        feedback.push({ code: 'pre_night_nap_timing', severity: 'info' })
        feedback.push({ code: 'pre_night_plan_split', severity: 'info' })
        feedback.push({ code: 'pre_night_avoid_rush_bed', severity: 'info' })
        if (forced.endMs - forced.startMs < PRE_NIGHT_NAP_DURATION_MS - MS_MIN) {
          feedback.push({ code: 'pre_night_nap_adjusted', severity: 'info' })
          stepKeys.push('sleepPlan.calc.preNightNapShortened')
        }
      }
    }
  }

  if (suggestedSleepStartMs != null || (napSuggested && napWindowStartMs != null && pNight)) {
    let cut =
      suggestedSleepStartMs != null
        ? suggestedSleepStartMs - offsetMin * MS_MIN
        : (napWindowStartMs as number) - offsetMin * MS_MIN
    if (napSuggested && napWindowStartMs != null && pNight && suggestedSleepStartMs != null) {
      cut = Math.min(cut, napWindowStartMs - offsetMin * MS_MIN)
    }
    caffeineCutoffMs = cut
    stepKeys.push('sleepPlan.calc.caffeine')
    if (napSuggested && pNight) stepKeys.push('sleepPlan.calc.caffeinePreNight')
  }

  if (feedback.length === 0) {
    feedback.push({ code: 'none', severity: 'info' })
  }

  return {
    ok: true,
    transition,
    transitionSummaryKey,
    earliestSleepStartMs,
    latestWakeMs,
    suggestedSleepStartMs,
    suggestedSleepEndMs,
    modelSleepMs,
    caffeineCutoffMs,
    napSuggested,
    napWindowStartMs,
    napWindowEndMs,
    feedback,
    calculationStepKeys: stepKeys,
  }
}
