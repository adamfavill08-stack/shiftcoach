import type { SleepQuality, SleepType } from './types'

export function getShiftedDayKey(dateInput: string | Date, shiftStartHour = 7): string {
  const date = new Date(dateInput)
  const shifted = new Date(date)
  shifted.setHours(shiftStartHour, 0, 0, 0)

  if (date.getHours() < shiftStartHour) {
    shifted.setDate(shifted.getDate() - 1)
  }

  return shifted.toISOString().slice(0, 10)
}

/**
 * Which shifted-day row to show first on the sleep page. Prefer "today's" bucket only when it
 * actually has sleep; otherwise use the latest shifted day with minutes (night sleep often
 * lands in the previous 07:00→07:00 window while the clock has already crossed into the next).
 */
export function pickDefaultShiftedDay(
  days: Array<{ date: string; totalMinutes?: number }>,
  currentShiftedDay: string | undefined,
  previousSelection: string | null,
): string | null {
  if (!days.length) return null

  const byDate = new Map(days.map((d) => [d.date, d]))
  const minutesFor = (date: string) => byDate.get(date)?.totalMinutes ?? 0

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

/** UTC calendar YYYY-MM-DD plus `deltaDays` (avoids local TZ shifting keys vs server `getShiftedDayKey`). */
export function addUtcDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const ms = Date.UTC(y, m - 1, d) + deltaDays * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Seven bars ending at `endDateKey`, matched to `shiftedDays[].date`. Uses UTC ladder plus any
 * in-range bucket keys returned by the API so totals are not dropped when keys don't line up.
 */
export function buildSevenShiftedDaySleepBars(
  shiftedDays: Array<{ date: string; totalMinutes: number }>,
  endDateKey: string | null,
): SleepBarPoint[] {
  const by = new Map(
    shiftedDays.map((d) => [String(d.date).trim(), Math.max(0, d.totalMinutes ?? 0)]),
  )
  const end =
    (endDateKey?.trim() || null) ??
    (shiftedDays.length
      ? [...shiftedDays].sort((a, b) => b.date.localeCompare(a.date))[0].date.trim()
      : getShiftedDayKey(new Date()))

  const slots: SleepBarPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const key = addUtcDaysYmd(end, -i)
    slots.push({ dateKey: key, totalMinutes: by.get(key) ?? 0 })
  }
  const slotKeys = new Set(slots.map((s) => s.dateKey))
  const orphans = [...by.entries()].filter(
    ([k, m]) =>
      m > 0 && !slotKeys.has(k) && k <= end && k >= addUtcDaysYmd(end, -12),
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

export function minutesBetween(startAt: string | Date, endAt: string | Date): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 60000)
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
