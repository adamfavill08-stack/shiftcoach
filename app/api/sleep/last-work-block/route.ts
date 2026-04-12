import { NextRequest, NextResponse } from 'next/server'
import { applyHolidayAsOffToShiftRows, fetchHolidayLocalDatesSet } from '@/lib/rota/holidayRotaPriority'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export type WorkBlockStatus = 'well_recovered' | 'slight_debt' | 'high_debt'

export type LastWorkBlockPayload = {
  totalSleepMinutes: number
  shiftCount: number
  status: WorkBlockStatus
  blockStartDate: string
  blockEndDate: string
  expectedSleepMinutes: number
}

const EXPECTED_SLEEP_PER_SHIFT_MINUTES = 6.5 * 60
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

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - DAYS_TO_FETCH)
  const fromYmd = fromDate.toISOString().slice(0, 10)

  const { data: shiftRowsRaw, error: shiftsError } = await supabase
    .from('shifts')
    .select('date, label, start_ts, end_ts')
    .eq('user_id', userId)
    .gte('date', fromYmd)
    .lte('date', todayYmd)
    .order('date', { ascending: true })

  if (shiftsError) {
    console.error('[api/sleep/last-work-block] shifts error:', shiftsError)
    return NextResponse.json({ error: 'Failed to load shifts' }, { status: 500 })
  }

  if (!shiftRowsRaw || shiftRowsRaw.length === 0) {
    return NextResponse.json({ block: null })
  }

  const shiftRows: ShiftRow[] = shiftRowsRaw.map((r) => ({
    date: r.date,
    label: r.label ?? null,
    start_ts: r.start_ts ?? null,
    end_ts: r.end_ts ?? null,
  }))

  // Rota + calendar holidays, plus any shift row whose label is already leave/holiday/OFF.
  let holidayDates = await fetchHolidayLocalDatesSet(supabase, userId, fromYmd, todayYmd, tz)
  holidayDates = augmentHolidayDatesFromShiftLabels(shiftRows, holidayDates, fromYmd, todayYmd)

  let shiftsForBlocks = applyHolidayAsOffToShiftRows(shiftRows, holidayDates)
  shiftsForBlocks = mergeHolidayDatesIntoShiftRows(shiftsForBlocks, holidayDates, fromYmd, todayYmd)

  const result = detectLastCompletedWorkBlock(shiftsForBlocks, todayYmd)
  if (!result || result.blockDates.length === 0) {
    return NextResponse.json({ block: null })
  }

  const { blockDates } = result
  const blockStartDate = blockDates[0]
  const blockEndShiftRow = shiftRows.find((r) => r.date === blockDates[blockDates.length - 1])
  const blockEndDate = blockEndShiftRow
    ? effectiveEndDate(blockEndShiftRow)
    : blockDates[blockDates.length - 1]
  const shiftCount = blockDates.length

  const windowStart = ymdToUtcDate(blockStartDate).toISOString()
  // After the last shift day, recovery sleep often starts the next calendar day (e.g. nights end Thu → main sleep Fri AM).
  // +2 days was tight for late-started or long sessions across TZ; +3 covers typical post-block sleep without widening much.
  const blockEndWindowEnd = new Date(ymdToUtcDate(blockEndDate).getTime() + 3 * 86400000)
  const windowEnd = blockEndWindowEnd.toISOString()

  const { data: sleepLogs, error: sleepError } = await supabase
    .from('sleep_logs')
    .select('start_at, end_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('end_at', windowStart)
    .lt('start_at', windowEnd)
    .order('start_at', { ascending: true })

  if (sleepError) {
    console.error('[api/sleep/last-work-block] sleep_logs error:', sleepError)
    return NextResponse.json({ error: 'Failed to load sleep' }, { status: 500 })
  }

  let totalSleepMinutes = 0
  for (const log of sleepLogs ?? []) {
    const start = Date.parse(log.start_at)
    const end = Date.parse(log.end_at)
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      totalSleepMinutes += Math.round((end - start) / 60000)
    }
  }

  const expectedSleepMinutes = shiftCount * EXPECTED_SLEEP_PER_SHIFT_MINUTES
  const status = deriveStatus(totalSleepMinutes, expectedSleepMinutes)

  const payload: LastWorkBlockPayload = {
    totalSleepMinutes,
    shiftCount,
    status,
    blockStartDate,
    blockEndDate,
    expectedSleepMinutes,
  }

  return NextResponse.json({ block: payload })
}
