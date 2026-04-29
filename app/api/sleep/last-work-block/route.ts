import { NextRequest, NextResponse } from 'next/server'
import { applyHolidayAsOffToShiftRows, fetchHolidayLocalDatesSet } from '@/lib/rota/holidayRotaPriority'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  addCalendarDaysToYmd,
  rowCountsAsPrimarySleep,
  startOfLocalDayUtcMs,
} from '@/lib/sleep/utils'

export type WorkBlockStatus = 'well_recovered' | 'slight_debt' | 'high_debt'

export type LastWorkBlockPayload = {
  totalSleepMinutes: number
  dayCount: number
  status: WorkBlockStatus
  blockStartDate: string
  blockEndDate: string
  expectedSleepMinutes: number
  whoAgeYears: number | null
  whoRecommendedDailyHoursMin: number
  whoRecommendedDailyHoursMax: number
  whoRecommendedDailyHoursMid: number
  sleepDebtMinutes: number
  sleepAheadMinutes: number
}

const DAYS_TO_FETCH = 60

type ShiftRow = {
  date: string
  label: string | null
  start_ts: string | null
  end_ts: string | null
}

/** Normalised labels that mean “not a work shift” (rota / shifts table). */
const REST_LABELS_EXACT = new Set(
  [
    'off',
    'rest',
    'holiday',
    'holidays',
    'al',
    'annual leave',
    'annual',
    'vacation',
    'pto',
    'sick',
    'sick leave',
    'leave',
    'day off',
    'dayoff',
    'furlough',
    'absent',
    'comp',
    'mat leave',
    'paternity',
    'maternity',
    'study leave',
    'unpaid leave',
    'training',
  ].map((s) => s.toLowerCase()),
)

function isWorked(label: string | null | undefined): boolean {
  if (label == null) return false
  const raw = String(label).trim()
  if (raw === '') return false
  const lower = raw.toLowerCase()
  if (REST_LABELS_EXACT.has(lower)) return false
  if (lower === 'rest' || /^rest\b/i.test(raw)) return false
  if (/\b(annual leave|sick leave|maternity|paternity|unpaid leave|study leave|public holiday)\b/i.test(raw)) return false
  if (/\b(holiday|vacation|time off|furlough|pto)\b/i.test(raw)) return false
  if (/^\s*off\b/i.test(raw) && raw.length < 24) return false
  return true
}

/**
 * A night shift dated "2nd" may have end_ts on the "3rd".
 * Return the calendar date (YYYY-MM-DD, UTC) that the shift actually finishes on
 * so block boundaries and the in-progress check are correct.
 */
function effectiveEndDate(shift: { date: string; end_ts: string | null }): string {
  if (!shift.end_ts) return shift.date
  const endUtcDate = new Date(shift.end_ts).toISOString().slice(0, 10)
  return endUtcDate > shift.date ? endUtcDate : shift.date
}

