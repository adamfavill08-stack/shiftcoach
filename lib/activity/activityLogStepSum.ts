/**
 * Step totals for activity_logs rows: exclude manual rows superseded when wearable caught up.
 * Daily totals use {@link computeActivityTotalsBreakdown}: wearable is source of truth when present;
 * manual steps are fallback only (not added on top of wearable).
 */

export type ActivityTotalsSourceOfTruth = 'wearable' | 'manual' | 'none'

export type ActivityLogRowForTotals = {
  id?: string | null
  steps?: number | null
  source?: string | null
  merge_status?: string | null
}

export type ActivityTotalsBreakdown = {
  totalSteps: number
  wearableSteps: number
  manualStepsCounted: number
  manualStepsNotCounted: number
  manualStepsSuperseded: number
  sourceOfTruth: ActivityTotalsSourceOfTruth
  /** Row ids that determined `totalSteps` (wearable max row(s), or contributing manuals). Dev / support only. */
  contributingRowIds?: string[]
}

export function isManualActivityRow(source: string | null | undefined): boolean {
  const n = String(source ?? '').trim().toLowerCase()
  return n === 'manual' || n === 'manual entry'
}

function rowSteps(row: { steps?: number | null }): number {
  const s = typeof row.steps === 'number' && Number.isFinite(row.steps) ? row.steps : 0
  return Math.max(0, Math.round(s))
}

function dedupeRowsById<T extends { id?: unknown }>(rows: readonly T[]): T[] {
  const byId = new Map<string, T>()
  const noId: T[] = []
  for (const r of rows) {
    const id = r.id
    if (id != null && id !== '') byId.set(String(id), r)
    else noId.push(r)
  }
  return [...byId.values(), ...noId]
}

/**
 * Wearable-first daily total: if any wearable row has steps &gt; 0, total equals the max wearable
 * value for the day (dedupes duplicate daily sync rows). Otherwise total is the sum of active
 * (non-superseded) manual session steps.
 */
export function computeActivityTotalsBreakdown(
  rows: readonly ActivityLogRowForTotals[],
  opts?: { includeDebugContributingIds?: boolean },
): ActivityTotalsBreakdown {
  const deduped = dedupeRowsById(rows as readonly { id?: unknown }[]) as ActivityLogRowForTotals[]

  const manualRows = deduped.filter((r) => isManualActivityRow(r.source))
  const wearableRows = deduped.filter((r) => !isManualActivityRow(r.source))

  const wearableStepVals = wearableRows.map(rowSteps).filter((s) => s > 0)
  const wearableSteps = wearableStepVals.length > 0 ? Math.max(...wearableStepVals) : 0

  let manualActiveSum = 0
  let manualSupersededSum = 0
  for (const r of manualRows) {
    const s = rowSteps(r)
    if (r.merge_status === 'superseded_by_wearable') manualSupersededSum += s
    else manualActiveSum += s
  }

  const hasWearable = wearableSteps > 0
  const sourceOfTruth: ActivityTotalsSourceOfTruth = hasWearable
    ? 'wearable'
    : manualActiveSum > 0
      ? 'manual'
      : 'none'

  const totalSteps = hasWearable ? wearableSteps : manualActiveSum
  const manualStepsCounted = sourceOfTruth === 'manual' ? manualActiveSum : 0
  const manualStepsNotCounted = hasWearable ? manualActiveSum : 0

  let contributingRowIds: string[] | undefined
  if (opts?.includeDebugContributingIds) {
    if (hasWearable) {
      contributingRowIds = wearableRows
        .filter((r) => rowSteps(r) === wearableSteps && wearableSteps > 0)
        .map((r) => (r.id != null ? String(r.id) : ''))
        .filter(Boolean)
    } else if (manualActiveSum > 0) {
      contributingRowIds = manualRows
        .filter((r) => r.merge_status !== 'superseded_by_wearable')
        .map((r) => (r.id != null ? String(r.id) : ''))
        .filter(Boolean)
    } else {
      contributingRowIds = []
    }
  }

  return {
    totalSteps,
    wearableSteps,
    manualStepsCounted,
    manualStepsNotCounted,
    manualStepsSuperseded: manualSupersededSum,
    sourceOfTruth,
    ...(contributingRowIds !== undefined ? { contributingRowIds } : {}),
  }
}

export function toPublicActivityTotalsBreakdown(
  b: ActivityTotalsBreakdown,
  includeDebug: boolean,
): Omit<ActivityTotalsBreakdown, 'contributingRowIds'> & { contributingRowIds?: string[] } {
  if (includeDebug && b.contributingRowIds?.length) {
    return { ...b }
  }
  const { contributingRowIds: _c, ...rest } = b
  return rest
}

/** Steps that count toward daily totals (wearable + active manual). */
export function effectiveActivityLogSteps(row: { steps?: number | null; source?: string | null; merge_status?: string | null }): number {
  const steps = typeof row.steps === 'number' && Number.isFinite(row.steps) ? row.steps : 0
  if (!isManualActivityRow(row.source)) return steps
  if (row.merge_status === 'superseded_by_wearable') return 0
  return steps
}

/** Civil-day total via {@link computeActivityTotalsBreakdown} (wearable wins when present). */
export function sumStepsFromActivityLogRows(rows: readonly ActivityLogRowForTotals[]): number {
  return computeActivityTotalsBreakdown(rows).totalSteps
}

/** Daily wearable delta heuristic: if sync adds at least ~70% of a manual block, treat manual as superseded. */
export function wearableDeltaSupersedesManual(delta: number, manualSteps: number): boolean {
  if (delta <= 0 || manualSteps <= 0) return false
  return delta >= Math.ceil(0.7 * manualSteps)
}
