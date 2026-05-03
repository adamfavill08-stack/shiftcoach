/**
 * Pure computation: builds UserShiftState from roster rows + wake time.
 * Shift-relative meal/sleep formulas (not clock-only).
 */
import type { AnalyserShiftInput } from '@/lib/shift-pattern-analyser/types'
import {
  analyseShiftPattern,
  resolvedEndMs,
  resolvedStartMs,
  sortShiftsChronologically,
} from '@/lib/shift-pattern-analyser/shiftPatternAnalyser'
import { toShiftType, type StandardShiftType } from '@/lib/shifts/toShiftType'
import type { ShiftAgentMode, UserShiftState } from '@/lib/shift-agent/types'
import type { ShiftTransitionAnalysis } from '@/lib/shift-pattern-analyser/types'

const MS_H = 3600000
const WINDOW_H = 72

function isoLocalDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isOff(s: AnalyserShiftInput): boolean {
  return toShiftType(s.label, s.start_ts) === 'off'
}

function shiftKey(s: AnalyserShiftInput): string {
  return `${s.date}|${s.start_ts ?? ''}|${s.label ?? ''}`
}

function shiftsMatch(a: AnalyserShiftInput, b: AnalyserShiftInput): boolean {
  return shiftKey(a) === shiftKey(b)
}

/** Shifts that intersect (now, now+72h]. */
export function filterShiftsIn72hWindow(shifts: AnalyserShiftInput[], now: Date): AnalyserShiftInput[] {
  const end = new Date(now.getTime() + WINDOW_H * MS_H)
  const nowMs = now.getTime()
  const endMs = end.getTime()
  return shifts.filter((s) => {
    const st = resolvedStartMs(s)
    const en = resolvedEndMs(s, st)
    return en > nowMs && st < endMs
  })
}

function labelForDisplay(s: AnalyserShiftInput, type: StandardShiftType): string {
  const raw = (s.label ?? '').trim()
  if (raw) return raw.toUpperCase()
  return type.toUpperCase()
}

function deriveMode(
  active: UserShiftState['activeTransition'],
  nextType: StandardShiftType | null,
): ShiftAgentMode {
  if (active) {
    if (active.severity === 'critical' || active.severity === 'high') return 'TRANSITIONING'
    if (active.severity === 'moderate') return 'RECOVERING'
  }
  if (nextType === 'night') return 'NIGHT_NORMAL'
  return 'DAY_NORMAL'
}

function findTransitionAnalysis(
  transitions: ShiftTransitionAnalysis[],
  prev: AnalyserShiftInput,
  next: AnalyserShiftInput,
): ShiftTransitionAnalysis | undefined {
  return transitions.find((t) => shiftsMatch(t.fromShift, prev) && shiftsMatch(t.toShift, next))
}

function pickPrevAndNextWork(
  sortedWindow: AnalyserShiftInput[],
  now: Date,
): { prev: AnalyserShiftInput | null; next: AnalyserShiftInput | null } {
  const nowMs = now.getTime()
  const nonOffSorted = sortedWindow.filter((s) => !isOff(s))

  /** Next work shift that starts after now (first upcoming). */
  let next: AnalyserShiftInput | null = null
  for (const s of nonOffSorted) {
    const st = resolvedStartMs(s)
    if (st > nowMs) {
      next = s
      break
    }
  }

  if (!next) {
    return { prev: null, next: null }
  }

  const nextStart = resolvedStartMs(next)
  let prev: AnalyserShiftInput | null = null
  let bestEnd = -Infinity

  for (const s of sortedWindow) {
    const st = resolvedStartMs(s)
    const en = resolvedEndMs(s, st)
    if (en <= nextStart && en > bestEnd) {
      prev = s
      bestEnd = en
    }
  }

  return { prev, next }
}

function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * MS_H)
}

/**
 * Build user shift state for debugging / context.
 *
 * @param shiftsForPattern - wider roster slice (e.g. 28d back … horizon) for `patternType`
 * @param shifts72h - roster rows overlapping the next 72h; transition + meal anchors use this + wakeTime
 */
