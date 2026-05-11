/**
 * Step totals for activity_logs rows: exclude manual rows superseded when wearable caught up.
 * Daily totals use {@link computeActivityTotalsBreakdown}: wearable is source of truth when present;
 * manual steps are fallback only (not added on top of wearable).
 *
 * When several wearables exist for the same civil day (e.g. legacy Google Fit + Health Connect),
 * we prefer Health Connect and pick the **latest** row by `logged_at` / `ts` within that family
 * so totals track the HC app rather than `max()` across stale sources.
 */

import { wearableAggregatedFamilyId } from '@/lib/activity/activityLogWearableDedupe'

export type ActivityTotalsSourceOfTruth = 'wearable' | 'manual' | 'none'

export type ActivityLogRowForTotals = {
  id?: string | null
  steps?: number | null
  source?: string | null
  merge_status?: string | null
  logged_at?: string | null
  ts?: string | null
  created_at?: string | null
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

/** Prefer `logged_at` (Health Connect daily anchor), then sync `ts`, then `created_at`. */
function rowRecencyMs(row: ActivityLogRowForTotals): number {
  const r = row as Record<string, unknown>
  for (const key of ['logged_at', 'ts', 'created_at'] as const) {
    const v = r[key]
    if (typeof v === 'string' && v.trim()) {
      const ms = Date.parse(v.trim())
      if (Number.isFinite(ms)) return ms
    }
  }
  return 0
}

/** Order for choosing one wearable total when multiple sources wrote the same calendar day. */
const WEARABLE_FAMILY_PRIORITY = ['health_connect', 'apple_health', 'google_fit'] as const

function pickWearableTotalSteps(wearableRows: ActivityLogRowForTotals[]): number {
  if (!wearableRows.length) return 0
  const byFam = new Map<string, ActivityLogRowForTotals[]>()
  for (const r of wearableRows) {
    const fam = wearableAggregatedFamilyId(r.source) ?? '_unknown'
    const arr = byFam.get(fam) ?? []
    arr.push(r)
    byFam.set(fam, arr)
  }
  const pickLatestInGroup = (rows: ActivityLogRowForTotals[]): ActivityLogRowForTotals =>
    rows.reduce((best, cur) => {
      const tb = rowRecencyMs(best)
      const tc = rowRecencyMs(cur)
      if (tc > tb) return cur
      if (tc < tb) return best
      return rowSteps(cur) >= rowSteps(best) ? cur : best
    })

  for (const fam of WEARABLE_FAMILY_PRIORITY) {
    const rows = byFam.get(fam)
    if (!rows?.length) continue
    const s = rowSteps(pickLatestInGroup(rows))
    if (s > 0) return s
  }
  let best = 0
  for (const [fam, rows] of byFam) {
    if ((WEARABLE_FAMILY_PRIORITY as readonly string[]).includes(fam)) continue
    best = Math.max(best, rowSteps(pickLatestInGroup(rows)))
  }
  return best
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
 * Wearable-first daily total: picks one wearable total via {@link pickWearableTotalSteps}
 * (Health Connect preferred over legacy Google Fit; latest sync wins within a family).
 * Otherwise total is the sum of active (non-superseded) manual session steps.
 */
export function computeActivityTotalsBreakdown(
  rows: readonly ActivityLogRowForTotals[],
  opts?: { includeDebugContributingIds?: boolean },
): ActivityTotalsBreakdown {
  const deduped = dedupeRowsById(rows as readonly { id?: unknown }[]) as ActivityLogRowForTotals[]

  const manualRows = deduped.filter((r) => isManualActivityRow(r.source))
  const wearableRows = deduped.filter((r) => !isManualActivityRow(r.source))

  const wearableSteps = pickWearableTotalSteps(wearableRows)

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
