import type { SleepQuality, SleepType } from './types'

function getCalendarPartsInTimeZone(d: Date, timeZone: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
    const parts = fmt.formatToParts(d)
    const get = (type: Intl.DateTimeFormatPartTypes) => {
      const p = parts.find((x) => x.type === type)
      return p ? parseInt(p.value, 10) : NaN
    }
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') }
  } catch {
    const iso = d.toISOString()
    const y = parseInt(iso.slice(0, 4), 10)
    const m = parseInt(iso.slice(5, 7), 10)
    const day = parseInt(iso.slice(8, 10), 10)
    const hour = parseInt(iso.slice(11, 13), 10)
    return { year: y, month: m, day, hour }
  }
}

function shiftWallDateByDays(year: number, month: number, day: number, deltaDays: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  const y = dt.getUTCFullYear()
  const m = dt.getUTCMonth() + 1
  const d = dt.getUTCDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Calendar YYYY-MM-DD for an instant in an IANA time zone (used for 7-day charts). */
export function formatYmdInTimeZone(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant)
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant)
  }
}

/**
 * First UTC instant where civil date in `timeZone` equals `ymd` (local midnight).
 * Used to align fetch windows and chart axis labels with /api/sleep/7days bucketing.
 */
export function startOfLocalDayUtcMs(ymd: string, timeZone: string): number {
  const parts = ymd.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return NaN

  let lo = Date.UTC(y, m - 1, d, 0, 0, 0) - 48 * 3600000
  let hi = Date.UTC(y, m - 1, d, 0, 0, 0) + 48 * 3600000
  let found = -1
  for (let t = lo; t <= hi; t += 3600000) {
    if (formatYmdInTimeZone(new Date(t), timeZone) === ymd) {
      found = t
      break
    }
  }
  if (found < 0) {
    lo -= 168 * 3600000
    hi += 168 * 3600000
    for (let t = lo; t <= hi; t += 3600000) {
      if (formatYmdInTimeZone(new Date(t), timeZone) === ymd) {
        found = t
        break
      }
    }
  }
  if (found < 0) return Date.UTC(y, m - 1, d, 0, 0, 0)

  let lo2 = found - 36 * 3600000
  let hi2 = found
  while (lo2 < hi2 - 1) {
    const mid = Math.floor((lo2 + hi2) / 2)
    if (formatYmdInTimeZone(new Date(mid), timeZone) === ymd) hi2 = mid
    else lo2 = mid
  }
  return hi2
}

/** Calendar day of month for chart ticks; must use the same IANA zone as the 7-day API. */
export function formatSleepChartAxisLabel(ymd: string, timeZone: string): string {
  if (!ymd?.trim() || !timeZone) return ymd
  const start = startOfLocalDayUtcMs(ymd, timeZone)
  if (!Number.isFinite(start)) return ymd
  const inst = new Date(start + 12 * 3600000)
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      timeZone,
    }).format(inst)
  } catch {
    return ymd
  }
}

/** Smallest t > anchorMs whose calendar date in `timeZone` differs from the anchor's date. */
function startOfNextLocalDayMs(anchorMs: number, timeZone: string): number {
  const y0 = formatYmdInTimeZone(new Date(anchorMs), timeZone)
  let lo = anchorMs + 1
  let hi = anchorMs + 32 * 24 * 3600000
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (formatYmdInTimeZone(new Date(mid), timeZone) !== y0) hi = mid
    else lo = mid + 1
  }
  return lo
}

/**
 * Split a sleep interval into minutes per local calendar day in `timeZone` (at local midnights).
 * Matches how “hours per day” charts should relate to clock-time sleep logs.
 */
export function splitSleepMinutesAcrossLocalDays(
  startAt: string | Date,
  endAt: string | Date,
  timeZone: string,
): Map<string, number> {
  const chunks = new Map<string, number>()
  const startMs = new Date(startAt).getTime()
  const endMs = new Date(endAt).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return chunks

  let cur = startMs
  while (cur < endMs) {
    const ymd = formatYmdInTimeZone(new Date(cur), timeZone)
    const nextBoundary = startOfNextLocalDayMs(cur, timeZone)
    const segEnd = Math.min(endMs, nextBoundary)
    const mins = Math.round((segEnd - cur) / 60000)
    if (mins > 0) chunks.set(ymd, (chunks.get(ymd) ?? 0) + mins)
    cur = segEnd
  }
  return chunks
}

