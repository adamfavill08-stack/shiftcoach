import {
  estimateShiftRowBounds,
  operationalKindFromStandard,
  type ShiftRowInput,
} from '@/lib/shift-context/resolveShiftContext'
import { rowCountsAsPrimarySleep } from '@/lib/sleep/utils'
import { toShiftType } from '@/lib/shifts/toShiftType'
import {
  classifyShiftWallShape,
  gapMsAnchorEndToSleepStart,
  isNightLikeInstant,
} from '@/lib/sleep/sleepShiftWallClock'
import { MAX_COMMUTE_MINUTES, type ShiftInstant } from '@/lib/sleep/nightShiftSleepPlan'
import { parsePostNightSleepToWallMinutes } from '@/lib/sleep/postNightSleepHabit'

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

function buildWorkInstants(rows: ShiftRowInput[], sleepPlanTimeZone: string): InstantRow[] {
  const ref = new Date()
  const out: InstantRow[] = []
  for (const row of rows ?? []) {
    if (!row?.date || !isWorkRow(row)) continue
    const { start, end } = estimateShiftRowBounds(row, ref, sleepPlanTimeZone)
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

const POST_NIGHT_SLEEP_START_HOUR_MIN = 4
const POST_NIGHT_SLEEP_START_HOUR_MAX = 15
/** If a day/early block ends within this of main-sleep start, it beats a prior night anchor (same-morning handover). */
const SAME_MORNING_NON_NIGHT_MAX_GAP_MS = 4 * MS_H
/** “Classic pre-night” — bed soon before an upcoming night block; do not swap anchor to a prior night. */
const PRE_NIGHT_NEXT_NIGHT_MAX_GAP_MS = 18 * 60 * 60 * 1000
/** Night block whose end is within this of logged main-sleep end is treated as the same recovery cycle. */
const POST_NIGHT_WAKE_ANCHOR_MAX_MS = 18 * 60 * 60 * 1000
const POST_NIGHT_WAKE_ANCHOR_MIN_MS = -2 * 60 * 60 * 1000

/**
 * Pick the work block that most plausibly precedes this sleep start.
 * Evening pre-night: keep “latest shift end before bed” (day/early before a night).
 * Morning-ish main sleep: prefer the **night** that just finished unless a non-night shift ended
 * *after* that night and within a short gap of sleep (same-morning early → nap/sleep handover).
 */
function pickShiftJustEnded(instants: InstantRow[], sleepStartMs: number, timeZone: string): ShiftInstant | null {
  const grace = SLEEP_START_GRACE_MS
  const endedBefore = instants.filter((x) => x.instant.endMs <= sleepStartMs + grace)
  if (endedBefore.length) {
    const sleepHour = localWallHour(sleepStartMs, timeZone)
    const morningRecovery =
      sleepHour >= POST_NIGHT_SLEEP_START_HOUR_MIN && sleepHour <= POST_NIGHT_SLEEP_START_HOUR_MAX

    if (morningRecovery) {
      const nightRows = endedBefore.filter((x) => isNightLikeInstant(x.instant, timeZone))
      if (nightRows.length) {
        const maxNightEnd = Math.max(...nightRows.map((x) => x.instant.endMs))
        const nonNightAfterNight = endedBefore.filter(
          (x) => !isNightLikeInstant(x.instant, timeZone) && x.instant.endMs > maxNightEnd,
        )
        if (nonNightAfterNight.length) {
          const bestFollow = nonNightAfterNight.reduce((a, b) =>
            a.instant.endMs >= b.instant.endMs ? a : b,
          )
          if (sleepStartMs - bestFollow.instant.endMs <= SAME_MORNING_NON_NIGHT_MAX_GAP_MS) {
            return bestFollow.instant
          }
        }
        return nightRows.reduce((a, b) => (a.instant.endMs >= b.instant.endMs ? a : b)).instant
      }
    }

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

/**
 * Evening main-sleep logs often reflect a pre-bed window while the **recovery anchor** should still
 * be the night that just finished (morning `post_night_sleep`). When `post_night_sleep` is set and
 * this is not a tight pre-night layout, re-anchor to the night whose end lines up with the wake
 * window of the logged session (`primary.end` within a few hours of shift end).
 */
function maybeUpgradeAnchorForEveningPostNightRecovery(
  instants: InstantRow[],
  primary: { startMs: number; endMs: number },
  shiftJustEnded: ShiftInstant,
  endedRow: ShiftRowInput | null,
  nextShift: ShiftInstant | null,
  timeZone: string,
  postNightRaw: string | null | undefined,
): { shiftJustEnded: ShiftInstant; endedRow: ShiftRowInput | null } {
  if (parsePostNightSleepToWallMinutes(postNightRaw ?? null) == null) {
    return { shiftJustEnded, endedRow }
  }
  if (isNightLikeInstant(shiftJustEnded, timeZone)) {
    return { shiftJustEnded, endedRow }
  }

  const sleepStartH = localWallHour(primary.startMs, timeZone)
  const eveningLogged = sleepStartH >= 19 || sleepStartH <= 3
  if (!eveningLogged) return { shiftJustEnded, endedRow }

  if (
    nextShift != null &&
    isNightLikeInstant(nextShift, timeZone) &&
    primary.startMs < nextShift.startMs &&
    nextShift.startMs - primary.startMs < PRE_NIGHT_NEXT_NIGHT_MAX_GAP_MS
  ) {
    return { shiftJustEnded, endedRow }
  }

  const recoverable = instants
    .map((x) => x.instant)
    .filter((inst) => {
      if (!isNightLikeInstant(inst, timeZone)) return false
      const delta = primary.endMs - inst.endMs
      return delta >= POST_NIGHT_WAKE_ANCHOR_MIN_MS && delta <= POST_NIGHT_WAKE_ANCHOR_MAX_MS
    })
  if (!recoverable.length) return { shiftJustEnded, endedRow }

  const candidate = recoverable.reduce((a, b) => (a.endMs >= b.endMs ? a : b))
  if (candidate.endMs === shiftJustEnded.endMs && candidate.startMs === shiftJustEnded.startMs) {
    return { shiftJustEnded, endedRow }
  }

  const row =
    instants.find(
      (x) =>
        x.instant.date === candidate.date &&
        x.instant.label === candidate.label &&
        Math.abs(x.instant.endMs - candidate.endMs) < 120_000,
    )?.row ?? null

  return { shiftJustEnded: candidate, endedRow: row }
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

/** When no generic "next work" is found, still cap recovery if a night block starts after sleep ended (rota gaps / label quirks). */
function findFirstNightLikeAfterSleepEnd(
  instants: InstantRow[],
  sleepEndMs: number,
  timeZone: string,
): ShiftInstant | null {
  const rows = instants
    .filter((x) => x.instant.startMs > sleepEndMs && isNightLikeInstant(x.instant, timeZone))
    .sort((a, b) => a.instant.startMs - b.instant.startMs)
  return rows[0]?.instant ?? null
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
    /** When set, evening sleep logs can be re-anchored to the finishing night for post-night timing. */
    postNightSleepRaw?: string | null
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
  const instants = buildWorkInstants(shifts, timeZone)

  const pickedJustEnded = pickShiftJustEnded(instants, primary.startMs, timeZone)
  const restAnchorSynthetic = pickedJustEnded == null
  // No work rows (OFF-only / empty rota) or sleep not overlapping any shift — still produce a plan
  // using a synthetic rest window before sleep (same geometry as pre-night recovery).
  let shiftJustEnded: ShiftInstant =
    pickedJustEnded ?? syntheticRestAnchor(primary.startMs, timeZone)

  let endedRow =
    instants.find(
      (x) =>
        x.instant.date === shiftJustEnded.date &&
        x.instant.label === shiftJustEnded.label &&
        Math.abs(x.instant.endMs - shiftJustEnded.endMs) < 120_000,
    )?.row ?? null

  let nextShift = pickNextShift(
    instants,
    primary.endMs,
    timeZone,
    shiftJustEnded,
    endedRow,
    restAnchorSynthetic,
  )
  if (!nextShift) {
    nextShift = findFirstNightLikeAfterSleepEnd(instants, primary.endMs, timeZone)
  }

  const upgraded = maybeUpgradeAnchorForEveningPostNightRecovery(
    instants,
    primary,
    shiftJustEnded,
    endedRow,
    nextShift,
    timeZone,
    options?.postNightSleepRaw,
  )
  if (
    upgraded.shiftJustEnded.endMs !== shiftJustEnded.endMs ||
    upgraded.shiftJustEnded.startMs !== shiftJustEnded.startMs
  ) {
    shiftJustEnded = upgraded.shiftJustEnded
    endedRow = upgraded.endedRow
    nextShift = pickNextShift(
      instants,
      primary.endMs,
      timeZone,
      shiftJustEnded,
      endedRow,
      restAnchorSynthetic,
    )
    if (!nextShift) {
      nextShift = findFirstNightLikeAfterSleepEnd(instants, primary.endMs, timeZone)
    }
  }

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
