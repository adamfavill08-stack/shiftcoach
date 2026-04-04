/**
 * Core circadian alignment score (calculation only — no UI).
 * Midpoint vs 03:00 biological anchor in the user's timezone, drift, recovery, shift fit.
 *
 * Final headline score (order of operations):
 * 1. `timingScore` = base midpoint score − drift + recovery + shift fit (clamped 0–100).
 * 2. `score` = clamp(timingScore − durationPenalty − wakeGapPenalty, 0, 100).
 *    Duration reflects short main sleep vs goal; wake-gap reflects long stretches awake between
 *    any logged sleep (main + naps). Forecast uses the same wake-gap penalty as the headline.
 */
import type { UserShiftState } from '@/lib/shift-agent/types'

export type SleepLog = {
  sleep_start: Date | string
  sleep_end: Date | string
}

/** Main + nap intervals for inter-sleep gap math only (midpoint logic stays main-sleep–centric). */
export type SleepIntervalForGap = SleepLog & {
  kind: 'main' | 'nap'
}

export type CircadianUserProfile = {
  sleep_goal_h: number
  timezone: string
}

export type CircadianScoreBreakdown = {
  baseScore: number
  driftPenalty: number
  recoveryBonus: number
  shiftFitBonus: number
  /** Subtracted after timing math when average main sleep is below goal (see `recentAvgSleepHours`). */
  durationPenalty: number
  /** Subtracted after duration when max awake gap between sleeps (in lookback) is excessive. */
  wakeGapPenalty: number
  /** Largest inter-sleep gap in hours in the merged timeline (null if fewer than two intervals). */
  maxInterSleepGapHours: number | null
  /** Consecutive local calendar days ending today where max gap starting that day ≤ GOOD_GAP_MAX_H. */
  goodGapStreakDays: number
  /** If wakeGapPenalty > 0, how many more such good days (rolling) until hysteresis clears penalty. */
  wakeGapDaysUntilClear: number | null
}

export type CircadianState = {
  score: number
  status: string
  trend: 'improving' | 'stable' | 'declining'
  trendDays: number
  sleepMidpointOffset: number
  sleepMidpointHistory: Array<{
    date: string
    midpoint: string
    offset: number
  }>
  consecutiveMisalignedDays: number
  consecutiveAlignedDays: number
  peakAlertnessTime: string
  lowEnergyTime: string
  adaptedPattern: boolean
  adaptationDays: number
  /** Values that produce `score` (for UI breakdown only). */
  scoreBreakdown: CircadianScoreBreakdown
  forecast: {
    tomorrow: number
    threeDays: number
    sevenDays: number
    recoveryDays: number
  }
  lastCalculated: Date
  dataQuality: 'good' | 'partial' | 'insufficient'
  /** Mean hours of main sleep over recent logged nights (up to 7); null if fewer than 2 nights. */
  recentAvgSleepHours: number | null
}

const BIO_ANCHOR_H = 3
const MISALIGN_THRESH_H = 2
const ADAPT_SPREAD_MAX_H = 1.5
const ADAPT_MIN_DAYS = 7
const LOOKBACK_DAYS = 14

/** Below this max gap (hours) starting on a local day counts as a “good” day for wake-gap recovery. */
const GOOD_GAP_MAX_H = 18
/** Hysteresis: need this many consecutive good local days (ending today) to clear wake-gap penalty. */
const GOOD_GAP_STREAK_REQUIRED = 3

/**
 * Raw penalty from worst inter-sleep gap in the window (before hysteresis).
 * ≤16.5h negligible; ramp 16.5–22h to ~25 pts; 22–28h to cap 40 pts (tune here only).
 */
function rawWakeGapPenaltyFromMaxGap(maxGapHours: number): number {
  if (!Number.isFinite(maxGapHours) || maxGapHours <= 16.5) return 0
  if (maxGapHours >= 28) return 40
  if (maxGapHours <= 22) {
    const t = (maxGapHours - 16.5) / (22 - 16.5)
    return Math.round(Math.min(25, t * 25) * 10) / 10
  }
  const t = (maxGapHours - 22) / (28 - 22)
  return Math.round((25 + t * 15) * 10) / 10
}

