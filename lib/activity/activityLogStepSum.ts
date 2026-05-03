/**
 * Step totals for activity_logs rows: exclude manual rows superseded when wearable caught up.
 */

export function isManualActivityRow(source: string | null | undefined): boolean {
  const n = String(source ?? '').trim().toLowerCase()
  return n === 'manual' || n === 'manual entry'
}

/** Steps that count toward daily totals (wearable + active manual). */
export function effectiveActivityLogSteps(row: { steps?: number | null; source?: string | null; merge_status?: string | null }): number {
  const steps = typeof row.steps === 'number' && Number.isFinite(row.steps) ? row.steps : 0
  if (!isManualActivityRow(row.source)) return steps
  if (row.merge_status === 'superseded_by_wearable') return 0
  return steps
}

export function sumStepsFromActivityLogRows(rows: readonly { steps?: number | null; source?: string | null; merge_status?: string | null }[]): number {
  return rows.reduce((sum, r) => sum + effectiveActivityLogSteps(r), 0)
}

/** Daily wearable delta heuristic: if sync adds at least ~70% of a manual block, treat manual as superseded. */
export function wearableDeltaSupersedesManual(delta: number, manualSteps: number): boolean {
  if (delta <= 0 || manualSteps <= 0) return false
  return delta >= Math.ceil(0.7 * manualSteps)
}
