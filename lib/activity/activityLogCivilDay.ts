import { formatYmdInTimeZone } from '@/lib/sleep/utils'
import { isManualActivityRow } from '@/lib/activity/activityLogStepSum'

const YMD = /^\d{4}-\d{2}-\d{2}$/

function isUsableIsoTimestamp(v: unknown): v is string {
  if (typeof v !== 'string' || !v.trim()) return false
  return !Number.isNaN(Date.parse(v))
}

/**
 * Civil calendar YYYY-MM-DD for this row in `timeZone`, for bucketing and “today” filters.
 *
 * - Prefer `activity_date` when set.
 * - Manual: `start_time` → `ts` → `logged_at` → `created_at` (legacy fallback only when earlier fields missing).
 * - Non-manual (wearable): `logged_at` → `ts` only — **never** `created_at` (that is insert/import time).
 */
export function resolveActivityLogCivilYmd(row: Record<string, unknown>, timeZone: string): string | null {
  const rawAd = typeof row.activity_date === 'string' ? row.activity_date.trim().slice(0, 10) : ''
  if (YMD.test(rawAd)) return rawAd

  const manual = isManualActivityRow(typeof row.source === 'string' ? row.source : null)
  const chain: unknown[] = manual
    ? [row.start_time, row.ts, row.logged_at, row.created_at]
    : [row.logged_at, row.ts]

  for (const v of chain) {
    if (!isUsableIsoTimestamp(v)) continue
    return formatYmdInTimeZone(new Date(v as string), timeZone)
  }
  return null
}

/** Keeps only rows whose resolved civil day equals `civilYmd` in `timeZone`. */
export function filterActivityLogRowsToCivilYmd(
  rows: readonly Record<string, unknown>[],
  civilYmd: string,
  timeZone: string,
): Record<string, unknown>[] {
  return rows.filter((r) => resolveActivityLogCivilYmd(r, timeZone) === civilYmd)
}