type MsInterval = { startMs: number; endMs: number }

function mergeSleepIntervalsMs(intervals: MsInterval[]): MsInterval[] {
  const valid = intervals
    .filter((x) => x.endMs > x.startMs)
    .sort((a, b) => a.startMs - b.startMs)
  const out: MsInterval[] = []
  for (const cur of valid) {
    const last = out[out.length - 1]
    if (!last || cur.startMs > last.endMs) {
      out.push({ ...cur })
    } else {
      last.endMs = Math.max(last.endMs, cur.endMs)
    }
  }
  return out
}

type WakeGapComputation = {
  maxInterSleepGapHours: number | null
  rawPenalty: number
  goodGapStreakDays: number
  wakeGapPenalty: number
  wakeGapDaysUntilClear: number | null
}

/**
 * Builds merged sleep timeline (main + nap), consecutive gaps, max gap, and strict 3-day recovery.
 */
export function computeWakeGapMetrics(
  intervals: SleepIntervalForGap[],
  timeZone: string,
  now: Date,
): WakeGapComputation {
  const cutoff = now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  const nowMs = now.getTime()

  const msIntervals: MsInterval[] = []
  for (const it of intervals) {
    const start = toDate(it.sleep_start).getTime()
    const end = toDate(it.sleep_end).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue
    if (end < cutoff) continue
    if (start >= nowMs) continue
    msIntervals.push({ startMs: start, endMs: Math.min(end, nowMs) })
  }

  const merged = mergeSleepIntervalsMs(msIntervals)
  if (merged.length < 2) {
    return {
      maxInterSleepGapHours: null,
      rawPenalty: 0,
      goodGapStreakDays: 0,
      wakeGapPenalty: 0,
      wakeGapDaysUntilClear: null,
    }
  }

  let maxGapHours = 0
  const gapsByWakeDay = new Map<string, number>()

  for (let i = 0; i < merged.length - 1; i += 1) {
    const prevEnd = merged[i]!.endMs
    const nextStart = merged[i + 1]!.startMs
    const gapMs = nextStart - prevEnd
    if (gapMs < 0) continue
    const gapH = gapMs / 3600000
    maxGapHours = Math.max(maxGapHours, gapH)
    const dayKey = getLocalDateString(new Date(prevEnd), timeZone)
    const prevMax = gapsByWakeDay.get(dayKey) ?? 0
    if (gapH > prevMax) gapsByWakeDay.set(dayKey, gapH)
  }

  const rawPenalty = rawWakeGapPenaltyFromMaxGap(maxGapHours)

  let goodGapStreakDays = 0
  for (let i = 0; i < 40; i += 1) {
    const d = new Date(nowMs - i * 24 * 60 * 60 * 1000)
    const key = getLocalDateString(d, timeZone)
    const maxOnDay = gapsByWakeDay.get(key) ?? 0
    if (maxOnDay <= GOOD_GAP_MAX_H) goodGapStreakDays += 1
    else break
  }

  const hysteresisClear = goodGapStreakDays >= GOOD_GAP_STREAK_REQUIRED
  const wakeGapPenalty =
    rawPenalty > 0 && !hysteresisClear
      ? Math.round(rawPenalty * 10) / 10
      : 0
  const wakeGapDaysUntilClear =
    wakeGapPenalty > 0 ? Math.max(0, GOOD_GAP_STREAK_REQUIRED - goodGapStreakDays) : null

  return {
    maxInterSleepGapHours: Math.round(maxGapHours * 100) / 100,
    rawPenalty,
    goodGapStreakDays,
    wakeGapPenalty,
    wakeGapDaysUntilClear,
  }
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v)
}

function getLocalDecimalHours(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return h + m / 60
}

