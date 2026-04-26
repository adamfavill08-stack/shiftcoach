/**
 * Circadian “wall clock” fields (next trough / peak, body clock hour) must use the
 * user’s local time-of-day. Serverless defaults to UTC; browsers send `localHour`.
 */
export const LOCAL_HOUR_QUERY = 'localHour'

/** Minimal shape so this module stays usable from Route Handlers and tests. */
type NextRequestLike = { nextUrl: URL }

export function parseLocalHourQuery(req: Pick<NextRequestLike, 'nextUrl'>): number | null {
  const raw = req.nextUrl.searchParams.get(LOCAL_HOUR_QUERY)
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  let h = n % 24
  if (h < 0) h += 24
  return h
}

/**
 * Hour-of-day in [0,24) as a decimal (e.g. 14.5 = 14:30), preferring the client query
 * when present; otherwise the runtime’s local clock (UTC on typical Vercel workers).
 */
export function resolveWallHourDecimal(req: Pick<NextRequestLike, 'nextUrl'>, fallbackDate = new Date()): number {
  const parsed = parseLocalHourQuery(req)
  if (parsed !== null) return parsed
  return fallbackDate.getHours() + fallbackDate.getMinutes() / 60
}

/** Same formula as CircadianCard’s “now” tick — use when calling circadian APIs from the browser. */
export function getBrowserLocalWallHourDecimal(d = new Date()): number {
  return d.getHours() + d.getMinutes() / 60
}

export function circadianCalculateUrlWithLocalHour(basePath = '/api/circadian/calculate'): string {
  const h = getBrowserLocalWallHourDecimal()
  const sep = basePath.includes('?') ? '&' : '?'
  return `${basePath}${sep}${LOCAL_HOUR_QUERY}=${encodeURIComponent(String(h))}`
}
