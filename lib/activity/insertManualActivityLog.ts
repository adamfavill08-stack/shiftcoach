import type { SupabaseClient } from '@supabase/supabase-js'

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

  const full: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: Math.round(Math.max(0, steps)),
    ts: syncedAtIso,
    activity_date: activityDate,
    activity_type: activityType,
    start_time: startTimeIso,
    end_time: endTimeIso,
    reason,
    merge_status: 'active',
  }

  if (activeMinutes != null && Number.isFinite(activeMinutes)) {
    full.active_minutes = Math.round(Math.max(0, Math.min(24 * 60, activeMinutes)))
  }
  if (calories != null && Number.isFinite(calories)) {
    full.calories = Math.round(Math.max(0, calories))
  }
  if (distanceMeters != null && Number.isFinite(distanceMeters)) {
    full.distance_m = Math.round(Math.max(0, distanceMeters))
  }

  const attempt = async (payload: Record<string, unknown>) => {
    const { error } = await supabase.from('activity_logs').insert(payload)
    return error ?? null
  }

  let err = await attempt(full)
  if (
    err &&
    (err.code === '42703' ||
      String(err.message ?? '')
        .toLowerCase()
        .includes('column'))
  ) {
    const minimal: Record<string, unknown> = {
      user_id: userId,
      source: 'manual',
      steps: full.steps,
      ts: syncedAtIso,
      activity_date: activityDate,
      merge_status: 'active',
    }
    if (full.active_minutes != null) minimal.active_minutes = full.active_minutes
    err = await attempt(minimal)
  }

  return { error: err }
}
