import type { SupabaseClient } from '@supabase/supabase-js'
import { isPostgrestSchemaColumnError } from '@/lib/activity/isPostgrestSchemaColumnError'
import { addCalendarDaysToYmd, formatYmdInTimeZone, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

function dedupeActivityLogRowsById(rows: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  const m = new Map<string, Record<string, unknown>>()
  for (const r of rows) {
    const id = r.id
    if (id == null) continue
    m.set(String(id), r)
  }
  return [...m.values()]
}

/**
 * Loads activity_logs in a civil activity_date range (manual sessions, wearable daily rows).
 * Used to merge into ts-window queries so rows with NULL `ts` still appear in charts and intelligence.
 *
 * When `opts.timeZone` is set, also merges `source=manual` rows with NULL `activity_date` whose
 * `ts` or `created_at` falls on a civil calendar day within [fromYmd, toYmd] in that zone (legacy
 * unique-index insert path omits activity_date).
 */
export async function fetchActivityLogsByActivityDateWindow(
  supabase: SupabaseClient,
  userId: string,
  fromYmd: string,
  toYmd: string,
  opts?: { timeZone?: string },
): Promise<Record<string, unknown>[]> {
  const selects = [
    'id, steps, active_minutes, source, merge_status, ts, created_at, shift_activity_level, activity_date',
    'id, steps, source, merge_status, ts, created_at, shift_activity_level, activity_date',
    'id, steps, source, merge_status, ts, created_at, activity_date',
    'steps, source, merge_status, ts, created_at, activity_date',
  ]

  let primary: Record<string, unknown>[] = []

  for (const sel of selects) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(sel)
      .eq('user_id', userId)
      .gte('activity_date', fromYmd)
      .lte('activity_date', toYmd)

    if (!error && Array.isArray(data)) {
      primary = data as unknown as Record<string, unknown>[]
      break
    }
    if (error && !isPostgrestSchemaColumnError(error)) return []
  }

  const tz = opts?.timeZone?.trim()
  if (!tz) return primary

  let padFromMs = startOfLocalDayUtcMs(addCalendarDaysToYmd(fromYmd, -2), tz)
  let padToMs = startOfLocalDayUtcMs(addCalendarDaysToYmd(toYmd, 3), tz)
  if (!Number.isFinite(padFromMs) || !Number.isFinite(padToMs)) return primary
  const isoFrom = new Date(padFromMs).toISOString()
  const isoTo = new Date(padToMs).toISOString()

  const orphans: Record<string, unknown>[] = []

  for (const sel of selects) {
    const byCreated = await supabase
      .from('activity_logs')
      .select(sel)
      .eq('user_id', userId)
      .in('source', ['manual', 'Manual entry'])
      .is('activity_date', null)
      .gte('created_at', isoFrom)
      .lt('created_at', isoTo)

    if (!byCreated.error && Array.isArray(byCreated.data)) {
      orphans.push(...(byCreated.data as unknown as Record<string, unknown>[]))
      break
    }
    if (byCreated.error && !isPostgrestSchemaColumnError(byCreated.error)) break
  }

  for (const sel of selects) {
    const byTs = await supabase
      .from('activity_logs')
      .select(sel)
      .eq('user_id', userId)
      .in('source', ['manual', 'Manual entry'])
      .is('activity_date', null)
      .gte('ts', isoFrom)
      .lt('ts', isoTo)

    if (!byTs.error && Array.isArray(byTs.data)) {
      orphans.push(...(byTs.data as unknown as Record<string, unknown>[]))
      break
    }
    if (byTs.error && !isPostgrestSchemaColumnError(byTs.error)) break
  }

  const inWindow = (row: Record<string, unknown>): boolean => {
    const t = row.ts ?? row.created_at
    if (typeof t !== 'string' || !t.trim()) return false
    const d = new Date(t)
    if (Number.isNaN(d.getTime())) return false
    const ymd = formatYmdInTimeZone(d, tz)
    return ymd >= fromYmd && ymd <= toYmd
  }

  const filteredOrphans = orphans.filter(inWindow)
  return dedupeActivityLogRowsById([...primary, ...filteredOrphans])
}