/**
 * Shifted calendar day label (default 07:00→07:00) in `timeZone` (IANA), as YYYY-MM-DD.
 * Uses the wall-clock date in that zone so server and chart stay aligned when the client passes
 * the same zone as `/api/sleep/24h-grouped?tz=`.
 */
export function getShiftedDayKey(
  dateInput: string | Date,
  shiftStartHour = 7,
  timeZone = 'UTC',
): string {
  const instant = new Date(dateInput)
  if (Number.isNaN(instant.getTime())) return '1970-01-01'

  const { year, month, day, hour } = getCalendarPartsInTimeZone(instant, timeZone)
  if ([year, month, day, hour].some((n) => !Number.isFinite(n))) return '1970-01-01'

  if (hour < shiftStartHour) {
    return shiftWallDateByDays(year, month, day, -1)
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Which shifted-day row to show first on the sleep page. Prefer "today's" bucket only when it
 * actually has sleep; otherwise use the latest shifted day with minutes (night sleep often
 * lands in the previous 07:00→07:00 window while the clock has already crossed into the next).
 */
export function pickDefaultShiftedDay(
  days: Array<{
    date: string
    totalMinutes?: number
    sessions?: Array<{ durationHours?: number; start_at?: string; end_at?: string }>
  }>,
  currentShiftedDay: string | undefined,
  previousSelection: string | null,
): string | null {
  if (!days.length) return null

  const byDate = new Map(days.map((d) => [d.date, d]))
  const minutesFor = (date: string) => {
    const row = byDate.get(date)
    return row ? aggregateDayMinutes(row) : 0
  }

  if (previousSelection && byDate.has(previousSelection) && minutesFor(previousSelection) > 0) {
    return previousSelection
  }

  if (currentShiftedDay && byDate.has(currentShiftedDay) && minutesFor(currentShiftedDay) > 0) {
    return currentShiftedDay
  }

  const withSleep = days.filter((d) => (d.totalMinutes ?? 0) > 0)
  if (withSleep.length) {
    withSleep.sort((a, b) => b.date.localeCompare(a.date))
    return withSleep[0].date
  }

  if (currentShiftedDay && byDate.has(currentShiftedDay)) return currentShiftedDay
  return days[0].date
}

export type SleepBarPoint = { dateKey: string; totalMinutes: number }

/** Gregorian calendar YYYY-MM-DD plus `deltaDays` (matches shifted-day labels from `getShiftedDayKey`). */
export function addCalendarDaysToYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return shiftWallDateByDays(y, m, d, deltaDays)
}

/**
 * Half-open UTC window [startMs, endExclusiveMs) covering every local civil day touched by the
 * shift interval. Used to clip wearable buckets and split before/during/after so overnight shifts
 * are not treated as “only civil today” after local midnight.
 */
export function movementAllocationWindowFromShiftInstants(
  shiftStart: Date,
  shiftEnd: Date,
  timeZone: string,
): { startMs: number; endExclusiveMs: number } | null {
  const s = shiftStart.getTime()
  const e = shiftEnd.getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null
  const startYmd = formatYmdInTimeZone(shiftStart, timeZone)
  const endYmd = formatYmdInTimeZone(shiftEnd, timeZone)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) return null
  const startMs = startOfLocalDayUtcMs(startYmd, timeZone)
  const endExclusiveMs = startOfLocalDayUtcMs(addCalendarDaysToYmd(endYmd, 1), timeZone)
  if (!Number.isFinite(startMs) || !Number.isFinite(endExclusiveMs) || endExclusiveMs <= startMs) return null
  return { startMs, endExclusiveMs }
}

/** Last millisecond of civil `ymd` in `timeZone`. */
export function endOfLocalDayUtcMs(ymd: string, timeZone: string): number {
  return startOfLocalDayUtcMs(addCalendarDaysToYmd(ymd, 1), timeZone) - 1
}

