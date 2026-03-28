import type { HeartWeeklyDay } from './heartRateApi'

export type HrSample = { bpm: number; recorded_at: string }

const BPM_MIN = 35
const BPM_MAX = 220

/** 10th percentile resting estimate — more stable than raw min for sparse wearable streams */
export function percentileRestingBpm(sortedBpms: number[], p = 0.1): number | null {
  const vals = sortedBpms.filter((n) => n >= BPM_MIN && n <= BPM_MAX)
  if (vals.length === 0) return null
  const n = vals.length
  if (n === 1) return Math.round(vals[0])
  const idx = Math.max(0, Math.min(n - 1, Math.floor(p * (n - 1))))
  return Math.round(vals[idx])
}

export function meanBpm(bpms: number[]): number | null {
  const vals = bpms.filter((n) => n >= BPM_MIN && n <= BPM_MAX)
  if (vals.length === 0) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function sortBpms(samples: HrSample[]): number[] {
  return samples
    .map((s) => s.bpm)
    .filter((b) => typeof b === 'number' && b > 0)
    .slice()
    .sort((a, b) => a - b)
}

export type SummarizeOptions = {
  minSamples?: number
  minSpanMs?: number
}

export function summarizeSamples(
  samples: HrSample[],
  windowStart: Date,
  windowEnd: Date,
  opts: SummarizeOptions = {}
): {
  resting_bpm: number | null
  avg_bpm: number | null
  recovery_delta_bpm: number | null
  sample_count: number
  span_ms: number
  sufficient: boolean
} {
  const minSamples = opts.minSamples ?? 10
  const minSpanMs = opts.minSpanMs ?? 15 * 60 * 1000

  const inWindow = samples.filter((s) => {
    const t = Date.parse(s.recorded_at)
    return Number.isFinite(t) && t >= windowStart.getTime() && t < windowEnd.getTime()
  })

  const sorted = sortBpms(inWindow)
  const times = inWindow
    .map((s) => Date.parse(s.recorded_at))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b)
  const span_ms = times.length >= 2 ? times[times.length - 1] - times[0] : 0

  const resting = percentileRestingBpm(sorted, 0.1)
  const avg = meanBpm(sorted)
  const recovery =
    resting != null && avg != null ? Math.round((avg - resting) * 10) / 10 : null

  const sufficient = sorted.length >= minSamples && span_ms >= minSpanMs

  return {
    resting_bpm: resting,
    avg_bpm: avg,
    recovery_delta_bpm: recovery,
    sample_count: sorted.length,
    span_ms,
    sufficient,
  }
}

export function utcDateKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Last `days` calendar days in UTC as YYYY-MM-DD, oldest first */
export function lastUtcDateKeys(days: number, now: Date): string[] {
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    keys.push(`${y}-${m}-${day}`)
  }
  return keys
}

export function buildWeeklyTrendUtc(
  samples: HrSample[],
  now: Date,
  days: number,
  dayMinSamples: number,
  dayMinSpanMs: number
): HeartWeeklyDay[] {
  const keys = lastUtcDateKeys(days, now)
  const byDay = new Map<string, HrSample[]>()
  for (const k of keys) byDay.set(k, [])

  for (const s of samples) {
    if (!s.recorded_at) continue
    const k = utcDateKey(s.recorded_at)
    const bucket = byDay.get(k)
    if (bucket) bucket.push(s)
  }

  return keys.map((date) => {
    const daySamples = byDay.get(date) ?? []
    const start = new Date(`${date}T00:00:00.000Z`)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    const sum = summarizeSamples(daySamples, start, end, {
      minSamples: dayMinSamples,
      minSpanMs: dayMinSpanMs,
    })
    return {
      date,
      resting_bpm: sum.resting_bpm,
      avg_bpm: sum.avg_bpm,
      recovery_delta_bpm: sum.recovery_delta_bpm,
      sample_count: sum.sample_count,
      enough_data: sum.sufficient,
    }
  })
}
