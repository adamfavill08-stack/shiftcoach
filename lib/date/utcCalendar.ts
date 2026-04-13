/** UTC calendar YYYY-MM-DD (matches `shift_rhythm_scores.date` and `/api/shift-rhythm`). */
export function utcTodayYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addUtcCalendarDays(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + deltaDays * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

/** First day (UTC) of the rolling 7-day window that includes today. */
export function getRollingWeekStartThroughUtcToday(): string {
  return addUtcCalendarDays(utcTodayYmd(), -6)
}
