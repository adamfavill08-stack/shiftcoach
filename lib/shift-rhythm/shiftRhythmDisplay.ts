import type { ShiftRhythmScores } from './engine'

/**
 * GET /api/shift-rhythm returns `score.total_score` on a 0–10 scale (see engine.ts).
 * Dashboard body-clock gauge uses 0–100 (dashboard passes `total * 10` into ShiftRhythmCard).
 */
export function shiftRhythmTotalToGauge100(total: number | null | undefined): number {
  if (total == null || Number.isNaN(total)) return 0
  const n = Number(total)
  if (n <= 10) return Math.min(100, Math.round(n * 10))
  return Math.min(100, Math.round(n))
}

/** Matches `calculateShiftRhythm` sleep composite (before 60% weight on headline). */
export function computeSleepComposite(
  s: Pick<ShiftRhythmScores, 'sleep_score' | 'regularity_score' | 'shift_pattern_score' | 'recovery_score'>,
): number {
  const v =
    s.sleep_score * 0.35 +
    s.regularity_score * 0.25 +
    s.shift_pattern_score * 0.2 +
    s.recovery_score * 0.2
  return Math.min(100, Math.max(0, Math.round(v)))
}

