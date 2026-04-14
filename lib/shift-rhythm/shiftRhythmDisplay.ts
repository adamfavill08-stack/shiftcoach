/**
 * GET /api/shift-rhythm returns `score.total_score` on a 0–10 scale (see engine.ts).
 * Dashboard body-clock gauge uses 0–100 (dashboard passes `total * 10` into ShiftRhythmCard).
 */
export { computeSleepComposite } from './scoring'

export function shiftRhythmTotalToGauge100(total: number | null | undefined): number {
  if (total == null || Number.isNaN(total)) return 0
  const n = Number(total)
  if (n <= 10) return Math.min(100, Math.round(n * 10))
  return Math.min(100, Math.round(n))
}
