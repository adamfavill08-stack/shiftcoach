import {
  estimateShiftRowBounds,
  operationalKindFromStandard,
  type ShiftRowInput,
} from '@/lib/shift-context/resolveShiftContext'
import { rowCountsAsPrimarySleep } from '@/lib/sleep/utils'
import { toShiftType } from '@/lib/shifts/toShiftType'
import { classifyShiftWallShape, gapMsAnchorEndToSleepStart, isNightLikeInstant } from '@/lib/sleep/sleepShiftWallClock'
import { MAX_COMMUTE_MINUTES, type ShiftInstant } from '@/lib/sleep/nightShiftSleepPlan'

export type SleepSessionLike = {
  start_at: string
  end_at: string
  type: string
}

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

type InstantRow = { row: ShiftRowInput; instant: ShiftInstant }

function buildWorkInstants(rows: ShiftRowInput[]): InstantRow[] {
  const ref = new Date()
  const out: InstantRow[] = []
  for (const row of rows ?? []) {
    if (!row?.date || !isWorkRow(row)) continue
    const { start, end } = estimateShiftRowBounds(row, ref)
    out.push({ row, instant: toInstant(row, start, end) })
  }
  out.sort((a, b) => a.instant.startMs - b.instant.startMs)
  return out
}

/** Latest primary sleep by wake time (not longest in the list — aligns with post-shift recovery). */
function pickPrimarySleep(sessions: SleepSessionLike[]): { startMs: number; endMs: number } | null {
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

function pickNaps(sessions: SleepSessionLike[], main: { startMs: number; endMs: number } | null) {
  const naps: { startMs: number; endMs: number }[] = []
  for (const s of sessions ?? []) {
    if (String(s.type).toLowerCase() !== 'nap') continue
    if (!s?.start_at || !s?.end_at) continue
    const startMs = Date.parse(s.start_at)
    const endMs = Date.parse(s.end_at)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue
    if (main && endMs <= main.startMs) continue
    naps.push({ startMs, endMs })
  }
  return naps
}

const SLEEP_START_GRACE_MS = 45 * 60 * 1000
const MS_H = 60 * 60 * 1000

function pickShiftJustEnded(instants: InstantRow[], sleepStartMs: number): ShiftInstant | null {
  const endedBefore = instants.filter((x) => x.instant.endMs <= sleepStartMs + SLEEP_START_GRACE_MS)
  if (endedBefore.length) {
    return endedBefore.reduce((a, b) => (a.instant.endMs >= b.instant.endMs ? a : b)).instant
  }

  let best: InstantRow | null = null
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
  return best?.instant ?? null
}

function localWallHour(ms: number, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date(ms))
    const h = parts.find((p) => p.type === 'hour')?.value
    const n = h != null ? parseInt(h, 10) : NaN
    return Number.isFinite(n) ? n : new Date(ms).getHours()
  } catch {
    return new Date(ms).getHours()
  }
}

function rowOperationalKind(row: ShiftRowInput) {
  const standard = toShiftType(row.label, row.start_ts ?? null)
  return operationalKindFromStandard(standard, row.label)
}

function isNightRow(row: ShiftRowInput): boolean {
  return rowOperationalKind(row) === 'night'
}

/** Morning / mid-day day work (not night) — first candidate after sleep is “too early” vs a following night. */
function isMorningishDayWorkRow(row: ShiftRowInput, startMs: number, timeZone: string): boolean {
  if (isNightRow(row)) return false
  const k = rowOperationalKind(row)
  if (k === 'off' || k === 'other') return false
  const h = localWallHour(startMs, timeZone)
  return h >= 4 && h <= 13
}

const FOLLOWING_SHIFT_LOOKAHEAD_MS = 48 * 60 * 60 * 1000

function firstWorkAfterSleepEnd(instants: InstantRow[], sleepEndMs: number): InstantRow | null {
  const c = instants
    .filter((x) => x.instant.startMs > sleepEndMs)
    .sort((a, b) => a.instant.startMs - b.instant.startMs)
  return c[0] ?? null
}

function syntheticRestAnchor(sleepStartMs: number, timeZone: string): ShiftInstant {
  const endMs = sleepStartMs - 45 * 60 * 1000
  const startMs = sleepStartMs - 20 * MS_H
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(sleepStartMs))
  return { label: 'OFF', date, startMs, endMs }
}

/**
 * Next shift that should cap recovery sleep: normally the earliest work start after sleep ends,
 * but after a non-night shift with a morning wake we scan the following ~48h so a **night**
 * (or late start) is not missed in favour of a same-morning day row before a real evening/night duty.
 */
