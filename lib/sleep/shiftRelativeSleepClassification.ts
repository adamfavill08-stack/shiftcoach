/**
 * Shift-relative sleep classification: every sleep block is interpreted from
 * nearest previous / upcoming work instants and timing features — not from
 * calendar scope labels alone.
 */

import { estimateShiftRowBounds, operationalKindFromStandard, type ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { formatYmdInTimeZone, rowCountsAsPrimarySleep } from '@/lib/sleep/utils'
import { isNightLikeInstant } from '@/lib/sleep/sleepShiftWallClock'
import { toShiftType } from '@/lib/shifts/toShiftType'
import type { ShiftInstant } from '@/lib/sleep/nightShiftSleepPlan'

const MS_MIN = 60_000
const MS_H = 60 * MS_MIN
/** Same grace as legacy sleep-start anchoring: shift end may be slightly after nominal bed time. */
const SLEEP_START_ANCHOR_GRACE_MS = 45 * MS_MIN
/** “Quick turnaround” between consecutive work blocks (prev end → next start). */
const QUICK_TURNAROUND_PREV_NEXT_MS = 16 * MS_H
const NAP_MAX_MINUTES = 180
const MAIN_MIN_MINUTES = 240
const PRE_SHIFT_LOOKAHEAD_MS = 12 * MS_H
const PRE_NIGHT_LOOKAHEAD_MS = 18 * MS_H
const POST_NIGHT_RECOVERY_MAX_GAP_MS = 14 * MS_H

export type ShiftRelativeSleepClass =
  | 'pre_shift_sleep'
  | 'post_shift_recovery_sleep'
  | 'pre_shift_nap'
  | 'recovery_nap'
  | 'off_day_main_sleep'
  | 'transition_sleep'

export type ShiftRelativeRecoveryState = 'on_track' | 'a_little_short' | 'recovery_needed' | 'reset_mode'

export type ShiftRelativeSleepFeatures = {
  minutesSincePreviousShiftEnded: number | null
  minutesUntilNextShiftStarts: number | null
  sleepDurationMinutes: number
  sleepStartsOnOffDay: boolean
  sleepEndsOnOffDay: boolean
  previousWasFinalBeforeRest: boolean
  nextIsFirstAfterRest: boolean
  quickTurnaroundPrevNext: boolean
  overlapsWork: boolean
}

/** Localisable next-step line: key into `sleepPlan.shiftRelative.nextStep.*` and `{ next }` params. */
export type ShiftRelativeNextStepMessage = {
  key: string
  params: Record<string, string>
}

export type ShiftRelativeSleepAnalysis = {
  features: ShiftRelativeSleepFeatures
  sleepClass: ShiftRelativeSleepClass
  recoveryState: ShiftRelativeRecoveryState
  nextStepMessage: ShiftRelativeNextStepMessage
  /** Nearest previous work block as planner anchor (may be null → synthetic elsewhere). */
  previousWork: ShiftInstant | null
  /** Nearest upcoming work block after sleep ends. */
  upcomingWork: ShiftInstant | null
}

export type ShiftWorkInstantRow = { row: ShiftRowInput; instant: ShiftInstant }

function isWorkRow(row: ShiftRowInput): boolean {
  const standard = toShiftType(row.label, row.start_ts ?? null)
  const k = operationalKindFromStandard(standard, row.label)
  return k !== 'off' && k !== 'other'
}

function toInstant(row: ShiftRowInput, start: Date, end: Date): ShiftInstant {
  return {
    label: (row.label ?? 'OFF').toString(),
    date: row.date,
    startMs: start.getTime(),
    endMs: end.getTime(),
  }
}

export function buildWorkInstantsForClassification(
  rows: ShiftRowInput[],
  sleepPlanTimeZone: string,
): ShiftWorkInstantRow[] {
  const ref = new Date()
  const out: ShiftWorkInstantRow[] = []
  for (const row of rows ?? []) {
    if (!row?.date || !isWorkRow(row)) continue
    const { start, end } = estimateShiftRowBounds(row, ref, sleepPlanTimeZone)
    out.push({ row, instant: toInstant(row, start, end) })
  }
  out.sort((a, b) => a.instant.startMs - b.instant.startMs)
  return out
}

function shiftRowForLocalYmd(ymd: string, rows: ShiftRowInput[]): ShiftRowInput | null {
  for (const r of rows ?? []) {
    if (String(r?.date ?? '').slice(0, 10) === ymd) return r
  }
  return null
}

function isOffLocalYmd(ymd: string, rows: ShiftRowInput[]): boolean {
  const row = shiftRowForLocalYmd(ymd, rows)
  if (!row) return true
  return toShiftType(row.label, row.start_ts ?? null) === 'off'
}

function sleepOverlapsWork(sleepStartMs: number, sleepEndMs: number, instants: ShiftWorkInstantRow[]): boolean {
  for (const { instant: w } of instants) {
    if (w.startMs < sleepEndMs && w.endMs > sleepStartMs) return true
  }
  return false
}

/**
 * Nearest previous **completed** work block: largest `endMs` with `endMs <= sleepStart + grace`.
 * If none, the work block that **contains** `sleepStart` (bed during shift).
 */
export function findNearestPreviousWorkBlock(
  sleepStartMs: number,
  instants: ShiftWorkInstantRow[],
): ShiftWorkInstantRow | null {
  const grace = SLEEP_START_ANCHOR_GRACE_MS
  const completed = instants.filter((x) => x.instant.endMs <= sleepStartMs + grace)
  if (completed.length) {
    return completed.reduce((a, b) => (a.instant.endMs >= b.instant.endMs ? a : b))
  }
  let best: ShiftWorkInstantRow | null = null
  let bestOverlap = -1
  for (const x of instants) {
    const { startMs, endMs } = x.instant
    if (startMs < sleepStartMs && endMs > sleepStartMs) {
      const overlap = Math.min(endMs, sleepStartMs) - Math.max(startMs, sleepStartMs)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        best = x
      }
    }
  }
  return best
}

