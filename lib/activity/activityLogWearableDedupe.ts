import {
  activityDayKeyFromCivilActivityDate,
  activityDayKeyFromTimestamp,
} from '@/lib/activity/shiftedActivityDay'

const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * Rollout duplicate pattern: legacy rows (no activity_date, UTC/ts identity) plus new rows
 * (activity_date from the device). Only Health Connect and Apple Health sync paths write
 * that pair today; Google Fit step ingestion is deprecated and does not emit activity_date.
 * Manual entry and arbitrary labels stay out of this list.
 */
const FAMILY_MATCHERS: readonly { id: string; normalizedLabel: string }[] = [
  { id: 'health_connect', normalizedLabel: 'health connect' },
  { id: 'apple_health', normalizedLabel: 'apple health' },
]

export function wearableAggregatedFamilyId(source: string | null | undefined): string | null {
  if (source == null || typeof source !== 'string') return null
  const n = source.trim().toLowerCase()
  if (!n) return null
  const row = FAMILY_MATCHERS.find((f) => f.normalizedLabel === n)
  return row ? row.id : null
}

/** Human-readable labels (lowercase) that map to the families above — for docs / debugging. */
export const WEARABLE_DEDUPE_NORMALIZED_LABELS = FAMILY_MATCHERS.map((f) => f.normalizedLabel)

/**
 * For each family, shifted activity day keys that already have at least one row with a valid
 * activity_date from that family. Those rows win over legacy same-family rows on the same key.
 */
export function buildExplicitWearableShiftedKeysByFamily(
  logs: readonly any[],
  activityIntelTimeZone: string,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const log of logs) {
    const rawAd = typeof log.activity_date === 'string' ? log.activity_date.trim().slice(0, 10) : ''
    if (!YMD.test(rawAd)) continue
    const fam = wearableAggregatedFamilyId(log.source)
    if (!fam) continue
    const dayKey = activityDayKeyFromCivilActivityDate(rawAd, activityIntelTimeZone)
    if (!out.has(fam)) out.set(fam, new Set())
    out.get(fam)!.add(dayKey)
  }
  return out
}

/**
 * Legacy row (no valid activity_date): skip if same wearable family already has an explicit
 * activity_date row for the same shifted activity day key (derived from ts/created_at).
 */
export function shouldSkipLegacyWearableActivityLogRow(
  log: any,
  activityIntelTimeZone: string,
  explicitKeysByFamily: Map<string, Set<string>>,
): boolean {
  const rawAd = typeof log.activity_date === 'string' ? log.activity_date.trim().slice(0, 10) : ''
  if (YMD.test(rawAd)) return false
  const fam = wearableAggregatedFamilyId(log.source)
  if (!fam) return false
  const t = log.ts ?? log.created_at
  if (!t) return false
  const k = activityDayKeyFromTimestamp(t, activityIntelTimeZone)
  return explicitKeysByFamily.get(fam)?.has(k) ?? false
}

export function filterActivityLogRowsForWearableDedupe(
  rows: any[],
  activityIntelTimeZone: string,
): any[] {
  const explicitKeys = buildExplicitWearableShiftedKeysByFamily(rows, activityIntelTimeZone)
  return rows.filter((r) => !shouldSkipLegacyWearableActivityLogRow(r, activityIntelTimeZone, explicitKeys))
}
