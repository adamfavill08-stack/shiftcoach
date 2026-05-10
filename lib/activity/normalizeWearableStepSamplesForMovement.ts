/**
 * Wearable 15-minute step buckets for the "Your shift movement" card.
 * Dedupes sync retries, detects accidental cumulative series, clips to a local civil day,
 * and allocates bucket steps across time windows by overlap (handles shift boundaries).
 */

export type MovementStepSample = {
  timestamp: string
  steps: number
  /** ISO end of bucket (exclusive in overlap math: interval is [timestamp, endTimestamp)). */
  endTimestamp?: string | null
}

const FIFTEEN_MS = 15 * 60 * 1000

export function defaultBucketEndMs(startMs: number, endIso?: string | null): number {
  if (typeof endIso === 'string' && endIso.trim()) {
    const e = Date.parse(endIso)
    if (Number.isFinite(e) && e > startMs) return e
  }
  return startMs + FIFTEEN_MS
}

/** Dedupe by bucket start; same sync row repeated — keep max(steps) so totals do not inflate. */
export function dedupeWearableStepSamplesByBucketStart(samples: MovementStepSample[]): MovementStepSample[] {
  const map = new Map<string, MovementStepSample>()
  for (const s of samples) {
    const k = String(s.timestamp ?? '').trim()
    if (!k) continue
    const steps = Math.max(0, Math.round(Number(s.steps) || 0))
    const prev = map.get(k)
    if (!prev || steps > prev.steps) {
      map.set(k, {
        timestamp: k,
        steps,
        endTimestamp: s.endTimestamp ?? prev?.endTimestamp,
      })
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
}

/**
 * If values are monotonic non-decreasing and end ≈ coherent daily total, treat rows as cumulative
 * device-day totals and convert to per-bucket deltas.
 */
export function wearableSamplesToIncrementalIfCumulative(
  samples: MovementStepSample[],
  coherentDayStepsHint: number,
): MovementStepSample[] {
  if (samples.length < 2) return samples
  const sorted = [...samples].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  const vals = sorted.map((s) => Math.max(0, s.steps))
  const nonDecreasing = vals.every((v, i) => (i === 0 ? true : v >= vals[i - 1]!))
  if (!nonDecreasing) return sorted
  const last = vals[vals.length - 1]!
  const hint = Math.max(0, Math.round(coherentDayStepsHint || 0))
  if (last <= 0 || hint <= 0) return sorted
  const ratio = last / hint
  if (ratio < 0.85 || ratio > 1.15) return sorted
  if (vals[0]! > last * 0.4) return sorted
  return sorted.map((s, i) => ({
    ...s,
    steps: i === 0 ? Math.max(0, s.steps) : Math.max(0, s.steps - sorted[i - 1]!.steps),
  }))
}

/** Half-open [windowStartMs, windowEndMs) vs bucket [b0, b1). */
export function filterSamplesOverlappingUtcWindow(
  samples: MovementStepSample[],
  windowStartMs: number,
  windowEndMs: number,
): MovementStepSample[] {
  return samples.filter((s) => {
    const b0 = Date.parse(s.timestamp)
    if (!Number.isFinite(b0)) return false
    const b1 = defaultBucketEndMs(b0, s.endTimestamp ?? null)
    return b0 < windowEndMs && b1 > windowStartMs
  })
}

export function shiftDayMovementWindows(
  dayStartMs: number,
  dayEndExclusiveMs: number,
  shiftStartMs: number,
  shiftEndMs: number,
): { key: 'before' | 'during' | 'after'; startMs: number; endMs: number }[] {
  const d0 = dayStartMs
  const d1 = dayEndExclusiveMs
  const S = shiftStartMs
  const E = shiftEndMs
  const out: { key: 'before' | 'during' | 'after'; startMs: number; endMs: number }[] = []
  const beforeEnd = Math.min(d1, S)
  if (beforeEnd > d0) out.push({ key: 'before', startMs: d0, endMs: beforeEnd })
  const du0 = Math.max(d0, S)
  const du1 = Math.min(d1, E)
  if (du1 > du0) out.push({ key: 'during', startMs: du0, endMs: du1 })
  const af0 = Math.max(d0, E)
  if (d1 > af0) out.push({ key: 'after', startMs: af0, endMs: d1 })
  return out
}

export function recoveryDayMovementWindows(dayStartMs: number, dayEndExclusiveMs: number) {
  const d0 = dayStartMs
  const d1 = dayEndExclusiveMs
  const h = 60 * 60 * 1000
  return [
    { key: 'morning' as const, startMs: d0, endMs: d0 + 12 * h },
    { key: 'midday' as const, startMs: d0 + 12 * h, endMs: d0 + 18 * h },
    /** 18:00–end of civil day (UI label remains “Evening”). */
    { key: 'evening' as const, startMs: d0 + 18 * h, endMs: d1 },
  ].filter((w) => w.endMs > w.startMs)
}

/** Allocate each bucket's steps across windows by overlap length (same idea as hourly split on shift). */
export function allocateStepsAcrossWindows(
  samples: MovementStepSample[],
  windows: { key: string; startMs: number; endMs: number }[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const w of windows) totals[w.key] = 0

  for (const s of samples) {
    const b0 = Date.parse(s.timestamp)
    if (!Number.isFinite(b0)) continue
    const b1 = defaultBucketEndMs(b0, s.endTimestamp ?? null)
    const steps = Math.max(0, Math.round(s.steps))
    if (steps <= 0 || b1 <= b0) continue
    const span = b1 - b0
    for (const w of windows) {
      const overlap = Math.max(0, Math.min(b1, w.endMs) - Math.max(b0, w.startMs))
      if (overlap > 0) {
        totals[w.key] = (totals[w.key] ?? 0) + (steps * overlap) / span
      }
    }
  }
  for (const w of windows) {
    totals[w.key] = Math.round(totals[w.key] ?? 0)
  }
  return totals
}

export function countDuplicateBucketStarts(samples: MovementStepSample[]): number {
  const seen = new Set<string>()
  let dup = 0
  for (const s of samples) {
    const k = String(s.timestamp ?? '').trim()
    if (!k) continue
    if (seen.has(k)) dup++
    else seen.add(k)
  }
  return dup
}

/** Full pipeline for `/api/activity/today` → movement card. */
export function processWearableStepSamplesForMovementCard(opts: {
  rawRows: Array<{ bucket_start_utc: string | null; bucket_end_utc: string | null; steps: number | null }>
  dayStartMs: number
  dayEndExclusiveMs: number
  coherentStepsHint: number
}): MovementStepSample[] {
  const mapped: MovementStepSample[] = (opts.rawRows ?? [])
    .map((row) => {
      if (!row?.bucket_start_utc) return null
      const steps = typeof row.steps === 'number' && Number.isFinite(row.steps) ? Math.max(0, Math.round(row.steps)) : 0
      return {
        timestamp: row.bucket_start_utc,
        steps,
        endTimestamp: row.bucket_end_utc ?? null,
      } as MovementStepSample
    })
    .filter((r): r is MovementStepSample => r != null)

  const deduped = dedupeWearableStepSamplesByBucketStart(mapped)
  const incremental = wearableSamplesToIncrementalIfCumulative(deduped, opts.coherentStepsHint)
  const clipped = filterSamplesOverlappingUtcWindow(incremental, opts.dayStartMs, opts.dayEndExclusiveMs)
  return clipped
}