function getLocalDateString(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function wrapHour(decimal: number): number {
  let x = decimal % 24
  if (x < 0) x += 24
  return x
}

function decimalHoursToMins(dec: number): number {
  return Math.round(wrapHour(dec) * 60)
}

function minsToHHMM(totalMins: number): string {
  let m = Math.round(totalMins)
  m = ((m % 1440) + 1440) % 1440
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function formatMidpointClock(decimalHours: number): string {
  const w = wrapHour(decimalHours)
  const hh = Math.floor(w)
  const mm = Math.round((w - hh) * 60) % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function offsetFromMidpoint(midpointDec: number): number {
  return midpointDec - BIO_ANCHOR_H
}

function statusFromScore(score: number): string {
  if (score >= 90) return 'Strongly aligned'
  if (score >= 75) return 'Well aligned'
  if (score >= 55) return 'Moderately aligned'
  if (score >= 35) return 'Out of sync'
  if (score >= 15) return 'Significantly disrupted'
  return 'Severely disrupted'
}

type DayEntry = { offset: number; midpointDec: number; durationMs: number }

/** Circular spread of clock hours (handles wrap); interpret as ~hours on circle */
function circadianSpreadHours(midpointDecs: number[]): number {
  if (midpointDecs.length < 2) return Infinity
  const rads = midpointDecs.map((h) => ((wrapHour(h) / 24) * 2 * Math.PI))
  const sinM = rads.reduce((s, r) => s + Math.sin(r), 0) / rads.length
  const cosM = rads.reduce((s, r) => s + Math.cos(r), 0) / rads.length
  const R = Math.sqrt(sinM * sinM + cosM * cosM)
  const circVar = -2 * Math.log(Math.min(1, Math.max(1e-9, R)))
  return Math.sqrt(Math.max(0, circVar)) * (24 / (2 * Math.PI))
}

function countLogsInLookback(sleepLogs: SleepLog[], now: Date): number {
  const cutoff = now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  return sleepLogs.filter((l) => toDate(l.sleep_end).getTime() >= cutoff).length
}

function buildByDate(sleepLogs: SleepLog[], timeZone: string, now: Date): Map<string, DayEntry> {
  const cutoff = now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  const byDate = new Map<string, DayEntry>()

  for (const log of sleepLogs) {
    const start = toDate(log.sleep_start)
    const end = toDate(log.sleep_end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue
    if (end.getTime() < cutoff) continue

    const mid = new Date((start.getTime() + end.getTime()) / 2)
    const dateKey = getLocalDateString(mid, timeZone)
    const midDec = getLocalDecimalHours(mid, timeZone)
    const off = offsetFromMidpoint(midDec)
    const durationMs = end.getTime() - start.getTime()

    const prev = byDate.get(dateKey)
    if (!prev || durationMs > prev.durationMs) {
      byDate.set(dateKey, { offset: off, midpointDec: midDec, durationMs })
    }
  }
  return byDate
}

/** Mean main-sleep duration (hours) over the last `maxDays` logged nights (most recent first). */
function avgMainSleepHoursRecent(
  byDate: Map<string, DayEntry>,
  sortedRecentFirst: string[],
  maxDays = 7,
): number | null {
  const keys = sortedRecentFirst.slice(0, maxDays)
  const hrs: number[] = []
  for (const k of keys) {
    const e = byDate.get(k)
    if (e && e.durationMs > 0) hrs.push(e.durationMs / 3600000)
  }
  if (hrs.length < 2) return null
  return hrs.reduce((a, b) => a + b, 0) / hrs.length
}

function normalizedSleepGoalH(sleepGoalH: number | undefined): number {
  const g = sleepGoalH != null && sleepGoalH > 0 ? sleepGoalH : 7.5
  return Math.max(4, Math.min(12, g))
}

/**
 * Pulls the headline score down when average sleep is well under the user's goal.
 * Stable bedtimes / midpoints alone should not read as "fully aligned" on chronic restriction.
 */
function computeSleepDurationPenalty(avgHours: number | null, sleepGoalH: number | undefined): number {
  if (avgHours == null) return 0
  const goal = normalizedSleepGoalH(sleepGoalH)
  const ratio = avgHours / goal
  if (ratio >= 0.9) return 0
  const span = 0.9 - 0.35
  const t = Math.min(1, Math.max(0, (0.9 - ratio) / span))
  return Math.round(Math.min(40, t * 40) * 10) / 10
}

function applyPenaltiesToScore(
  timingScore: number,
  durationPenalty: number,
  wakeGapPenalty: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round((timingScore - durationPenalty - wakeGapPenalty) * 10) / 10,
    ),
  )
}

function countConsecutiveFromNow(
  byDate: Map<string, DayEntry>,
  now: Date,
  timeZone: string,
  mode: 'misaligned' | 'aligned',
): number {
  let count = 0
  let t = now.getTime()
  for (let i = 0; i < 40; i += 1) {
    const key = getLocalDateString(new Date(t), timeZone)
    const entry = byDate.get(key)
    if (!entry) break
    const mis = Math.abs(entry.offset) > MISALIGN_THRESH_H
    if (mode === 'misaligned' && !mis) break
    if (mode === 'aligned' && mis) break
    count += 1
    t -= 24 * 60 * 60 * 1000
  }
  return count
}

function recoveryBonusLast3(byDate: Map<string, DayEntry>, sortedRecentFirst: string[]): number {
  if (sortedRecentFirst.length < 3) return 0
  const a0 = Math.abs(byDate.get(sortedRecentFirst[0]!)!.offset)
  const a1 = Math.abs(byDate.get(sortedRecentFirst[1]!)!.offset)
  const a2 = Math.abs(byDate.get(sortedRecentFirst[2]!)!.offset)
  if (!(a0 < a1 && a1 < a2)) return 0
  const improvementPerDay = (a2 - a0) / 2
  return Math.min(improvementPerDay * 2, 10)
}

function checkAdaptedPattern(
  byDate: Map<string, DayEntry>,
  sortedRecentFirst: string[],
): { adapted: boolean; adaptationDays: number } {
  const n = sortedRecentFirst.length
  if (n < ADAPT_MIN_DAYS) return { adapted: false, adaptationDays: 0 }

  for (let w = n; w >= ADAPT_MIN_DAYS; w -= 1) {
    const slice = sortedRecentFirst.slice(0, w)
    const mids = slice.map((d) => byDate.get(d)!.midpointDec)
    const spread = circadianSpreadHours(mids)
    if (spread <= ADAPT_SPREAD_MAX_H) {
      return { adapted: true, adaptationDays: w }
    }
  }
  return { adapted: false, adaptationDays: 0 }
}

function sleepAppropriateForShift(
  state: UserShiftState,
  offset: number,
  midpointDec: number,
): boolean {
  const mode = state.currentMode
  if (mode === 'NIGHT_NORMAL') {
    return offset >= 1 || wrapHour(midpointDec) >= 9
  }
  if (mode === 'DAY_NORMAL') {
    return Math.abs(offset) <= 3
  }
  if (mode === 'TRANSITIONING' || mode === 'RECOVERING') {
    const toNight = String(state.activeTransition?.to ?? '')
      .toUpperCase()
      .includes('NIGHT')
    if (toNight) return offset >= 0.5 || wrapHour(midpointDec) >= 8
    return Math.abs(offset) <= 3.5
  }
  return false
}

function computeTrend(
  byDate: Map<string, DayEntry>,
  sortedRecentFirst: string[],
): { trend: CircadianState['trend']; trendDays: number } {
  const trendDays = 7
  if (sortedRecentFirst.length < 4) return { trend: 'stable', trendDays }
  const recent = sortedRecentFirst.slice(0, 3).map((d) => Math.abs(byDate.get(d)!.offset))
  const older = sortedRecentFirst.slice(3, 6).map((d) => Math.abs(byDate.get(d)!.offset))
  if (older.length === 0) return { trend: 'stable', trendDays }
  const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const oAvg = older.reduce((a, b) => a + b, 0) / older.length
  const delta = oAvg - rAvg
  if (delta > 0.35) return { trend: 'improving', trendDays }
  if (delta < -0.35) return { trend: 'declining', trendDays }
  return { trend: 'stable', trendDays }
}

function finalScoreParts(
  offset: number,
  consecutiveMisaligned: number,
  recoveryBonus: number,
  shiftFitBonus: number,
): number {
  const baseScore = Math.max(0, 100 - Math.abs(offset) * 11)
  const driftPenalty = Math.min(consecutiveMisaligned * 3, 25)
  const raw = baseScore - driftPenalty + recoveryBonus + shiftFitBonus
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10))
}