export function computeUserShiftState(params: {
  now: Date
  wakeTime: Date
  shiftsForPattern: AnalyserShiftInput[]
  shifts72h: AnalyserShiftInput[]
}): { state: UserShiftState; notes: string[] } {
  const { now, wakeTime, shiftsForPattern, shifts72h } = params
  const notes: string[] = []

  const refYmd = isoLocalDate(now)
  const patternResult = analyseShiftPattern(shiftsForPattern, refYmd)
  const { patternType, transitions: allTransitions } = patternResult
  notes.push(
    `patternType=${patternType} (window work rows: ${patternResult.patternWindowShiftCount})`,
  )

  const sortedWin = sortShiftsChronologically(shifts72h)
  const { prev, next } = pickPrevAndNextWork(sortedWin, now)

  let activeTransition: UserShiftState['activeTransition'] = null
  let nextTypeForMode: StandardShiftType | null = next ? toShiftType(next.label, next.start_ts) : null

  if (prev && next && !shiftsMatch(prev, next)) {
    const matched = findTransitionAnalysis(allTransitions, prev, next)
    if (matched) {
      const nextStart = new Date(resolvedStartMs(next))
      const transitionStarted = new Date(resolvedEndMs(prev, resolvedStartMs(prev)))
      activeTransition = {
        from: labelForDisplay(prev, matched.fromType),
        to: labelForDisplay(next, matched.toType),
        severity: matched.transitionSeverity,
        napRecommended: matched.napRecommended,
        sleepAnchorShift: matched.sleepAnchorShift,
        recoveryHours: matched.recoveryHours,
        nextShiftStart: nextStart,
        transitionStarted,
      }
      notes.push(
        `activeTransition: ${activeTransition.from}→${activeTransition.to} sev=${matched.transitionSeverity} recoveryH=${matched.recoveryHours} sleepAnchor=${matched.sleepAnchorShift}`,
      )
    } else {
      notes.push(
        'No matching analyser transition for prev/next pair; extended roster may omit connecting dates.',
      )
      const nextStart = new Date(resolvedStartMs(next))
      const transitionStarted = new Date(resolvedEndMs(prev, resolvedStartMs(prev)))
      activeTransition = {
        from: labelForDisplay(prev, toShiftType(prev.label, prev.start_ts)),
        to: labelForDisplay(next, toShiftType(next.label, next.start_ts)),
        severity: 'moderate',
        napRecommended: false,
        sleepAnchorShift: 0,
        recoveryHours: Math.max(0, (resolvedStartMs(next) - resolvedEndMs(prev, resolvedStartMs(prev))) / MS_H),
        nextShiftStart: nextStart,
        transitionStarted,
      }
    }
  } else if (next) {
    notes.push('Upcoming work shift with no preceding shift in 72h window for transition.')
  } else {
    notes.push('No upcoming work shift in 72h window.')
  }

  const nextShiftStart: Date = next
    ? new Date(resolvedStartMs(next))
    : addHours(now, 24)

  const meal1 = addHours(wakeTime, 1)
  const meal2 = addHours(wakeTime, 4)
  const prevWorkType = prev && !isOff(prev) ? toShiftType(prev.label, prev.start_ts) : null
  const nextWorkType = next ? toShiftType(next.label, next.start_ts) : null
  /** Day → first night: anchor the main pre-night meal earlier (~3.5h) so it is not stacked ~1–2h before clock-in. */
  const anchorHoursBefore =
    prevWorkType === 'day' && nextWorkType === 'night' ? 3.5 : 2
  const anchorMeal = addHours(nextShiftStart, -anchorHoursBefore)
  const shiftSnack1 = addHours(nextShiftStart, 3)
  const shiftSnack2: Date | null = null

  notes.push(
    `meals: wake=${wakeTime.toISOString()} → meal1=${meal1.toISOString()} meal2=${meal2.toISOString()} anchorMeal=${anchorMeal.toISOString()} (nextStart=${nextShiftStart.toISOString()}) snack1=${shiftSnack1.toISOString()}`,
  )

  const primarySleep = {
    start: addHours(wakeTime, -8),
    end: new Date(wakeTime.getTime()),
  }

  let napWindow: { start: Date; end: Date } | null = null
  if (next) {
    napWindow = {
      start: addHours(nextShiftStart, -5),
      end: addHours(nextShiftStart, -2.5),
    }
    notes.push(
      `napWindow: ${napWindow.start.toISOString()} … ${napWindow.end.toISOString()} (pre ${nextShiftStart.toISOString()})`,
    )
  } else {
    notes.push('napWindow: null (no next shift anchor)')
  }

  const currentMode = deriveMode(activeTransition, nextTypeForMode)
  notes.push(`currentMode=${currentMode}`)

  const state: UserShiftState = {
    patternType,
    currentMode,
    activeTransition,
    mealWindows: {
      meal1,
      meal2,
      anchorMeal,
      shiftSnack1,
      shiftSnack2,
    },
    sleepWindows: {
      primarySleep,
      napWindow,
    },
    lastCalculated: new Date(now.getTime()),
  }

  return { state, notes }
}