/** Nearest upcoming work: smallest `startMs` with `startMs >= sleepEnd`. */
export function findNearestUpcomingWorkBlock(sleepEndMs: number, instants: ShiftWorkInstantRow[]): ShiftWorkInstantRow | null {
  const after = instants
    .filter((x) => x.instant.startMs >= sleepEndMs)
    .sort((a, b) => a.instant.startMs - b.instant.startMs)
  return after[0] ?? null
}

/** True when there is no work instant strictly between prev.end and next.start (rest gap). */
function restGapBetween(prev: ShiftInstant | null, next: ShiftInstant | null, instants: ShiftWorkInstantRow[]): boolean {
  if (!prev || !next) return false
  if (next.startMs <= prev.endMs) return false
  return !instants.some(
    (x) => x.instant.startMs < next.startMs && x.instant.endMs > prev.endMs,
  )
}

function formatNextShiftPlain(next: ShiftInstant | null, timeZone: string): string {
  if (!next) return 'your next scheduled shift'
  try {
    const when = new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(next.startMs))
    return `${String(next.label ?? 'shift').trim()} starting ${when}`
  } catch {
    return 'your next shift'
  }
}

function deriveRecoveryState(
  durationMin: number,
  targetSleepMinutes: number,
  sleepClass: ShiftRelativeSleepClass,
  features: ShiftRelativeSleepFeatures,
): ShiftRelativeRecoveryState {
  const target = Math.max(1, Math.round(targetSleepMinutes))
  const ratio = durationMin / target

  if (
    sleepClass === 'off_day_main_sleep' &&
    ratio >= 0.9 &&
    (features.minutesSincePreviousShiftEnded == null || features.minutesSincePreviousShiftEnded >= 36 * 60)
  ) {
    return 'reset_mode'
  }

  if (ratio >= 0.92) return 'on_track'
  if (ratio >= 0.78) return 'a_little_short'
  return 'recovery_needed'
}

