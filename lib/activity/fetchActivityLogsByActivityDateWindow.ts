import type { SupabaseClient } from '@supabase/supabase-js'
import { isPostgrestSchemaColumnError } from '@/lib/activity/isPostgrestSchemaColumnError'

/**
 * Loads activity_logs in a civil activity_date range (manual sessions, wearable daily rows).
 * Used to merge into ts-window queries so rows with NULL `ts` still appear in charts and intelligence.
 */
export async function fetchActivityLogsByActivityDateWindow(
  supabase: SupabaseClient,
  userId: string,
  fromYmd: string,
  toYmd: string,
): Promise<Record<string, unknown>[]> {
  const selects = [
    'id, steps, active_minutes, source, merge_status, ts, created_at, shift_activity_level, activity_date',
    'id, steps, source, merge_status, ts, created_at, shift_activity_level, activity_date',
    'id, steps, source, merge_status, ts, created_at, activity_date',
    'steps, source, merge_status, ts, created_at, activity_date',
  ]

  for (const sel of selects) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(sel)
      .eq('user_id', userId)
      .gte('activity_date', fromYmd)
      .lte('activity_date', toYmd)

    if (!error && Array.isArray(data)) return data as unknown as Record<string, unknown>[]
    if (error && !isPostgrestSchemaColumnError(error)) return []
  }
  return []
}
