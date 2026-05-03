import type { SupabaseClient } from '@supabase/supabase-js'
import { isPostgrestSchemaColumnError } from '@/lib/activity/isPostgrestSchemaColumnError'
import { withActivityLogSyncInstant } from '@/lib/activity/activityLogSyncInstant'

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

/**
 * Inserts a dedicated manual session row (never upserts into wearable daily totals).
 * Some databases use `ts` for sync time, others only `created_at` — we try both like `upsertActivityLogDailySteps`.
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

  const cores = [rich, withoutAm, withoutMetrics, bare]

  const attempt = async (payload: Record<string, unknown>) => {
    const { error } = await supabase.from('activity_logs').insert(payload)
    return error ?? null
  }

  let lastErr: { message?: string; code?: string } | null = null

  for (const core of cores) {
    for (const timeCol of ['ts', 'created_at'] as const) {
      const payload = withActivityLogSyncInstant(core, syncedAtIso, timeCol)
      const err = await attempt(payload)
      if (!err) return { error: null }
      if (!isPostgrestSchemaColumnError(err)) return { error: err }
      lastErr = err
    }
  }

  const errNoTime = await attempt(bare)
  if (!errNoTime) return { error: null }
  if (!isPostgrestSchemaColumnError(errNoTime)) return { error: errNoTime }

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
  for (const timeCol of ['ts', 'created_at'] as const) {
    const err = await attempt(withActivityLogSyncInstant(bareNoMerge, syncedAtIso, timeCol))
    if (!err) return { error: null }
    if (!isPostgrestSchemaColumnError(err)) return { error: err }
    lastErr = err
  }

  return { error: lastErr }
}
