/**
 * Pure shift pattern analyser — no I/O.
 * Input shape aligns with `shifts` / ShiftRowInput (date, label, start_ts, end_ts).
 */
import { toShiftType, type StandardShiftType } from '@/lib/shifts/toShiftType'
import type {
  AnalyserShiftInput,
  PatternType,
  RotationDirection,
  ShiftPatternAnalysisResult,
  ShiftTransitionAnalysis,
  TransitionSeverity,
} from '@/lib/shift-pattern-analyser/types'

const MS_H = 3600000
const STABLE_ANCHOR_EPS_H = 0.75
const PATTERN_WINDOW_DAYS = 28
const CONTINENTAL_TOLERANCE = 1

const DIR_EPS = 0.25

export function sortShiftsChronologically(shifts: AnalyserShiftInput[]): AnalyserShiftInput[] {
  return [...shifts].sort((a, b) => {
    const sa = resolvedStartMs(a)
    const sb = resolvedStartMs(b)
    return sa - sb
  })
}

/** Exposed for agents/schedulers that need wall-clock bounds aligned with the analyser. */
export function getShiftTimeBounds(s: AnalyserShiftInput): { start: Date; end: Date } {
  const startMs = resolvedStartMs(s)
  const endMs = resolvedEndMs(s, startMs)
  return { start: new Date(startMs), end: new Date(endMs) }
}

export function resolvedStartMs(s: AnalyserShiftInput): number {
  if (s.start_ts) {
    const t = new Date(s.start_ts).getTime()
    if (Number.isFinite(t)) return t
  }
  const d = new Date(`${s.date}T12:00:00`)
  return d.getTime()
}

export function resolvedEndMs(s: AnalyserShiftInput, startMs: number): number {
  if (s.end_ts) {
    const t = new Date(s.end_ts).getTime()
    if (Number.isFinite(t) && t > startMs) return t
  }
  const type = toShiftType(s.label, s.start_ts)
  if (type === 'off') return startMs + 24 * MS_H
  if (type === 'night') return startMs + 12 * MS_H
  return startMs + 8 * MS_H
}

/** Clock hour [0,24) as float from a Date (local wall time of that instant). */
function hourOfDate(d: Date): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

/**
 * Ideal main-sleep midpoint (local hour 0–24) for circadian comparison.
 * Heuristic: diurnal shifts → sleep ends near shift start; nights → post-shift block.
 */
export function idealSleepMidpointHour(
  start: Date,
  end: Date,
  type: StandardShiftType,
): number {
  if (type === 'off') {
    return 3
  }

  if (type === 'night') {
    const mid = new Date(end.getTime() + 5 * MS_H)
    return hourOfDate(mid) % 24
  }

  const mid = new Date(start.getTime() - 4 * MS_H)
  return hourOfDate(mid) % 24
}

/** Shortest signed difference on a 24h circle: result in (-12, 12]. Positive = "forward". */
export function circularHourDelta(fromHour: number, toHour: number): number {
  let d = toHour - fromHour
  while (d > 12) d -= 24
  while (d <= -12) d += 24
  return d
}

function sameShiftFamily(a: StandardShiftType, b: StandardShiftType): boolean {
  if (a === b) return true
  const diurnal = new Set<StandardShiftType>(['morning', 'day', 'evening'])
  if (diurnal.has(a) && diurnal.has(b)) return true
  return false
}

function rotationDirectionFor(
  fromType: StandardShiftType,
  toType: StandardShiftType,
  sleepAnchorShiftHours: number,
): RotationDirection {
  if (sameShiftFamily(fromType, toType)) return 'stable'
  if (sleepAnchorShiftHours > DIR_EPS) return 'forward'
  if (sleepAnchorShiftHours < -DIR_EPS) return 'backward'
  return 'stable'
}

function severityFromRecovery(h: number): TransitionSeverity {
  if (h < 16) return 'critical'
  if (h < 24) return 'high'
  if (h < 36) return 'moderate'
  return 'low'
}