/** Force every rota/calendar holiday date into the timeline as OFF (covers gaps + overwrites wrong work labels). */
function mergeHolidayDatesIntoShiftRows(
  rows: ShiftRow[],
  holidayDates: Set<string>,
  fromYmd: string,
  todayYmd: string,
): ShiftRow[] {
  const byDate = new Map<string, ShiftRow>()
  for (const r of rows) {
    byDate.set(r.date, { ...r })
  }
  for (const ymd of holidayDates) {
    if (ymd >= fromYmd && ymd <= todayYmd) {
      byDate.set(ymd, { date: ymd, label: 'OFF', start_ts: null, end_ts: null })
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** Expand holiday set using shift rows whose label already says leave (no rota_events row needed). */
function augmentHolidayDatesFromShiftLabels(
  rows: ShiftRow[],
  holidayDates: Set<string>,
  fromYmd: string,
  todayYmd: string,
): Set<string> {
  const out = new Set(holidayDates)
  for (const r of rows) {
    if (r.date < fromYmd || r.date > todayYmd) continue
    if (!isWorked(r.label)) out.add(r.date)
  }
  return out
}

function ymdToUtcDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`)
}

function daysBetween(a: string, b: string): number {
  return Math.round((ymdToUtcDate(b).getTime() - ymdToUtcDate(a).getTime()) / 86400000)
}

type ShiftBlockEntry = { date: string; end_ts: string | null }

function detectLastCompletedWorkBlock(
  shifts: ShiftRow[],
  todayYmd: string,
): { blockDates: string[] } | null {
  if (!shifts.length) return null

  const blocks: ShiftBlockEntry[][] = []
  let current: ShiftBlockEntry[] = []

  for (let i = 0; i < shifts.length; i++) {
    const { date, label, end_ts } = shifts[i]

    if (isWorked(label)) {
      current.push({ date, end_ts })
    } else {
      if (current.length > 0) {
        blocks.push(current)
        current = []
      }
    }

    if (i < shifts.length - 1) {
      const nextDate = shifts[i + 1].date
      const diffDays = daysBetween(date, nextDate)
      if (diffDays > 1 && current.length > 0) {
        blocks.push(current)
        current = []
      }
    }
  }
  if (current.length > 0) blocks.push(current)
  if (!blocks.length) return null

  const lastBlock = blocks[blocks.length - 1]
  const lastBlockLastShift = lastBlock[lastBlock.length - 1]
  const lastBlockEffectiveEnd = effectiveEndDate(lastBlockLastShift)

  if (lastBlockEffectiveEnd >= todayYmd) {
    if (blocks.length < 2) return null
    return { blockDates: blocks[blocks.length - 2].map((s) => s.date) }
  }

  return { blockDates: lastBlock.map((s) => s.date) }
}

function deriveStatus(totalSleepMinutes: number, expectedSleepMinutes: number): WorkBlockStatus {
  if (expectedSleepMinutes <= 0) return 'well_recovered'
  const ratio = totalSleepMinutes / expectedSleepMinutes
  if (ratio >= 0.9) return 'well_recovered'
  if (ratio >= 0.75) return 'slight_debt'
  return 'high_debt'
}

function getWhoRecommendedDailySleepHours(age: number | null | undefined): {
  minHours: number
  maxHours: number
  midHours: number
} {
  // WHO guidance bands (commonly cited ranges by age group).
  // We use the midpoint as the numeric target for deficit/ahead calculations.
  if (!Number.isFinite(age as number)) {
    return { minHours: 7, maxHours: 9, midHours: 8 }
  }
  const a = Number(age)
  if (a <= 2) return { minHours: 11, maxHours: 14, midHours: 12.5 }
  if (a <= 5) return { minHours: 10, maxHours: 13, midHours: 11.5 }
  if (a <= 13) return { minHours: 9, maxHours: 11, midHours: 10 }
  if (a <= 17) return { minHours: 8, maxHours: 10, midHours: 9 }
  if (a <= 64) return { minHours: 7, maxHours: 9, midHours: 8 }
  return { minHours: 7, maxHours: 8, midHours: 7.5 }
}

/** Intersection of [startMs, endMs) with [winStart, winEndExclusive). */
function clipInterval(
  startMs: number,
  endMs: number,
  winStart: number,
  winEndExclusive: number,
): { start: number; end: number } | null {
  const lo = Math.max(startMs, winStart)
  const hi = Math.min(endMs, winEndExclusive)
  if (hi <= lo) return null
  return { start: lo, end: hi }
}

/** Union length in minutes (avoids double-counting overlapping primary-sleep logs). */
function mergedOverlapMinutes(intervals: Array<{ start: number; end: number }>): number {
  if (!intervals.length) return 0
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  let total = 0
  let cur = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (next.start <= cur.end) {
      cur = { start: cur.start, end: Math.max(cur.end, next.end) }
    } else {
      total += Math.round((cur.end - cur.start) / 60000)
      cur = next
    }
  }
  total += Math.round((cur.end - cur.start) / 60000)
  return total
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
  const supabase = isDevFallback ? supabaseServer : authSupabase
  if (!userId) return buildUnauthorizedResponse()

  const tz = req.nextUrl.searchParams.get('tz') ?? 'UTC'

  const todayYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const blockEndDate = todayYmd
  const blockStartDate = addCalendarDaysToYmd(blockEndDate, -6)
  const dayCount = 7

  // Align window with the user's calendar (same `tz` as requested `tz`) so we don't pull in
  // sleep from outside the last-7-local-days range.
  const winStartMs = startOfLocalDayUtcMs(blockStartDate, tz)
  // Exclusive upper bound: start of the day after the last day in the window.
  const winEndExclusiveMs = startOfLocalDayUtcMs(addCalendarDaysToYmd(blockEndDate, 1), tz)
  const windowStartIso = new Date(winStartMs).toISOString()
  const windowEndIso = new Date(winEndExclusiveMs).toISOString()

  // Get user age so we can apply WHO age bands.
  const { data: profile } = await supabase
    .from('profiles')
    .select('date_of_birth, age')
    .eq('user_id', userId)
    .maybeSingle()

  // Use the age already stored on the user's profile (WHO bands should not re-derive age here).
  // If age is missing, we fall back to the adult range in getWhoRecommendedDailySleepHours().
  const userAge: number | null = profile?.age ?? null

  const whoRange = getWhoRecommendedDailySleepHours(userAge)
  const expectedSleepMinutes = Math.round(whoRange.midHours * dayCount * 60)

  const { data: sleepLogs, error: sleepError } = await supabase
    .from('sleep_logs')
    .select('start_at, end_at, type, naps')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('end_at', windowStartIso)
    .lt('start_at', windowEndIso)
    .order('start_at', { ascending: true })

  if (sleepError) {
    console.error('[api/sleep/last-work-block] sleep_logs error:', sleepError)
    return NextResponse.json({ error: 'Failed to load sleep' }, { status: 500 })
  }

  const clipped: Array<{ start: number; end: number }> = []
  for (const log of sleepLogs ?? []) {
    if (!rowCountsAsPrimarySleep(log)) continue
    const startRaw = log.start_at
    const endRaw = log.end_at
    if (!startRaw || !endRaw) continue
    const start = Date.parse(String(startRaw))
    const end = Date.parse(String(endRaw))
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue
    const seg = clipInterval(start, end, winStartMs, winEndExclusiveMs)
    if (seg) clipped.push(seg)
  }

  const totalSleepMinutes = mergedOverlapMinutes(clipped)

  const status = deriveStatus(totalSleepMinutes, expectedSleepMinutes)

  const sleepDebtMinutes = Math.max(0, expectedSleepMinutes - totalSleepMinutes)
  const sleepAheadMinutes = Math.max(0, totalSleepMinutes - expectedSleepMinutes)

  const payload: LastWorkBlockPayload = {
    totalSleepMinutes,
    dayCount,
    status,
    blockStartDate,
    blockEndDate,
    expectedSleepMinutes,
    whoAgeYears: userAge,
    whoRecommendedDailyHoursMin: whoRange.minHours,
    whoRecommendedDailyHoursMax: whoRange.maxHours,
    whoRecommendedDailyHoursMid: whoRange.midHours,
    sleepDebtMinutes,
    sleepAheadMinutes,
  }

  return NextResponse.json({ block: payload })
}
