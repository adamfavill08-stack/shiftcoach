/**
 * Rota holiday events override underlying shift rows for the same calendar date
 * (user is not at work on holiday even if a shift is still stored).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { addCalendarDaysToYmd, formatYmdInTimeZone } from '@/lib/sleep/utils'

export type ShiftRowWithDate = {
  date: string
  label?: string | null
  start_ts?: string | null
  end_ts?: string | null
}

/**
 * Calendar event_types.type category for “holiday” leave.
 * Model uses HOLIDAY_EVENT = 3; EventTypesManager UI uses 4 for the Holiday option.
 */
const HOLIDAY_EVENT_TYPE_CATEGORIES = [3, 4] as const

function addYmdRangeForInstantRange(
  out: Set<string>,
  startMs: number,
  endMs: number,
  timeZone: string,
  clampFrom: string,
  clampTo: string,
) {
  let ymd = formatYmdInTimeZone(new Date(startMs), timeZone)
  const endYmd = formatYmdInTimeZone(new Date(endMs), timeZone)
  let guard = 0
  while (guard++ < 400) {
    if (ymd >= clampFrom && ymd <= clampTo) out.add(ymd)
    if (ymd >= endYmd) break
    ymd = addCalendarDaysToYmd(ymd, 1)
  }
}

function addYmdFromRotaRow(
  row: Record<string, unknown>,
  out: Set<string>,
  timeZone: string,
  clampFrom: string,
  clampTo: string,
) {
  const raw = row.date ?? row.event_date
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const ymd = raw.slice(0, 10)
    if (ymd >= clampFrom && ymd <= clampTo) out.add(ymd)
    return
  }
  const sa = row.start_at
  const ea = row.end_at
  if (typeof sa === 'string' && typeof ea === 'string') {
    const startMs = Date.parse(sa)
    const endMs = Date.parse(ea)
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      addYmdRangeForInstantRange(out, startMs, endMs, timeZone, clampFrom, clampTo)
    }
  } else if (typeof sa === 'string') {
    const ymd = String(sa).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd) && ymd >= clampFrom && ymd <= clampTo) out.add(ymd)
  }
}

/** Rota row counts as “not at work” leave/holiday for the calendar day(s) it covers. */
function isHolidayLikeRotaRow(row: Record<string, unknown>): boolean {
  const ty = row.type
  if (ty === 'holiday') return true
  if (typeof ty === 'string' && ty.toLowerCase() === 'holiday') return true
  const title = String(row.title ?? '')
    .trim()
    .toLowerCase()
  if (!title) return false
  if (title === 'holiday') return true
  return (
    /\bannual leave\b/.test(title) ||
    /\btime off\b/.test(title) ||
    /\bpto\b/.test(title) ||
    /\bvacation\b/.test(title) ||
    /\bsick leave\b/.test(title) ||
    /\bpublic holiday\b/.test(title)
  )
}

/**
 * Local calendar dates (YYYY-MM-DD, same as shifts.date) where the user is on leave/holiday.
 * Sources: rota_events (type holiday, legacy inserts without type, title heuristics), and
 * calendar `events` rows whose event_types.category is HOLIDAY_EVENT (type = 3).
 */
export async function fetchHolidayLocalDatesSet(
  supabase: SupabaseClient,
  userId: string,
  fromYmd: string,
  toYmd: string,
  timeZone = 'UTC',
): Promise<Set<string>> {
  const out = new Set<string>()
  try {
    // 1) Explicit rota holidays in date range
    const { data: typedByDate, error: e1 } = await supabase
      .from('rota_events')
      .select('date, event_date, type, start_at, end_at, title')
      .eq('user_id', userId)
      .eq('type', 'holiday')
      .gte('date', fromYmd)
      .lte('date', toYmd)

    if (!e1 && Array.isArray(typedByDate)) {
      for (const row of typedByDate as Record<string, unknown>[]) {
        addYmdFromRotaRow(row, out, timeZone, fromYmd, toYmd)
      }
    }

    const { data: typedByStart, error: e2 } = await supabase
      .from('rota_events')
      .select('date, event_date, type, start_at, end_at, title')
      .eq('user_id', userId)
      .eq('type', 'holiday')
      .gte('start_at', `${fromYmd}T00:00:00.000Z`)
      .lte('start_at', `${toYmd}T23:59:59.999Z`)

    if (!e2 && Array.isArray(typedByStart)) {
      for (const row of typedByStart as Record<string, unknown>[]) {
        addYmdFromRotaRow(row, out, timeZone, fromYmd, toYmd)
      }
    }

    // 2) Legacy / mis-tagged rota rows (no type column on insert, or leave titled without type)
    const { data: anyByDate, error: e3 } = await supabase
      .from('rota_events')
      .select('date, event_date, type, start_at, end_at, title')
      .eq('user_id', userId)
      .gte('date', fromYmd)
      .lte('date', toYmd)

    if (!e3 && Array.isArray(anyByDate)) {
      for (const row of anyByDate as Record<string, unknown>[]) {
        if (!isHolidayLikeRotaRow(row)) continue
        addYmdFromRotaRow(row, out, timeZone, fromYmd, toYmd)
      }
    }

    const { data: anyByStart, error: e4 } = await supabase
      .from('rota_events')
      .select('date, event_date, type, start_at, end_at, title')
      .eq('user_id', userId)
      .gte('start_at', `${fromYmd}T00:00:00.000Z`)
      .lte('start_at', `${toYmd}T23:59:59.999Z`)

    if (!e4 && Array.isArray(anyByStart)) {
      for (const row of anyByStart as Record<string, unknown>[]) {
        if (!isHolidayLikeRotaRow(row)) continue
        addYmdFromRotaRow(row, out, timeZone, fromYmd, toYmd)
      }
    }

    // 3) Main calendar: event_types whose category is Holiday (see HOLIDAY_EVENT_TYPE_CATEGORIES)
    const { data: holidayTypeRows } = await supabase
      .from('event_types')
      .select('id')
      .in('type', [...HOLIDAY_EVENT_TYPE_CATEGORIES])

    const holidayTypeIds = (holidayTypeRows ?? [])
      .map((r: { id?: number | null }) => r.id)
      .filter((id): id is number => typeof id === 'number' && id > 0)

    if (holidayTypeIds.length > 0) {
      const fromSec = Math.floor(new Date(`${fromYmd}T00:00:00`).getTime() / 1000)
      const toSec = Math.floor(new Date(`${toYmd}T23:59:59.999`).getTime() / 1000)

      const { data: calEvents, error: e5 } = await supabase
        .from('events')
        .select('start_ts, end_ts, type')
        .eq('user_id', userId)
        .eq('type', 0)
        .in('event_type', holidayTypeIds)
        .lte('start_ts', toSec)
        .gte('end_ts', fromSec)

      if (!e5 && Array.isArray(calEvents)) {
        for (const ev of calEvents as { start_ts?: number; end_ts?: number }[]) {
          const s = Number(ev.start_ts) * 1000
          const e = Number(ev.end_ts) * 1000
          if (Number.isFinite(s) && Number.isFinite(e) && e >= s) {
            addYmdRangeForInstantRange(out, s, e, timeZone, fromYmd, toYmd)
          }
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
