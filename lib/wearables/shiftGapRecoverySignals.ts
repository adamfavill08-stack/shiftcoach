import type { HrSample } from '@/lib/wearables/aggregateHrSamples'
import { percentileRestingBpm, sortBpms } from '@/lib/wearables/aggregateHrSamples'

export type SleepOverlapRow = {
  start_at: string
  end_at: string
  stage: string | null
}

const ASLEEP_STAGES = new Set(['asleep', 'light', 'deep', 'rem'])

/** Overlap of wearable sleep sessions with [windowStart, windowEnd); counts stages we treat as asleep. */
export function overlapAsleepHoursInWindow(
  rows: readonly SleepOverlapRow[],
  windowStart: Date,
  windowEnd: Date,
): { hours: number; sessionCount: number } {
  const ws = windowStart.getTime()
  const we = windowEnd.getTime()
  if (!(Number.isFinite(ws) && Number.isFinite(we)) || we <= ws) return { hours: 0, sessionCount: 0 }

  let totalMs = 0
  let sessionCount = 0
  for (const r of rows) {
    const ss = Date.parse(r.start_at)
    const ee = Date.parse(r.end_at)
    if (!Number.isFinite(ss) || !Number.isFinite(ee) || ee <= ss) continue
    const st = String(r.stage ?? 'asleep').toLowerCase()
    if (!ASLEEP_STAGES.has(st)) continue

    const lo = Math.max(ss, ws)
    const hi = Math.min(ee, we)
    if (hi <= lo) continue
    totalMs += hi - lo
    sessionCount += 1
  }
  return { hours: totalMs / (3600 * 1000), sessionCount }
}

const BASELINE_MIN_SAMPLES = 12
const BASELINE_MIN_SPAN_MS = 15 * 60 * 1000

/**
 * Resting HR estimate from samples in [lookbackStart, now], excluding samples inside the recovery gap.
 */
export function baselineRestingOutsideGap(
  samples: readonly HrSample[],
  windowStart: Date,
  windowEnd: Date,
  lookbackStartMs: number,
  nowMs: number,
): { resting_bpm: number | null; sample_count: number; span_ms: number; sufficient: boolean } {
  const ws = windowStart.getTime()
  const we = windowEnd.getTime()
  const pool: HrSample[] = []
  const times: number[] = []
  for (const s of samples) {
    const t = Date.parse(s.recorded_at)
    if (!Number.isFinite(t)) continue
    if (t < lookbackStartMs || t > nowMs) continue
    if (t >= ws && t < we) continue
    pool.push(s)
    times.push(t)
  }
  times.sort((a, b) => a - b)
  const span_ms = times.length >= 2 ? times[times.length - 1] - times[0] : 0
  const sorted = sortBpms(pool)
  const resting = percentileRestingBpm(sorted, 0.1)
  const sufficient = sorted.length >= BASELINE_MIN_SAMPLES && span_ms >= BASELINE_MIN_SPAN_MS
  return {
    resting_bpm: resting,
    sample_count: sorted.length,
    span_ms,
    sufficient,
  }
}

export type RecoveryBand = 'low' | 'medium' | 'good'

/**
 * Shift-aware composite: sleep in gap, resting vs personal baseline, and intra-window HR spread (avg − resting).
 */
export function computeRecoveryComposite(input: {
  sleepHoursInWindow: number
  restingInWindow: number | null
  baselineResting: number | null
  baselineSufficient: boolean
  recoveryDeltaBpm: number | null
  primarySufficient: boolean
}): {
  recovery_band: RecoveryBand | null
  recovery_score: number | null
  resting_vs_baseline_bpm: number | null
} {
  const { sleepHoursInWindow, restingInWindow, baselineResting, baselineSufficient, recoveryDeltaBpm, primarySufficient } =
    input

  const restingVsBaseline =
    restingInWindow != null && baselineResting != null && baselineSufficient
      ? Math.round((restingInWindow - baselineResting) * 10) / 10
      : null

  let sleepPts = 0
  if (sleepHoursInWindow < 1) sleepPts = 5
  else if (sleepHoursInWindow < 3) sleepPts = 18
  else if (sleepHoursInWindow < 4) sleepPts = 28
  else if (sleepHoursInWindow < 6) sleepPts = 36
  else if (sleepHoursInWindow < 7) sleepPts = 40
  else sleepPts = 45

  let baselinePts = 18
  if (restingVsBaseline != null) {
    if (restingVsBaseline <= 0) baselinePts = 40
    else if (restingVsBaseline <= 3) baselinePts = 32
    else if (restingVsBaseline <= 7) baselinePts = 22
    else baselinePts = 10
  } else if (!baselineSufficient) {
    baselinePts = 15
  }

  let spreadPts = 12
  if (primarySufficient && recoveryDeltaBpm != null) {
    if (recoveryDeltaBpm <= 12) spreadPts = 18
    else if (recoveryDeltaBpm <= 20) spreadPts = 12
    else spreadPts = 5
  }

  const score = Math.round(sleepPts + baselinePts + spreadPts)
  const hasHrSignal = primarySufficient && restingInWindow != null
  const hasSleepSignal = sleepHoursInWindow >= 0.75
  if (!hasHrSignal && !hasSleepSignal) {
    return { recovery_band: null, recovery_score: null, resting_vs_baseline_bpm: restingVsBaseline }
  }

  let band: RecoveryBand
  if (score >= 68) band = 'good'
  else if (score >= 44) band = 'medium'
  else band = 'low'

  return {
    recovery_band: band,
    recovery_score: score,
    resting_vs_baseline_bpm: restingVsBaseline,
  }
}