function buildNextStepMessage(
  sleepClass: ShiftRelativeSleepClass,
  recovery: ShiftRelativeRecoveryState,
  next: ShiftInstant | null,
  _prev: ShiftInstant | null,
  timeZone: string,
  features: ShiftRelativeSleepFeatures,
): ShiftRelativeNextStepMessage {
  const nextStr = formatNextShiftPlain(next, timeZone)
  const params: Record<string, string> = { next: nextStr }

  if (sleepClass === 'post_shift_recovery_sleep') {
    if (recovery === 'recovery_needed') {
      return {
        key: 'sleepPlan.shiftRelative.nextStep.post_shift_recovery_sleep_recovery_needed',
        params,
      }
    }
    if (recovery === 'a_little_short') {
      return {
        key: 'sleepPlan.shiftRelative.nextStep.post_shift_recovery_sleep_a_little_short',
        params,
      }
    }
    return { key: 'sleepPlan.shiftRelative.nextStep.post_shift_recovery_sleep_on_track', params }
  }

  if (sleepClass === 'pre_shift_nap') {
    return { key: 'sleepPlan.shiftRelative.nextStep.pre_shift_nap', params }
  }

  if (sleepClass === 'pre_shift_sleep') {
    return { key: 'sleepPlan.shiftRelative.nextStep.pre_shift_sleep', params }
  }

  if (sleepClass === 'recovery_nap') {
    return { key: 'sleepPlan.shiftRelative.nextStep.recovery_nap', params }
  }

  if (sleepClass === 'off_day_main_sleep') {
    if (recovery === 'reset_mode') {
      return { key: 'sleepPlan.shiftRelative.nextStep.off_day_main_sleep_reset_mode', params }
    }
    return { key: 'sleepPlan.shiftRelative.nextStep.off_day_main_sleep_default', params }
  }

  if (sleepClass === 'transition_sleep') {
    if (features.overlapsWork) {
      return { key: 'sleepPlan.shiftRelative.nextStep.transition_sleep_overlap', params }
    }
    if (features.quickTurnaroundPrevNext) {
      return { key: 'sleepPlan.shiftRelative.nextStep.transition_sleep_quick_turnaround', params }
    }
    return { key: 'sleepPlan.shiftRelative.nextStep.transition_sleep_default', params }
  }

  return { key: 'sleepPlan.shiftRelative.nextStep.fallback', params }
}

function classifyFromFeatures(
  f: ShiftRelativeSleepFeatures,
  prev: ShiftWorkInstantRow | null,
  next: ShiftWorkInstantRow | null,
  timeZone: string,
): ShiftRelativeSleepClass {
  if (f.overlapsWork) return 'transition_sleep'

  const prevNight = prev != null && isNightLikeInstant(prev.instant, timeZone)
  const nextNight = next != null && isNightLikeInstant(next.instant, timeZone)
  const untilNextMin = f.minutesUntilNextShiftStarts
  const sincePrevMin = f.minutesSincePreviousShiftEnded
  const dur = f.sleepDurationMinutes

  if (
    prevNight &&
    sincePrevMin != null &&
    sincePrevMin >= -45 &&
    sincePrevMin <= POST_NIGHT_RECOVERY_MAX_GAP_MS / MS_MIN &&
    dur >= NAP_MAX_MINUTES
  ) {
    return 'post_shift_recovery_sleep'
  }

  if (
    next &&
    untilNextMin != null &&
    untilNextMin * MS_MIN <= PRE_NIGHT_LOOKAHEAD_MS &&
    nextNight &&
    dur <= NAP_MAX_MINUTES
  ) {
    return 'pre_shift_nap'
  }

  if (dur <= NAP_MAX_MINUTES && sincePrevMin != null && sincePrevMin <= 8 * 60) {
    return 'recovery_nap'
  }

  if (
    next &&
    untilNextMin != null &&
    untilNextMin * MS_MIN <= PRE_SHIFT_LOOKAHEAD_MS &&
    dur >= MAIN_MIN_MINUTES
  ) {
    return 'pre_shift_sleep'
  }

  if (f.sleepStartsOnOffDay && f.sleepEndsOnOffDay && dur >= MAIN_MIN_MINUTES) {
    return 'off_day_main_sleep'
  }

  if (f.quickTurnaroundPrevNext) return 'transition_sleep'

  if (sincePrevMin != null && sincePrevMin <= 12 * 60 && dur >= MAIN_MIN_MINUTES) {
    return 'post_shift_recovery_sleep'
  }

  return 'transition_sleep'
}

