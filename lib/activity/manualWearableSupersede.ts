import type { SupabaseClient } from '@supabase/supabase-js'
import { wearableDeltaSupersedesManual } from '@/lib/activity/activityLogStepSum'

const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * When wearable daily data exists for a civil day, all manual session rows for that
 * `activity_date` are treated as backup-only and marked superseded (wearable is source of truth).
 */
export async function markAllManualSessionsSupersededForWearableDay(
  supabase: SupabaseClient,
  userId: string,
  activityDate: string,
  wearableSource: string,
): Promise<void> {
  if (!activityDate || !YMD.test(activityDate)) return
  const nowIso = new Date().toISOString()
  const src = wearableSource.trim().slice(0, 120) || 'wearable'
  const { error } = await supabase
    .from('activity_logs')
    .update({
      merge_status: 'superseded_by_wearable',
      superseded_by_source: src,
      superseded_at: nowIso,
    })
    .eq('user_id', userId)
    .eq('activity_date', activityDate)
    .in('source', ['manual', 'Manual entry'])
    .or('merge_status.is.null,merge_status.eq.active')

  if (error) {
    console.warn('[markAllManualSessionsSupersededForWearableDay]', error.message ?? error)
  }
}

/** Previous stored daily total for this wearable source + civil day (excludes manual rows). */
export async function fetchWearableDailyStepsForSource(
  supabase: SupabaseClient,
  userId: string,
  activityDate: string,
  wearableSource: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('steps')
    .eq('user_id', userId)
    .eq('activity_date', activityDate)
    .eq('source', wearableSource)
    .maybeSingle()
  if (error || !data) return null
  return typeof data.steps === 'number' && Number.isFinite(data.steps) ? data.steps : null
}

/**
 * When wearable daily total for a civil day increases, mark manual logs superseded if the
 * increase plausibly "covers" them (daily-total heuristic — no hourly overlap data required).
 */
export async function supersedeManualLogsAfterWearableDelta(
  supabase: SupabaseClient,
  userId: string,
  activityDate: string,
  deltaSteps: number,
  wearableSource: string,
): Promise<void> {
  if (!activityDate || deltaSteps <= 0) return

  const { data: manuals, error } = await supabase
    .from('activity_logs')
    .select('id, steps, merge_status')
    .eq('user_id', userId)
    .eq('activity_date', activityDate)
    .in('source', ['manual', 'Manual entry'])

  if (error || !manuals?.length) return

  const nowIso = new Date().toISOString()
  for (const row of manuals) {
    if (row.merge_status === 'superseded_by_wearable') continue
    if (row.merge_status != null && row.merge_status !== 'active') continue
    const m = typeof row.steps === 'number' && Number.isFinite(row.steps) ? Math.max(0, Math.round(row.steps)) : 0
    if (m <= 0) continue
    if (wearableDeltaSupersedesManual(deltaSteps, m)) {
      await supabase
        .from('activity_logs')
        .update({
          merge_status: 'superseded_by_wearable',
          superseded_by_source: wearableSource.slice(0, 120),
          superseded_at: nowIso,
        })
        .eq('id', row.id)
    }
  }
}
