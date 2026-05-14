import { toShiftType } from '@/lib/shifts/toShiftType'
import { operationalKindFromStandard, type ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import {
  caffeineOffsetBeforeSleep,
  DEFAULT_TARGET_SLEEP_H,
  MAX_COMMUTE_MINUTES,
  MAX_TARGET_SLEEP_MINUTES,
  MIN_SLEEP_MINUTES,
  PREP_BEFORE_NEXT_SHIFT,
  type CaffeineSensitivity,
  type NightShiftSleepPlanResult,
  type ShiftInstant,
} from '@/lib/sleep/nightShiftSleepPlan'
import { crossesLocalMidnight, localMinutesFromMidnight, utcMsAtLocalWallOnDate } from '@/lib/sleep/sleepShiftWallClock'
import { buildWorkInstantsForClassification } from '@/lib/sleep/shiftRelativeSleepClassification'
import { addCalendarDaysToYmd, rowCountsAsPrimarySleep, startOfLocalDayUtcMs } from '@/lib/sleep/utils'
import {
  classifyConsecutiveOffDayWindowKind,
  transitionSummaryKeyForOffDayKind,
} from '@/lib/sleep/suggestedSleepWindowKind'

const MS_MIN = 60_000

type SessionLike = {
  start_at?: string | null
  end_at?: string | null
  type?: string | null
}

function clampTargetMinutes(raw: number): number {
  const n = Math.round(raw)
  if (!Number.isFinite(n) || n <= 0) return Math.round(DEFAULT_TARGET_SLEEP_H * 60)
  return Math.min(MAX_TARGET_SLEEP_MINUTES, Math.max(MIN_SLEEP_MINUTES, n))
}

/** Latest primary sleep end — used so we do not suggest main sleep starting before that wake time. */
function pickPrimaryByLatestWake(sessions: SessionLike[]): { startMs: number; endMs: number } | null {
  const candidates = collectPrimarySleepIntervals(sessions)
  return candidates[0] ?? null
}

function collectPrimarySleepIntervals(sessions: SessionLike[]): { startMs: number; endMs: number }[] {
  const candidates: { startMs: number; endMs: number }[] = []
  for (const s of sessions) {
    if (!s.start_at || !s.end_at) continue
    if (!rowCountsAsPrimarySleep({ type: s.type })) continue
    const startMs = Date.parse(s.start_at)
    const endMs = Date.parse(s.end_at)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue
    candidates.push({ startMs, endMs })
  }
  candidates.sort((a, b) => b.endMs - a.endMs)
  return candidates
}

const EVENING_BED_START_MIN = 17 * 60
/** When no logged block looks like a civil-evening bedtime, anchor here (local). */
const DEFAULT_OFF_DAY_BED_WALL_MIN = 22 * 60 + 30

/**
 * True only for sleep that plausibly represents a **normal night bedtime** (evening start),
 * or a classic overnight block that began in the evening or very early after midnight.
 * Post-shift **morning** recovery (e.g. 04:00–14:00) must not supply the next "tonight" bed time.
 */
function isEveningOrOvernightMainSleep(startMs: number, endMs: number, timeZone: string): boolean {
  const cross = crossesLocalMidnight(startMs, endMs, timeZone)
  const sm = localMinutesFromMidnight(startMs, timeZone)
  if (cross) {
    if (sm >= EVENING_BED_START_MIN) return true
    // Rare continuation: fell asleep just after midnight on a real overnight block
    if (sm <= 3 * 60) return true
    return false
  }
  return sm >= EVENING_BED_START_MIN
}

function pickBedWallMinutesForNormalDayOff(sessions: SessionLike[], timeZone: string): number {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  for (const c of collectPrimarySleepIntervals(sessions)) {
    if (isEveningOrOvernightMainSleep(c.startMs, c.endMs, tz)) {
      return localMinutesFromMidnight(c.startMs, tz)
    }
  }
  return DEFAULT_OFF_DAY_BED_WALL_MIN
}

function offLike(label: string | null | undefined): boolean {
  return toShiftType(label, null) === 'off'
}

function isWorkShiftRow(row: ShiftRowInput): boolean {
  const standard = toShiftType(row.label, row.start_ts ?? null)
  const k = operationalKindFromStandard(standard, row.label)
  return k !== 'off' && k !== 'other'
}

function shiftRowForCivilYmd(ymd: string, shifts: ShiftRowInput[]): ShiftRowInput | null {
  for (const r of shifts) {
    if (String(r?.date ?? '').slice(0, 10) === ymd) return r
  }
  return null
}

/** True when any work instant overlaps the local civil day [ymd 00:00, nextYmd 00:00). */
function workOverlapsLocalCivilDay(ymd: string, shifts: ShiftRowInput[], timeZone: string): boolean {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const dayStart = startOfLocalDayUtcMs(ymd, tz)
  if (!Number.isFinite(dayStart)) return false
  const nextYmd = addCalendarDaysToYmd(ymd, 1)
  const dayEnd = startOfLocalDayUtcMs(nextYmd, tz)
  if (!Number.isFinite(dayEnd)) return false
  const instants = buildWorkInstantsForClassification(shifts, tz)
  for (const { instant: w } of instants) {
    if (w.startMs < dayEnd && w.endMs > dayStart) return true
  }
  return false
}

/**
 * A civil date counts as "off" when there is no work overlapping that local calendar day
 * (overnight shifts count on every local day they touch), and any same-date rota row is not work.
 * Missing rows with no overlapping work count as off (sparse rota).
 */
export function isCivilDateOff(
  ymd: string,
  shiftByDate: Map<string, string>,
  shifts: ShiftRowInput[] | undefined,
  timeZone: string,
): boolean {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const list = shifts ?? []
  if (list.length > 0) {
    if (workOverlapsLocalCivilDay(ymd, list, tz)) return false
    const row = shiftRowForCivilYmd(ymd, list)
    if (row) return !isWorkShiftRow(row)
    // No row for this civil date in the loaded rota slice: treat as off when nothing overlaps,
    // even if shiftByDate was padded with a stale label (sparse / client maps).
    return true
  }
  return offLike(shiftByDate.get(ymd))
}

/**
 * True when the loaded rota says this civil date is non-work (OFF / other), or there is no row
 * and no duty overlaps that calendar day. Unlike {@link isCivilDateOff}, a night that **ends**
 * the morning of an OFF row still counts as a rest **row** so we can detect a **second** roster
 * OFF day after nights even when the first OFF date fails the civil "no overlap" rule.
 */
export function isRosterRestDay(
  ymd: string,
  shiftByDate: Map<string, string>,
  shifts: ShiftRowInput[] | undefined,
  timeZone: string,
): boolean {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const list = shifts ?? []
  if (list.length > 0) {
    const row = shiftRowForCivilYmd(ymd, list)
    if (row) return !isWorkShiftRow(row)
    return !workOverlapsLocalCivilDay(ymd, list, tz)
  }
  return offLike(shiftByDate.get(ymd))
}

/** Count consecutive roster rest days ending on `scopeYmd` (includes scope day). */
export function consecutiveRosterRestDaysEndingOn(
  scopeYmd: string,
  shiftByDate: Map<string, string>,
  shifts: ShiftRowInput[] | undefined,
  timeZone: string,
): number {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  let streak = 0
  for (let i = 0; i < 21; i++) {
    const ymd = addCalendarDaysToYmd(scopeYmd, -i)
    if (isRosterRestDay(ymd, shiftByDate, shifts, tz)) streak++
    else break
  }
  return streak
}

/** Count consecutive civil OFF days ending on `scopeYmd` (includes today). */
export function consecutiveOffDaysEndingOn(
  scopeYmd: string,
  shiftByDate: Map<string, string>,
  shifts?: ShiftRowInput[],
  timeZone?: string,
): number {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  let streak = 0
  for (let i = 0; i < 21; i++) {
    const ymd = addCalendarDaysToYmd(scopeYmd, -i)
    if (isCivilDateOff(ymd, shiftByDate, shifts, tz)) streak++
    else break
  }
  return streak
}

export function shouldUseNormalDayOffSleepPlan(
  scopeYmd: string,
  shiftByDate: Map<string, string>,
  shifts?: ShiftRowInput[],
  timeZone?: string,
): boolean {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  if (!isRosterRestDay(scopeYmd, shiftByDate, shifts, tz)) return false
  const civil = consecutiveOffDaysEndingOn(scopeYmd, shiftByDate, shifts, tz)
  const roster = consecutiveRosterRestDaysEndingOn(scopeYmd, shiftByDate, shifts, tz)
  return civil >= 2 || roster >= 2
}

export function buildNormalDayOffSleepPlan(input: {
  scopeYmd: string
  sessions: SessionLike[]
  targetSleepMinutes: number
  caffeineSensitivity: CaffeineSensitivity
  timeZone: string
  nextShift?: ShiftInstant | null
  commuteMinutes?: number | null
}): NightShiftSleepPlanResult | null {
  const primary = pickPrimaryByLatestWake(input.sessions)
  if (!primary) return null

  const timeZone = (input.timeZone ?? 'UTC').trim() || 'UTC'
  const wallMin = pickBedWallMinutesForNormalDayOff(input.sessions, timeZone)
  const targetMs = clampTargetMinutes(input.targetSleepMinutes) * MS_MIN
  const scopeMidday = startOfLocalDayUtcMs(input.scopeYmd, timeZone) + 12 * 60 * MS_MIN
  let startMs = utcMsAtLocalWallOnDate(input.scopeYmd, wallMin, timeZone, scopeMidday)
  if (startMs == null) return null

  if (startMs <= primary.endMs) {
    const nextYmd = addCalendarDaysToYmd(input.scopeYmd, 1)
    startMs = utcMsAtLocalWallOnDate(
      nextYmd,
      wallMin,
      timeZone,
      startOfLocalDayUtcMs(nextYmd, timeZone) + 12 * 60 * MS_MIN,
    )
    if (startMs == null) return null
  }

  // No next shift: open-ended off-day recovery must never present a morning hour as "tonight's bed"
  // (e.g. synthetic post-night preview or mis-picked primary still leaking through).
  if (input.nextShift == null) {
    const startMin = localMinutesFromMidnight(startMs, timeZone)
    if (startMin < EVENING_BED_START_MIN) {
      let fixed =
        utcMsAtLocalWallOnDate(input.scopeYmd, DEFAULT_OFF_DAY_BED_WALL_MIN, timeZone, scopeMidday) ?? startMs
      if (fixed <= primary.endMs) {
        const ny = addCalendarDaysToYmd(input.scopeYmd, 1)
        const alt =
          utcMsAtLocalWallOnDate(
            ny,
            DEFAULT_OFF_DAY_BED_WALL_MIN,
            timeZone,
            startOfLocalDayUtcMs(ny, timeZone) + 12 * 60 * MS_MIN,
          ) ?? null
        if (alt != null) fixed = alt
      }
      if (fixed > primary.endMs) {
        startMs = fixed
      }
    }
  }

  const commute =
    typeof input.commuteMinutes === 'number' && Number.isFinite(input.commuteMinutes) && input.commuteMinutes > 0
      ? Math.min(Math.round(input.commuteMinutes), MAX_COMMUTE_MINUTES)
      : 25
  const latestWakeMs =
    input.nextShift != null && Number.isFinite(input.nextShift.startMs)
      ? input.nextShift.startMs - PREP_BEFORE_NEXT_SHIFT * MS_MIN - commute * MS_MIN
      : null

  let endMs = startMs + targetMs
  const feedback: NightShiftSleepPlanResult['feedback'] = [{ code: 'none', severity: 'info' }]
  if (latestWakeMs != null && endMs > latestWakeMs && latestWakeMs > startMs) {
    endMs = latestWakeMs
    feedback.push({ code: 'wake_close_next_shift', severity: 'info' })
  }

  const modelSleepMs = Math.max(0, endMs - startMs)
  const caffeineCutoffMs = startMs - caffeineOffsetBeforeSleep(input.caffeineSensitivity) * MS_MIN

  const kind = classifyConsecutiveOffDayWindowKind(input.nextShift ?? null, timeZone)

  return {
    ok: true,
    transition: 'other',
    transitionSummaryKey: transitionSummaryKeyForOffDayKind(kind),
    earliestSleepStartMs: startMs,
    latestWakeMs,
    suggestedSleepStartMs: startMs,
    suggestedSleepEndMs: endMs,
    modelSleepMs,
    caffeineCutoffMs,
    napSuggested: false,
    napWindowStartMs: null,
    napWindowEndMs: null,
    feedback,
    calculationStepKeys: [
      'sleepPlan.calc.dayOffEveningAnchor',
      'sleepPlan.calc.windowFit',
      'sleepPlan.calc.caffeine',
    ],
    suggestedSleepWindowKind: kind,
  }
}

/**
 * When there is no primary sleep row to anchor wake time, still emit a civil night window on
 * consecutive days off so we do not fall back to shift-anchored post-shift math.
 */
export function buildMinimalConsecutiveOffSleepPlan(input: {
  scopeYmd: string
  targetSleepMinutes: number
  caffeineSensitivity: CaffeineSensitivity
  timeZone: string
  nextShift?: ShiftInstant | null
  commuteMinutes?: number | null
  nowMs?: number
}): NightShiftSleepPlanResult {
  const timeZone = (input.timeZone ?? 'UTC').trim() || 'UTC'
  const wallMin = DEFAULT_OFF_DAY_BED_WALL_MIN
  const targetMs = clampTargetMinutes(input.targetSleepMinutes) * MS_MIN
  const scopeMidday = startOfLocalDayUtcMs(input.scopeYmd, timeZone) + 12 * 60 * MS_MIN
  let startMs = utcMsAtLocalWallOnDate(input.scopeYmd, wallMin, timeZone, scopeMidday)
  if (startMs == null) {
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
      suggestedSleepWindowKind: 'none',
    }
  }

  const anchorWakeMs = Math.max(input.nowMs ?? Date.now(), startOfLocalDayUtcMs(input.scopeYmd, timeZone))
  if (startMs <= anchorWakeMs) {
    const nextYmd = addCalendarDaysToYmd(input.scopeYmd, 1)
    startMs = utcMsAtLocalWallOnDate(
      nextYmd,
      wallMin,
      timeZone,
      startOfLocalDayUtcMs(nextYmd, timeZone) + 12 * 60 * MS_MIN,
    )
    if (startMs == null) {
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
        suggestedSleepWindowKind: 'none',
      }
    }
  }

  const commute =
    typeof input.commuteMinutes === 'number' && Number.isFinite(input.commuteMinutes) && input.commuteMinutes > 0
      ? Math.min(Math.round(input.commuteMinutes), MAX_COMMUTE_MINUTES)
      : 25
  const latestWakeMs =
    input.nextShift != null && Number.isFinite(input.nextShift.startMs)
      ? input.nextShift.startMs - PREP_BEFORE_NEXT_SHIFT * MS_MIN - commute * MS_MIN
      : null

  let endMs = startMs + targetMs
  const feedback: NightShiftSleepPlanResult['feedback'] = [{ code: 'none', severity: 'info' }]
  if (latestWakeMs != null && endMs > latestWakeMs && latestWakeMs > startMs) {
    endMs = latestWakeMs
    feedback.push({ code: 'wake_close_next_shift', severity: 'info' })
  }

  const modelSleepMs = Math.max(0, endMs - startMs)
  const caffeineCutoffMs = startMs - caffeineOffsetBeforeSleep(input.caffeineSensitivity) * MS_MIN
  const kind = classifyConsecutiveOffDayWindowKind(input.nextShift ?? null, timeZone)

  return {
    ok: true,
    transition: 'other',
    transitionSummaryKey: transitionSummaryKeyForOffDayKind(kind),
    earliestSleepStartMs: startMs,
    latestWakeMs,
    suggestedSleepStartMs: startMs,
    suggestedSleepEndMs: endMs,
    modelSleepMs,
    caffeineCutoffMs,
    napSuggested: false,
    napWindowStartMs: null,
    napWindowEndMs: null,
    feedback,
    calculationStepKeys: [
      'sleepPlan.calc.dayOffEveningAnchor',
      'sleepPlan.calc.windowFit',
      'sleepPlan.calc.caffeine',
    ],
    suggestedSleepWindowKind: kind,
  }
}
