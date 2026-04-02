/**
 * Core circadian alignment score (calculation only — no UI).
 * Midpoint vs 03:00 biological anchor in the user's timezone, drift, recovery, shift fit.
 */
import type { UserShiftState } from '@/lib/shift-agent/types'

export type SleepLog = {
  sleep_start: Date | string
  sleep_end: Date | string
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
}

const BIO_ANCHOR_H = 3
const MISALIGN_THRESH_H = 2
const ADAPT_SPREAD_MAX_H = 1.5
const ADAPT_MIN_DAYS = 7
const LOOKBACK_DAYS = 14

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
  return Math.min(
    100,
    Math.round((baseScore - driftPenalty + recoveryBonus + shiftFitBonus) * 10) / 10,
  )
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
    return finalScoreParts(off, streak, recoveryBonus, shiftFitBonus)
  }

  const tomorrow = sc(1)
  const threeDays = sc(3)
  const sevenDays = sc(7)

  let recoveryDays = 0
  for (let d = 0; d < 60; d += 1) {
    const off = projectOffset(d) * Math.pow(0.97, d)
    const streak = Math.max(0, consecutiveMisaligned - d)
    const s = finalScoreParts(off, streak, recoveryBonus, shiftFitBonus)
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
  options?: { now?: Date },
): CircadianState {
  const now = options?.now ?? new Date()
  const tz = userProfile.timezone?.trim() || 'UTC'

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

  const baseScore = Math.max(0, 100 - Math.abs(primaryOffset) * 11)
  const driftPenalty = Math.min(consecutiveMisalignedDays * 3, 25)
  const score = finalScoreParts(primaryOffset, consecutiveMisalignedDays, recoveryBonus, shiftFitBonus)

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
    },
    forecast,
    lastCalculated: now,
    dataQuality,
  }
}
