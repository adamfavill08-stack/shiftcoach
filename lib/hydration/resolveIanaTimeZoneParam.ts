/** IANA zone from `?tz=` (or `timeZone=`) on API routes; validates with Intl. */
export function resolveIanaTimeZoneParam(raw: string | null | undefined): string {
  const decoded = raw ? decodeURIComponent(String(raw).trim()) : ''
  const zone = decoded.slice(0, 120)
  if (!zone) return 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}