function analyzeTransition(
  fromIdx: number,
  toIdx: number,
  fromS: AnalyserShiftInput,
  toS: AnalyserShiftInput,
): ShiftTransitionAnalysis {
  const startA = resolvedStartMs(fromS)
  const endA = resolvedEndMs(fromS, startA)
  const startB = resolvedStartMs(toS)
  const endB = resolvedEndMs(toS, startB)

  const fromType = toShiftType(fromS.label, fromS.start_ts)
  const toType = toShiftType(toS.label, toS.start_ts)

  const recoveryHours = Math.max(0, (startB - endA) / MS_H)

  const midA = idealSleepMidpointHour(new Date(startA), new Date(endA), fromType)
  const midB = idealSleepMidpointHour(new Date(startB), new Date(endB), toType)

  let sleepAnchorShift = 0
  if (fromType === 'off' && toType === 'off') {
    sleepAnchorShift = 0
  } else if (fromType === 'off') {
    sleepAnchorShift = circularHourDelta(3, midB)
  } else if (toType === 'off') {
    sleepAnchorShift = circularHourDelta(midA, 3)
  } else {
    sleepAnchorShift = circularHourDelta(midA, midB)
  }

  if (sameShiftFamily(fromType, toType) && Math.abs(sleepAnchorShift) < STABLE_ANCHOR_EPS_H) {
    sleepAnchorShift = 0
  }

  const rotationDirection = rotationDirectionFor(fromType, toType, sleepAnchorShift)
  const transitionSeverity = severityFromRecovery(recoveryHours)
  const napRecommended = transitionSeverity === 'critical' || transitionSeverity === 'high'

  return {
    toIndex: toIdx,
    fromShift: fromS,
    toShift: toS,
    fromType,
    toType,
    sleepAnchorShift: Math.round(sleepAnchorShift * 100) / 100,
    recoveryHours: Math.round(recoveryHours * 100) / 100,
    rotationDirection,
    transitionSeverity,
    napRecommended,
  }
}

function parseYmd(ymd: string): number {
  const t = Date.parse(`${ymd}T12:00:00`)
  return Number.isFinite(t) ? t : 0
}

/** Work shifts only (non-off) with resolved starts, in window. */
function workShiftsInWindow(sorted: AnalyserShiftInput[], windowEndYmd: string): AnalyserShiftInput[] {
  const endT = parseYmd(windowEndYmd)
  const startT = endT - PATTERN_WINDOW_DAYS * 24 * MS_H
  return sorted.filter((s) => {
    if (toShiftType(s.label, s.start_ts) === 'off') return false
    const t = parseYmd(s.date)
    return t >= startT && t <= endT
  })
}

function startHourCircular(s: AnalyserShiftInput): number {
  const ms = resolvedStartMs(s)
  return hourOfDate(new Date(ms))
}

function circularStepDelta(prevH: number, nextH: number): number {
  let d = nextH - prevH
  while (d > 12) d -= 24
  while (d < -12) d += 24
  return d
}

function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

function isFixedDaysHours(hours: number[]): boolean {
  if (hours.length < 4) return false
  const m = mean(hours)
  if (m < 6 || m > 16) return false
  return stdDev(hours) < 2
}

function isFixedNightsHours(hours: number[]): boolean {
  if (hours.length < 4) return false
  const adjusted = hours.map((h) => (h < 8 ? h + 24 : h))
  const m = mean(adjusted)
  if (m <= 16 && m < 22) return false
  return stdDev(adjusted) < 2.5
}

function consecutiveWorkPairs(
  sortedAll: AnalyserShiftInput[],
): Array<{ prev: AnalyserShiftInput; next: AnalyserShiftInput }> {
  const pairs: Array<{ prev: AnalyserShiftInput; next: AnalyserShiftInput }> = []
  for (let i = 1; i < sortedAll.length; i++) {
    const a = sortedAll[i - 1]
    const b = sortedAll[i]
    if (toShiftType(a.label, a.start_ts) === 'off') continue
    if (toShiftType(b.label, b.start_ts) === 'off') continue
    pairs.push({ prev: a, next: b })
  }
  return pairs
}

/** Require enough consecutive work pairs to avoid labelling sparse/on-call as rotating. */
const MIN_PAIRS_FOR_ROTATION = 6

function detectRotatingForward(pairs: Array<{ prev: AnalyserShiftInput; next: AnalyserShiftInput }>): boolean {
  if (pairs.length < MIN_PAIRS_FOR_ROTATION) return false
  const deltas = pairs.map(({ prev, next }) =>
    circularStepDelta(startHourCircular(prev), startHourCircular(next)),
  )
  const pos = deltas.filter((d) => d > 1).length
  const neg = deltas.filter((d) => d < -1).length
  return pos >= Math.ceil(deltas.length * 0.65) && pos > neg + 1
}

function detectRotatingBackward(pairs: Array<{ prev: AnalyserShiftInput; next: AnalyserShiftInput }>): boolean {
  if (pairs.length < MIN_PAIRS_FOR_ROTATION) return false
  const deltas = pairs.map(({ prev, next }) =>
    circularStepDelta(startHourCircular(prev), startHourCircular(next)),
  )
  const neg = deltas.filter((d) => d < -1).length
  const pos = deltas.filter((d) => d > 1).length
  return neg >= Math.ceil(deltas.length * 0.65) && neg > pos + 1
}

/** One entry per calendar day in window: 1 = any work shift, 0 = off-only. */
function calendarWorkOffSequence(sorted: AnalyserShiftInput[], windowEndYmd: string): number[] {
  const endT = parseYmd(windowEndYmd)
  const startT = endT - PATTERN_WINDOW_DAYS * 24 * MS_H
  const byDate = new Map<string, AnalyserShiftInput[]>()
  for (const s of sorted) {
    const t = parseYmd(s.date)
    if (t < startT || t > endT) continue
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }
  const dates = [...byDate.keys()].sort()
  return dates.map((d) => {
    const rows = byDate.get(d)!
    const anyWork = rows.some((r) => toShiftType(r.label, r.start_ts) !== 'off')
    return anyWork ? 1 : 0
  })
}

