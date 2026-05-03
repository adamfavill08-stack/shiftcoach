import type { ActivityTotalsBreakdown } from '@/lib/activity/activityLogStepSum'

/** Shape returned by GET /api/activity/manual for manual session history. */
export type ManualHistoryEntry = {
  id: string
  activity_type: string | null
  steps: number
  active_minutes: number | null
  calories: number | null
  distance_m: number | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  merge_status: string | null
  superseded_by_source: string | null
  superseded_at: string | null
}

export type ManualHistoryResponse = {
  date: string
  entries: ManualHistoryEntry[]
  activityTotalsBreakdown?: ActivityTotalsBreakdown
}

function coerceSteps(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw))
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.max(0, Math.round(n))
  }
  return 0
}

export function parseManualHistoryResponse(json: unknown): ManualHistoryResponse | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  const dateRaw = o.date
  const date = typeof dateRaw === 'string' ? dateRaw.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const rawEntries = o.entries
  const list = Array.isArray(rawEntries) ? rawEntries : []
  const entries: ManualHistoryEntry[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Record<string, unknown>
    const id = e.id != null ? String(e.id) : ''
    if (!id) continue
    const steps = coerceSteps(e.steps)
    entries.push({
      id,
      activity_type: typeof e.activity_type === 'string' ? e.activity_type : null,
      steps,
      active_minutes:
        typeof e.active_minutes === 'number' && Number.isFinite(e.active_minutes)
          ? Math.round(e.active_minutes)
          : null,
      calories:
        typeof e.calories === 'number' && Number.isFinite(e.calories) ? Math.round(e.calories) : null,
      distance_m:
        typeof e.distance_m === 'number' && Number.isFinite(e.distance_m) ? Math.round(e.distance_m) : null,
      start_time: typeof e.start_time === 'string' ? e.start_time : null,
      end_time: typeof e.end_time === 'string' ? e.end_time : null,
      reason: typeof e.reason === 'string' ? e.reason : null,
      merge_status: typeof e.merge_status === 'string' ? e.merge_status : null,
      superseded_by_source: typeof e.superseded_by_source === 'string' ? e.superseded_by_source : null,
      superseded_at: typeof e.superseded_at === 'string' ? e.superseded_at : null,
    })
  }
  const breakdownRaw = o.activityTotalsBreakdown
  let activityTotalsBreakdown: ActivityTotalsBreakdown | undefined
  if (breakdownRaw && typeof breakdownRaw === 'object') {
    const b = breakdownRaw as Record<string, unknown>
    const src = b.sourceOfTruth
    const sourceOfTruth =
      src === 'wearable' || src === 'manual' || src === 'none' ? src : ('none' as const)
    activityTotalsBreakdown = {
      totalSteps: coerceSteps(b.totalSteps),
      wearableSteps: coerceSteps(b.wearableSteps),
      manualStepsCounted: coerceSteps(b.manualStepsCounted),
      manualStepsNotCounted: coerceSteps(b.manualStepsNotCounted),
      manualStepsSuperseded: coerceSteps(b.manualStepsSuperseded),
      sourceOfTruth,
    }
  }

  return { date, entries, ...(activityTotalsBreakdown ? { activityTotalsBreakdown } : {}) }
}