function pickNextShift(
  instants: InstantRow[],
  sleepEndMs: number,
  timeZone: string,
  shiftJustEnded: ShiftInstant,
  shiftJustEndedRow: ShiftRowInput | null,
  restAnchorSynthetic: boolean,
): ShiftInstant | null {
  const candidates = instants
    .filter((x) => x.instant.startMs > sleepEndMs)
    .sort((a, b) => a.instant.startMs - b.instant.startMs)
  if (!candidates.length) return null

  const first = candidates[0]

  if (restAnchorSynthetic) {
    return first.instant
  }

  const endedRow: ShiftRowInput =
    shiftJustEndedRow ??
    ({
      date: shiftJustEnded.date,
      label: shiftJustEnded.label,
      start_ts: null,
      end_ts: null,
    } as ShiftRowInput)
  const justEndedNonNight = classifyShiftWallShape(shiftJustEnded, timeZone) !== 'night_like'
  const sleepH = localWallHour(sleepEndMs, timeZone)
  const sleepMorningish = sleepH >= 2 && sleepH < 15

  if (justEndedNonNight && sleepMorningish) {
    const horizon = first.instant.startMs + FOLLOWING_SHIFT_LOOKAHEAD_MS
    const alternate = candidates.find((c) => {
      if (c.instant.startMs > horizon) return false
      if (isNightLikeInstant(c.instant, timeZone)) return true
      const h = localWallHour(c.instant.startMs, timeZone)
      return h >= 15 || h <= 2
    })
    if (alternate && isMorningishDayWorkRow(first.row, first.instant.startMs, timeZone)) {
      return alternate.instant
    }
  }

  return first.instant
}

export type RotaSleepPlanContext =
  | {
      state: 'ok'
      primarySleep: { startMs: number; endMs: number }
      loggedNaps: { startMs: number; endMs: number }[]
      shiftJustEnded: ShiftInstant
      nextShift: ShiftInstant | null
      commuteMinutes: number
      /** ms from anchor shift end to main sleep start */
      gapMsBeforeSleep: number
      /** Anchor was synthesised (rest day before night, no prior work row on timeline). */
      restAnchorSynthetic: boolean
    }
  | {
      state: 'insufficient_data'
      reason: 'no_main_sleep' | 'no_sessions' | 'no_shift_anchor'
    }

export function resolveRotaContextForSleepPlan(
  sessions: SleepSessionLike[],
  shifts: ShiftRowInput[],
  options?: {
    commuteMinutes?: number | null
    /** IANA zone for wall-clock rules when choosing the next shift across following days. */
    timeZone?: string
  },
): RotaSleepPlanContext {
  if (!sessions?.length) {
    return { state: 'insufficient_data', reason: 'no_sessions' }
  }
  const primary = pickPrimarySleep(sessions)
  if (!primary) {
    return { state: 'insufficient_data', reason: 'no_main_sleep' }
  }

  const timeZone = (options?.timeZone ?? 'UTC').trim() || 'UTC'
  const instants = buildWorkInstants(shifts)

  let restAnchorSynthetic = false
  let shiftJustEnded = pickShiftJustEnded(instants, primary.startMs)
  const firstAfterSleep = firstWorkAfterSleepEnd(instants, primary.endMs)

  if (
    !shiftJustEnded &&
    firstAfterSleep &&
    isNightLikeInstant(firstAfterSleep.instant, timeZone)
  ) {
    shiftJustEnded = syntheticRestAnchor(primary.startMs, timeZone)
    restAnchorSynthetic = true
  }

  // No work rows (OFF-only / empty rota) or sleep not overlapping any shift — still produce a plan
  // using a synthetic rest window before sleep (same geometry as pre-night recovery).
  if (!shiftJustEnded) {
    shiftJustEnded = syntheticRestAnchor(primary.startMs, timeZone)
    restAnchorSynthetic = true
  }

  const endedRow =
    instants.find(
      (x) =>
        x.instant.date === shiftJustEnded.date &&
        x.instant.label === shiftJustEnded.label &&
        Math.abs(x.instant.endMs - shiftJustEnded.endMs) < 120_000,
    )?.row ?? null

  const nextShift = pickNextShift(
    instants,
    primary.endMs,
    timeZone,
    shiftJustEnded,
    endedRow,
    restAnchorSynthetic,
  )

  const gapMsBeforeSleep = gapMsAnchorEndToSleepStart(shiftJustEnded, primary.startMs)

  const rawCommute = options?.commuteMinutes
  const commuteMinutes =
    typeof rawCommute === 'number' && Number.isFinite(rawCommute) && rawCommute > 0
      ? Math.min(Math.round(rawCommute), MAX_COMMUTE_MINUTES)
      : 25

  return {
    state: 'ok',
    primarySleep: primary,
    loggedNaps: pickNaps(sessions, primary),
    shiftJustEnded,
    nextShift,
    commuteMinutes,
    gapMsBeforeSleep,
    restAnchorSynthetic,
  }
}