function offsetVelocity(byDate: Map<string, DayEntry>, sortedRecentFirst: string[]): number {
  if (sortedRecentFirst.length < 2) return 0
  return (
    byDate.get(sortedRecentFirst[0]!)!.offset - byDate.get(sortedRecentFirst[1]!)!.offset
  )
}

function nextShiftBiasHours(state: UserShiftState | null): number {
  if (!state?.activeTransition?.nextShiftStart) return 0
  const ns = state.activeTransition.nextShiftStart
  const h = getLocalDecimalHours(ns, 'UTC')
  const centered = h - 14
  return Math.max(-2, Math.min(2, centered / 8))
}

function buildForecast(
  primaryOffset: number,
  velocity: number,
  consecutiveMisaligned: number,
  recoveryBonus: number,
  shiftFitBonus: number,
  shiftBias: number,
  durationPenalty: number,
  wakeGapPenalty: number,
): CircadianState['forecast'] {
  const projectOffset = (days: number) => {
    const off =
      primaryOffset + (velocity + shiftBias * 0.25) * days + shiftBias * Math.min(days, 3) * 0.15
    return Math.max(-14, Math.min(14, off))
  }

  const misStreakAfter = (days: number, projectedOffset: number) => {
    let s = consecutiveMisaligned
    if (Math.abs(projectedOffset) <= MISALIGN_THRESH_H) {
      s = Math.max(0, s - days)
    } else {
      s = Math.min(30, s + Math.floor(days / 2))
    }
    return s
  }

  const sc = (days: number) => {
    const off = projectOffset(days)
    const streak = misStreakAfter(days, off)
    const raw = finalScoreParts(off, streak, recoveryBonus, shiftFitBonus)
    return applyPenaltiesToScore(raw, durationPenalty, wakeGapPenalty)
  }

  const tomorrow = sc(1)
  const threeDays = sc(3)
  const sevenDays = sc(7)

  let recoveryDays = 0
  for (let d = 0; d < 60; d += 1) {
    const off = projectOffset(d) * Math.pow(0.97, d)
    const streak = Math.max(0, consecutiveMisaligned - d)
    const s = applyPenaltiesToScore(
      finalScoreParts(off, streak, recoveryBonus, shiftFitBonus),
      durationPenalty,
      wakeGapPenalty,
    )
    if (s >= 75) {
      recoveryDays = d
      break
    }
    recoveryDays = d + 1
  }

  return { tomorrow, threeDays, sevenDays, recoveryDays }
}

