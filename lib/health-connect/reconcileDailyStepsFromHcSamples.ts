import { isoDateInTimeZone } from '@/lib/sleep/sleepShiftWallClock'

const YMD = /^\d{4}-\d{2}-\d{2}$/

export type HcStepSampleInput = {
  timestamp: string
  steps?: number
  endTimestamp?: string
}

/**
 * Sum Health Connect 15-minute bucket totals that fall on a given **local** civil date (`civilYmd`)
 * in `timeZone`. Buckets use the same `COUNT_TOTAL` basis as the native `aggregateGroupByDuration`
 * path — summing them matches HC-deduped daily totals better than summing raw `StepsRecord` intervals.
 *
 * Returns `null` when there are no samples on that local day (caller should keep the client-reported total).
 */
export function sumHcStepSamplesForLocalCivilDay(
  samples: readonly HcStepSampleInput[],
  civilYmd: string,
  timeZone: string,
): number | null {
  const ymd = String(civilYmd).trim().slice(0, 10)
  if (!YMD.test(ymd)) return null
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const byBucketStart = new Map<string, number>()
  for (const s of samples) {
    const startMs = Date.parse(String(s.timestamp ?? ''))
    if (!Number.isFinite(startMs)) continue
    let localYmd: string
    try {
      localYmd = isoDateInTimeZone(startMs, tz)
    } catch {
      continue
    }
    if (localYmd !== ymd) continue
    const key = String(s.timestamp).trim()
    if (!key) continue
    const steps = typeof s.steps === 'number' && Number.isFinite(s.steps) ? Math.max(0, Math.round(s.steps)) : 0
    const prev = byBucketStart.get(key) ?? 0
    byBucketStart.set(key, Math.max(prev, steps))
  }
  if (byBucketStart.size === 0) return null
  let sum = 0
  for (const v of byBucketStart.values()) sum += v
  return sum
}
