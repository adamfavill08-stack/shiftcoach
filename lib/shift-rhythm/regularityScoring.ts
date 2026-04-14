/**
 * Replaces the broken getStdDevHours approach in engine.ts with:
 *   1. Circular statistics so midnight-crossing times work correctly
 *   2. Shift-context grouping so night/day/off bedtimes are compared
 *      within their own cluster, not against each other
 *   3. Null-safe output when there's not enough data to score
 */

import { mapRange } from './utils'

export type ShiftContext = 'day' | 'night' | 'evening' | 'off' | 'unknown'

export interface SleepLogWithContext {
  start: string
  shiftLabel: string | null
}

export interface RegularityResult {
  score: number | null
  stdDevHours: number | null
  groupCount: number
  reason: string
}

export function computeRegularityScore(logs: SleepLogWithContext[]): RegularityResult {
  if (logs.length === 0) {
    return { score: null, stdDevHours: null, groupCount: 0, reason: 'No sleep logs in window' }
  }
  if (logs.length === 1) {
    return { score: null, stdDevHours: null, groupCount: 0, reason: 'Only one sleep log — need ≥2 to calculate consistency' }
  }

  const groups = groupByShiftContext(logs)
  const validGroups = [...groups.entries()].filter(([, times]) => times.length >= 2)

  if (validGroups.length === 0) {
    return {
      score: null,
      stdDevHours: null,
      groupCount: 0,
      reason: `${logs.length} logs across ${groups.size} shift types — need ≥2 logs per type`,
    }
  }

  let totalWeight = 0
  let weightedStdDev = 0

  for (const [, times] of validGroups) {
    const std = circularStdDevHours(times)
    weightedStdDev += std * times.length
    totalWeight += times.length
  }

  const avgStdDev = weightedStdDev / totalWeight
  const raw = mapRange(avgStdDev, 0, 3.5, 100, 40)
  const score = Math.min(100, Math.max(0, Math.round(raw)))

  return {
    score,
    stdDevHours: Math.round(avgStdDev * 100) / 100,
    groupCount: validGroups.length,
    reason: `Scored from ${validGroups.length} shift group(s), weighted avg std dev ${avgStdDev.toFixed(2)}h`,
  }
}

function normaliseShiftLabel(raw: string | null): ShiftContext {
  if (!raw) return 'off'
  const l = raw.toLowerCase().trim()
  if (l.includes('night') || l.includes('noc'))              return 'night'
  if (l.includes('evening') || l.includes('late'))           return 'evening'
  if (l.includes('day') || l.includes('early') || l.includes('am')) return 'day'
  if (l.includes('off') || l.includes('rest') || l.includes('annual')) return 'off'
  return 'unknown'
}

function groupByShiftContext(logs: SleepLogWithContext[]): Map<ShiftContext, Date[]> {
  const groups = new Map<ShiftContext, Date[]>()
  for (const log of logs) {
    const context = normaliseShiftLabel(log.shiftLabel)
    if (!groups.has(context)) groups.set(context, [])
    groups.get(context)!.push(new Date(log.start))
  }
  return groups
}

export function circularStdDevHours(times: Date[]): number {
  if (times.length <= 1) return 0
  const toRadians = (d: Date): number =>
    (2 * Math.PI * (d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600)) / 24
  const angles = times.map(toRadians)
  const sumSin = angles.reduce((s, a) => s + Math.sin(a), 0)
  const sumCos = angles.reduce((s, a) => s + Math.cos(a), 0)
  const R = Math.sqrt(sumSin ** 2 + sumCos ** 2) / angles.length
  const safeR = Math.max(R, 1e-10)
  const stdRadians = Math.sqrt(-2 * Math.log(safeR))
  return stdRadians * (24 / (2 * Math.PI))
}