export type AnalyzeSleepBlockInput = {
  sleepStartMs: number
  sleepEndMs: number
  shifts: ShiftRowInput[]
  timeZone: string
  /** Goal minutes for main sleep (profile / default). */
  targetSleepMinutes: number
}

/**
 * Full shift-relative analysis for one sleep interval and the rota work instants.
 */
export function analyzeSleepBlockRelativeToShifts(input: AnalyzeSleepBlockInput): ShiftRelativeSleepAnalysis {
  const tz = (input.timeZone ?? 'UTC').trim() || 'UTC'
  const { sleepStartMs, sleepEndMs, shifts, targetSleepMinutes } = input
  const instants = buildWorkInstantsForClassification(shifts, tz)

  const overlapsWork = sleepOverlapsWork(sleepStartMs, sleepEndMs, instants)
  const prevRow = findNearestPreviousWorkBlock(sleepStartMs, instants)
  const nextRow = findNearestUpcomingWorkBlock(sleepEndMs, instants)
  const prev = prevRow?.instant ?? null
  const next = nextRow?.instant ?? null

  const sleepDurationMinutes = Math.max(0, Math.round((sleepEndMs - sleepStartMs) / MS_MIN))

  const startYmd = formatYmdInTimeZone(new Date(sleepStartMs), tz)
  const endYmd = formatYmdInTimeZone(new Date(sleepEndMs), tz)

  const sleepStartsOnOffDay = isOffLocalYmd(startYmd, shifts)
  const sleepEndsOnOffDay = isOffLocalYmd(endYmd, shifts)

  const minutesSincePreviousShiftEnded =
    prev != null ? Math.round((sleepStartMs - prev.endMs) / MS_MIN) : null
  const minutesUntilNextShiftStarts =
    next != null ? Math.round((next.startMs - sleepEndMs) / MS_MIN) : null

  const restGap = restGapBetween(prev, next, instants)
  const previousWasFinalBeforeRest = Boolean(prev && next && restGap)
  const nextIsFirstAfterRest = Boolean(prev && next && restGap)

  const quickTurnaroundPrevNext = Boolean(
    prev &&
      next &&
      next.startMs - prev.endMs < QUICK_TURNAROUND_PREV_NEXT_MS &&
      next.startMs > prev.endMs,
  )

  const features: ShiftRelativeSleepFeatures = {
    minutesSincePreviousShiftEnded,
    minutesUntilNextShiftStarts,
    sleepDurationMinutes,
    sleepStartsOnOffDay,
    sleepEndsOnOffDay,
    previousWasFinalBeforeRest,
    nextIsFirstAfterRest,
    quickTurnaroundPrevNext,
    overlapsWork,
  }

  const sleepClass = classifyFromFeatures(features, prevRow, nextRow, tz)
  const recoveryState = deriveRecoveryState(sleepDurationMinutes, targetSleepMinutes, sleepClass, features)
  const nextStepMessage = buildNextStepMessage(sleepClass, recoveryState, next, prev, tz, features)

  return {
    features,
    sleepClass,
    recoveryState,
    nextStepMessage,
    previousWork: prev,
    upcomingWork: next,
  }
}

export type PrimarySleepPick = { startMs: number; endMs: number } | null

export function pickPrimarySleepInterval(sessions: { start_at: string; end_at: string; type: string }[]): PrimarySleepPick {
  const candidates: { startMs: number; endMs: number }[] = []
  for (const s of sessions ?? []) {
    if (!s?.start_at || !s?.end_at) continue
    if (!rowCountsAsPrimarySleep({ type: s.type, naps: (s as { naps?: number | null }).naps })) continue
    const startMs = Date.parse(s.start_at)
    const endMs = Date.parse(s.end_at)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue
    candidates.push({ startMs, endMs })
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.endMs - a.endMs)
  return candidates[0]
}