export function calculateCircadianScore(
  sleepLogs: SleepLog[],
  userShiftState: UserShiftState | null,
  userProfile: CircadianUserProfile,
  options?: { now?: Date; allSleepIntervalsForGap?: SleepIntervalForGap[] },
): CircadianState {
  const now = options?.now ?? new Date()
  const tz = userProfile.timezone?.trim() || 'UTC'

  const gapIntervals: SleepIntervalForGap[] =
    options?.allSleepIntervalsForGap ??
    sleepLogs.map((l) => ({ sleep_start: l.sleep_start, sleep_end: l.sleep_end, kind: 'main' as const }))
  const wakeGap = computeWakeGapMetrics(gapIntervals, tz, now)

  const nInWindow = countLogsInLookback(sleepLogs, now)
  let dataQuality: CircadianState['dataQuality']
  if (nInWindow >= 5) dataQuality = 'good'
  else if (nInWindow >= 2) dataQuality = 'partial'
  else dataQuality = 'insufficient'

  const byDate = buildByDate(sleepLogs, tz, now)
  const sortedRecentFirst = [...byDate.keys()].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0))

  const todayKey = getLocalDateString(now, tz)
  const primaryKey =
    sortedRecentFirst.length === 0
      ? null
      : byDate.has(todayKey)
        ? todayKey
        : sortedRecentFirst[0]!

  let primaryOffset = 0
  let primaryMidpointDec = BIO_ANCHOR_H

  if (primaryKey != null) {
    const ent = byDate.get(primaryKey)!
    primaryOffset = ent.offset
    primaryMidpointDec = ent.midpointDec
  } else {
    const valid = sleepLogs
      .map((l) => ({ s: toDate(l.sleep_start), e: toDate(l.sleep_end) }))
      .filter(({ s, e }) => !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e > s)
      .sort((a, b) => b.e.getTime() - a.e.getTime())
    if (valid.length > 0) {
      const { s, e } = valid[0]!
      const midDec = getLocalDecimalHours(new Date((s.getTime() + e.getTime()) / 2), tz)
      primaryMidpointDec = midDec
      primaryOffset = offsetFromMidpoint(midDec)
    }
  }

  const consecutiveMisalignedDays = countConsecutiveFromNow(byDate, now, tz, 'misaligned')
  const consecutiveAlignedDays = countConsecutiveFromNow(byDate, now, tz, 'aligned')

  const recoveryBonus = recoveryBonusLast3(byDate, sortedRecentFirst)
  const { adapted: adaptedPattern, adaptationDays } = checkAdaptedPattern(byDate, sortedRecentFirst)

  let shiftFitBonus = 0
  if (adaptedPattern) {
    shiftFitBonus = 5
  } else if (
    userShiftState &&
    sleepAppropriateForShift(userShiftState, primaryOffset, primaryMidpointDec)
  ) {
    shiftFitBonus = 5
  }

  const recentAvgSleepHours = avgMainSleepHoursRecent(byDate, sortedRecentFirst, 7)
  const goalH = normalizedSleepGoalH(userProfile.sleep_goal_h)
  const durationPenalty = computeSleepDurationPenalty(recentAvgSleepHours, userProfile.sleep_goal_h)

  if (recentAvgSleepHours != null && goalH > 0 && recentAvgSleepHours / goalH < 0.68) {
    shiftFitBonus = 0
  }

  const baseScore = Math.max(0, 100 - Math.abs(primaryOffset) * 11)
  const driftPenalty = Math.min(consecutiveMisalignedDays * 3, 25)
  const timingScore = finalScoreParts(primaryOffset, consecutiveMisalignedDays, recoveryBonus, shiftFitBonus)
  const score = applyPenaltiesToScore(timingScore, durationPenalty, wakeGap.wakeGapPenalty)

  const midM = decimalHoursToMins(primaryMidpointDec)
  const peakAlertnessTime = minsToHHMM(midM - 60 + 7 * 60)
  const lowEnergyTime = minsToHHMM(midM - 3 * 60)

  const { trend, trendDays } = computeTrend(byDate, sortedRecentFirst)
  const velocity = offsetVelocity(byDate, sortedRecentFirst)
  const shiftBias = nextShiftBiasHours(userShiftState)

  const forecast = buildForecast(
    primaryOffset,
    velocity,
    consecutiveMisalignedDays,
    recoveryBonus,
    shiftFitBonus,
    shiftBias,
    durationPenalty,
    wakeGap.wakeGapPenalty,
  )

  const history: CircadianState['sleepMidpointHistory'] = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      midpoint: formatMidpointClock(v.midpointDec),
      offset: Math.round(v.offset * 100) / 100,
    }))

  return {
    score,
    status: statusFromScore(score),
    trend,
    trendDays,
    sleepMidpointOffset: Math.round(primaryOffset * 100) / 100,
    sleepMidpointHistory: history,
    consecutiveMisalignedDays,
    consecutiveAlignedDays,
    peakAlertnessTime,
    lowEnergyTime,
    adaptedPattern,
    adaptationDays,
    scoreBreakdown: {
      baseScore,
      driftPenalty,
      recoveryBonus,
      shiftFitBonus,
      durationPenalty,
      wakeGapPenalty: wakeGap.wakeGapPenalty,
      maxInterSleepGapHours: wakeGap.maxInterSleepGapHours,
      goodGapStreakDays: wakeGap.goodGapStreakDays,
      wakeGapDaysUntilClear: wakeGap.wakeGapDaysUntilClear,
    },
    forecast,
    lastCalculated: now,
    dataQuality,
    recentAvgSleepHours,
  }
}
