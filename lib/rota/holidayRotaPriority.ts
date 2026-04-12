/**
 * Rota holiday events override underlying shift rows for the same calendar date
 * (user is not at work on holiday even if a shift is still stored).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type ShiftRowWithDate = {
  date: string
  label?: string | null
  start_ts?: string | null
  end_ts?: string | null
}

/**
 * Local calendar dates (YYYY-MM-DD, same as shifts.date) that have a rota holiday.
 */
export async function fetchHolidayLocalDatesSet(
  supabase: SupabaseClient,
  userId: string,
  fromYmd: string,
  toYmd: string,
): Promise<Set<string>> {
  const out = new Set<string>()
  try {
    const { data, error } = await supabase
      .from('rota_events')
      .select('date, event_date, type, start_at')
      .eq('user_id', userId)
      .eq('type', 'holiday')
      .gte('date', fromYmd)
      .lte('date', toYmd)

    if (!error && Array.isArray(data)) {
      for (const row of data as Record<string, unknown>[]) {
        const raw = row.date ?? row.event_date
        if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
          const ymd = raw.slice(0, 10)
          if (ymd >= fromYmd && ymd <= toYmd) out.add(ymd)
        }
      }
    }

    if (out.size > 0) return out

    const { data: data2, error: err2 } = await supabase
      .from('rota_events')
      .select('date, event_date, type, start_at')
      .eq('user_id', userId)
      .eq('type', 'holiday')
      .gte('start_at', `${fromYmd}T00:00:00.000Z`)
      .lte('start_at', `${toYmd}T23:59:59.999Z`)

    if (!err2 && Array.isArray(data2)) {
      for (const row of data2 as Record<string, unknown>[]) {
        const raw = row.date ?? row.event_date
        if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
          const ymd = raw.slice(0, 10)
          if (ymd >= fromYmd && ymd <= toYmd) out.add(ymd)
        } else if (row.start_at) {
          const ymd = String(row.start_at).slice(0, 10)
          if (ymd >= fromYmd && ymd <= toYmd) out.add(ymd)
        }
      }
    }
  } catch {
    /* non-fatal */
  }
  return out
}

export function applyHolidayAsOffToShiftRows<T extends ShiftRowWithDate>(
  shifts: T[],
  holidayDates: Set<string>,
): T[] {
  if (!holidayDates.size) return shifts
  return shifts.map((s) =>
    holidayDates.has(s.date) ? { ...s, label: 'OFF', start_ts: null, end_ts: null } : s,
  )
}
