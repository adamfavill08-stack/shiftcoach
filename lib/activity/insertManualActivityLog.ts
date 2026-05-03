import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import {
  stripActivityLogTimeKeys,
  withActivityLogSyncInstant,
  withBothActivityLogSyncInstants,
} from '@/lib/activity/activityLogSyncInstant'

export type ManualActivityReason = 'wearable_sync_missing' | 'forgot_watch' | 'other'

export type ManualActivityType = 'walk' | 'run' | 'workout' | 'shift' | 'custom'

export type InsertManualActivityLogInput = {
  userId: string
  activityDate: string
  steps: number
  activeMinutes?: number | null
  calories?: number | null
  distanceMeters?: number | null
  activityType: ManualActivityType
  reason: ManualActivityReason
  startTimeIso: string
  endTimeIso: string
  syncedAtIso: string
}

function registerPayload(attempts: Record<string, unknown>[], seen: Set<string>, payload: Record<string, unknown>) {
  const sig = JSON.stringify(payload, Object.keys(payload).sort())
  if (seen.has(sig)) return
  seen.add(sig)
  attempts.push(payload)
}

function registerTimeVariants(attempts: Record<string, unknown>[], seen: Set<string>, core: Record<string, unknown>, iso: string) {
  registerPayload(attempts, seen, withActivityLogSyncInstant(core, iso, 'ts'))
  registerPayload(attempts, seen, withActivityLogSyncInstant(core, iso, 'created_at'))
  registerPayload(attempts, seen, withBothActivityLogSyncInstants(core, iso))
}

function omitActivityDate(core: Record<string, unknown>): Record<string, unknown> {
  const o = { ...core }
  delete o.activity_date
  return o
}

/**
 * Inserts a dedicated manual session row (never upserts into wearable daily totals).
 * Tries every compatible payload shape (ts / created_at / both / none) so we do not bail
 * early on errors that are not "missing column" but still recoverable with a slimmer row.
 */
export async function insertManualActivityLog(
  supabase: SupabaseClient,
  input: InsertManualActivityLogInput,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const {
    userId,
    activityDate,
    steps,
    activeMinutes,
    calories,
    distanceMeters,
    activityType,
    reason,
    startTimeIso,
    endTimeIso,
    syncedAtIso,
  } = input

  const stepVal = Math.round(Math.max(0, steps))

  const metaBlock: Record<string, unknown> = {
    activity_type: activityType,
    start_time: startTimeIso,
    end_time: endTimeIso,
    reason,
    merge_status: 'active',
  }

  const rich: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
    ...metaBlock,
  }

  if (activeMinutes != null && Number.isFinite(activeMinutes)) {
    rich.active_minutes = Math.round(Math.max(0, Math.min(24 * 60, activeMinutes)))
  }
  if (calories != null && Number.isFinite(calories)) {
    rich.calories = Math.round(Math.max(0, calories))
  }
  if (distanceMeters != null && Number.isFinite(distanceMeters)) {
    rich.distance_m = Math.round(Math.max(0, distanceMeters))
  }

  const withoutAm: Record<string, unknown> = { ...rich }
  delete withoutAm.active_minutes

  const withoutMetrics: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
    ...metaBlock,
  }

  const bare: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
  }

  const bareNoMerge: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
    activity_type: activityType,
    start_time: startTimeIso,
    end_time: endTimeIso,
    reason,
  }

  /** Legacy DBs with no activity_date column */
  const legacyNoDate: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    ...metaBlock,
  }

  const attempts: Record<string, unknown>[] = []
  const seen = new Set<string>()

  for (const core of [rich, withoutAm, withoutMetrics, bare]) {
    registerTimeVariants(attempts, seen, core, syncedAtIso)
  }

  registerPayload(attempts, seen, stripActivityLogTimeKeys(bare))
  registerTimeVariants(attempts, seen, bareNoMerge, syncedAtIso)
  registerPayload(attempts, seen, stripActivityLogTimeKeys(bareNoMerge))

  registerTimeVariants(attempts, seen, legacyNoDate, syncedAtIso)
  registerPayload(attempts, seen, stripActivityLogTimeKeys(legacyNoDate))

  let lastErr: PostgrestError | null = null

  const runInserts = async (list: Record<string, unknown>[]): Promise<{ error: PostgrestError | null }> => {
    for (const payload of list) {
      const { error } = await supabase.from('activity_logs').insert(payload)
      if (!error) return { error: null }
      lastErr = error
    }
    return { error: lastErr }
  }

  const first = await runInserts(attempts)
  if (!first.error) return { error: null }

  // Legacy idx_activity_logs_user_activity_date_unique (all sources): wearable row for this
  // civil day blocks a second row with the same activity_date. Omit activity_date so the row
  // still lands in the ts/created_at window for /api/activity/today until migrations catch up.
  if (first.error.code === '23505') {
    const retry: Record<string, unknown>[] = []
    const seen2 = new Set<string>()
    for (const core of [rich, withoutAm, withoutMetrics, bare, bareNoMerge, legacyNoDate].map(omitActivityDate)) {
      registerTimeVariants(retry, seen2, core, syncedAtIso)
      registerPayload(retry, seen2, stripActivityLogTimeKeys(core))
    }
    const second = await runInserts(retry)
    if (!second.error) return { error: null }
  }

  return { error: lastErr }
}