export function minutesBetween(startAt: string | Date, endAt: string | Date): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 60000)
}

/**
 * Seven bars ending at `endDateKey`, matched to `shiftedDays[].date`. Uses the same civil-date
 * ladder as API keys so filled buckets are not missed.
 */
function aggregateDayMinutes(d: {
  date: string
  totalMinutes?: number
  sessions?: Array<{ durationHours?: number; start_at?: string; end_at?: string }>
}): number {
  let total = Math.max(0, Number(d.totalMinutes) || 0)
  if (total > 0 || !d.sessions?.length) return total
  return d.sessions.reduce((sum, s) => {
    if (typeof s.durationHours === 'number' && Number.isFinite(s.durationHours)) {
      return sum + Math.max(0, Math.round(s.durationHours * 60))
    }
    if (s.start_at && s.end_at) return sum + minutesBetween(s.start_at, s.end_at)
    return sum
  }, 0)
}

export function buildSevenShiftedDaySleepBars(
  shiftedDays: Array<{
    date: string
    totalMinutes?: number
    sessions?: Array<{ durationHours?: number; start_at?: string; end_at?: string }>
  }>,
  endDateKey: string | null,
  timeZone: string = 'UTC',
): SleepBarPoint[] {
  const by = new Map(
    shiftedDays.map((d) => [String(d.date).trim(), aggregateDayMinutes(d)] as const),
  )
  const end =
    (endDateKey?.trim() || null) ??
    (shiftedDays.length
      ? [...shiftedDays].sort((a, b) => b.date.localeCompare(a.date))[0].date.trim()
      : getShiftedDayKey(new Date(), 7, timeZone))

  const slots: SleepBarPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const key = addCalendarDaysToYmd(end, -i)
    slots.push({ dateKey: key, totalMinutes: by.get(key) ?? 0 })
  }
  const slotKeys = new Set(slots.map((s) => s.dateKey))
  const orphans = [...by.entries()].filter(
    ([k, m]) =>
      m > 0 && !slotKeys.has(k) && k <= end && k >= addCalendarDaysToYmd(end, -12),
  )
  if (orphans.length === 0) return slots

  const merged = [...new Set([...slots.map((s) => s.dateKey), ...orphans.map(([k]) => k)])]
    .filter((k) => k <= end)
    .sort((a, b) => a.localeCompare(b))
    .slice(-7)

  return merged.map((dateKey) => ({
    dateKey,
    totalMinutes: by.get(dateKey) ?? 0,
  }))
}

export function isPrimarySleepType(type: SleepType): boolean {
  return type === 'main_sleep' || type === 'post_shift_sleep' || type === 'recovery_sleep'
}

/** DB row helpers: canonical types + legacy `sleep` / `main` + old `naps` flag. */
export function rowCountsAsPrimarySleep(row: {
  type?: string | null
  naps?: number | null | undefined
}): boolean {
  const t = row.type
  if (t != null && t !== '') {
    if (t === 'nap') return false
    if (t === 'sleep' || t === 'main') return true
    return isPrimarySleepType(t as SleepType)
  }
  return row.naps === 0 || row.naps == null || !row.naps
}

export function getSleepTypeLabel(type: SleepType | string): string {
  switch (type) {
    case 'main_sleep':
      return 'Main sleep'
    case 'post_shift_sleep':
      return 'Post-shift sleep'
    case 'recovery_sleep':
      return 'Recovery sleep'
    case 'nap':
      return 'Nap'
    default:
      return 'Sleep'
  }
}

export function qualityLabelToNumber(
  value: 'Excellent' | 'Good' | 'Fair' | 'Poor'
): SleepQuality {
  switch (value) {
    case 'Excellent':
      return 5
    case 'Good':
      return 4
    case 'Fair':
      return 3
    case 'Poor':
      return 2
  }
}

export function qualityNumberToLabel(value: number | null | undefined): string {
  switch (value) {
    case 5:
      return 'Excellent'
    case 4:
      return 'Good'
    case 3:
      return 'Fair'
    case 2:
      return 'Poor'
    case 1:
      return 'Very poor'
    default:
      return 'Fair'
  }
}