function runLengthBlocks(bits: number[]): { work: number[]; off: number[] } {
  const work: number[] = []
  const off: number[] = []
  if (!bits.length) return { work, off }
  let cur = bits[0]
  let len = 1
  for (let i = 1; i <= bits.length; i++) {
    if (i < bits.length && bits[i] === cur) {
      len++
      continue
    }
    if (cur === 1) work.push(len)
    else off.push(len)
    if (i < bits.length) {
      cur = bits[i]
      len = 1
    }
  }
  return { work, off }
}

function analyzeContinental(sorted: AnalyserShiftInput[], windowEndYmd: string): boolean {
  const seq = calendarWorkOffSequence(sorted, windowEndYmd)
  if (seq.length < 14) return false

  const offFrac = seq.filter((x) => x === 0).length / seq.length
  if (offFrac < 0.28 || offFrac > 0.72) return false

  const { work: workBlocks, off: offBlocks } = runLengthBlocks(seq)
  if (workBlocks.length < 3 || offBlocks.length < 2) return false

  const workMode = modeWithTolerance(workBlocks, CONTINENTAL_TOLERANCE)
  const offMode = modeWithTolerance(offBlocks, CONTINENTAL_TOLERANCE)
  if (workMode == null || offMode == null) return false
  if (workMode < 2 || offMode < 2) return false
  return true
}

function modeWithTolerance(blocks: number[], tol: number): number | null {
  if (!blocks.length) return null
  const counts = new Map<number, number>()
  for (const b of blocks) {
    let k = b
    for (const ex of counts.keys()) {
      if (Math.abs(ex - b) <= tol) {
        k = ex
        break
      }
    }
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  let best: number | null = null
  let bestC = 0
  for (const [k, c] of counts) {
    if (c > bestC) {
      bestC = c
      best = k
    }
  }
  return bestC >= Math.ceil(blocks.length * 0.5) ? best : null
}

export function detectPatternType(
  sorted: AnalyserShiftInput[],
  referenceYmd?: string,
): { patternType: PatternType; patternWindowShiftCount: number } {
  let lastDate = referenceYmd
  if (!lastDate) {
    for (const s of sorted) {
      if (!lastDate || s.date > lastDate) lastDate = s.date
    }
  }
  if (!lastDate) return { patternType: 'irregular', patternWindowShiftCount: 0 }

  const windowWork = workShiftsInWindow(sorted, lastDate)
  const hours = windowWork.map(startHourCircular)

  if (analyzeContinental(sorted, lastDate)) {
    return { patternType: 'continental', patternWindowShiftCount: windowWork.length }
  }

  const endT = parseYmd(lastDate)
  const startT = endT - PATTERN_WINDOW_DAYS * 24 * MS_H
  const sortedWin = sorted.filter((s) => {
    const t = parseYmd(s.date)
    return t >= startT && t <= endT
  })
  const pairsWin = consecutiveWorkPairs(sortedWin)

  if (hours.length >= 4 && isFixedNightsHours(hours)) {
    return { patternType: 'fixed_nights', patternWindowShiftCount: windowWork.length }
  }
  if (hours.length >= 4 && isFixedDaysHours(hours)) {
    return { patternType: 'fixed_days', patternWindowShiftCount: windowWork.length }
  }
  if (detectRotatingForward(pairsWin)) {
    return { patternType: 'rotating_forward', patternWindowShiftCount: windowWork.length }
  }
  if (detectRotatingBackward(pairsWin)) {
    return { patternType: 'rotating_backward', patternWindowShiftCount: windowWork.length }
  }

  return { patternType: 'irregular', patternWindowShiftCount: windowWork.length }
}

/**
 * Analyse consecutive shift transitions and overall 4-week pattern label.
 *
 * @param shifts - roster rows; can be unsorted
 * @param referenceYmd - end of 28-day pattern window (defaults to latest `date` in input)
 */
export function analyseShiftPattern(
  shifts: AnalyserShiftInput[],
  referenceYmd?: string,
): ShiftPatternAnalysisResult {
  const sorted = sortShiftsChronologically(shifts)
  const transitions: ShiftTransitionAnalysis[] = []

  for (let i = 1; i < sorted.length; i++) {
    transitions.push(analyzeTransition(i - 1, i, sorted[i - 1], sorted[i]))
  }

  const ref =
    referenceYmd ||
    sorted.reduce<string | undefined>((acc, s) => (!acc || s.date > acc ? s.date : acc), undefined)

  const { patternType, patternWindowShiftCount } = ref
    ? detectPatternType(sorted, ref)
    : { patternType: 'irregular' as PatternType, patternWindowShiftCount: 0 }

  return { transitions, patternType, patternWindowShiftCount }
}
