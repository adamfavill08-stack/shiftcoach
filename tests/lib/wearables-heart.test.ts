import { describe, it, expect } from 'vitest'
import { computeBetweenShiftRecoveryWindow } from '@/lib/wearables/betweenShiftRecoveryWindow'
import { percentileRestingBpm, sortBpms, summarizeSamples } from '@/lib/wearables/aggregateHrSamples'

describe('computeBetweenShiftRecoveryWindow', () => {
  it('returns gap between previous shift end and current shift start when on shift', () => {
    const t0 = Date.UTC(2026, 2, 20, 6, 0, 0)
    const t1 = Date.UTC(2026, 2, 20, 14, 0, 0)
    const t2 = Date.UTC(2026, 2, 20, 22, 0, 0)
    const t3 = Date.UTC(2026, 2, 21, 6, 0, 0)
    const now = Date.UTC(2026, 2, 20, 23, 0, 0)
    const shifts = [
      { label: 'DAY', start_ts: new Date(t0).toISOString(), end_ts: new Date(t1).toISOString() },
      { label: 'EVE', start_ts: new Date(t2).toISOString(), end_ts: new Date(t3).toISOString() },
    ]
    const w = computeBetweenShiftRecoveryWindow(shifts, now)
    expect(w).not.toBeNull()
    expect(w!.start.toISOString()).toBe(new Date(t1).toISOString())
    expect(w!.end.toISOString()).toBe(new Date(t2).toISOString())
  })

  it('returns since-last-shift window when off shift', () => {
    const end = Date.UTC(2026, 2, 20, 14, 0, 0)
    const nextStart = Date.UTC(2026, 2, 22, 6, 0, 0)
    const now = Date.UTC(2026, 2, 21, 12, 0, 0)
    const shifts = [
      { label: 'DAY', start_ts: new Date(Date.UTC(2026, 2, 20, 6, 0)).toISOString(), end_ts: new Date(end).toISOString() },
      { label: 'DAY', start_ts: new Date(nextStart).toISOString(), end_ts: new Date(Date.UTC(2026, 2, 22, 14, 0)).toISOString() },
    ]
    const w = computeBetweenShiftRecoveryWindow(shifts, now)
    expect(w).not.toBeNull()
    expect(w!.start.getTime()).toBe(end)
    expect(w!.end.getTime()).toBe(now)
  })
})

describe('aggregateHrSamples', () => {
  it('uses ~10th percentile instead of single noise minimum', () => {
    const sorted = sortBpms(
      [72, 73, 74, 75, 76, 120].map((bpm, i) => ({
        bpm,
        recorded_at: `2026-03-20T10:${String(i).padStart(2, '0')}:00.000Z`,
      })),
    )
    const p10 = percentileRestingBpm(sorted, 0.1)
    expect(p10).toBe(72)
    expect(Math.min(...sorted)).toBe(72)
  })

  it('summarizeSamples requires span and count', () => {
    const start = new Date('2026-03-20T10:00:00.000Z')
    const end = new Date('2026-03-20T11:00:00.000Z')
    const samples = Array.from({ length: 12 }, (_, i) => ({
      bpm: 70 + i,
      recorded_at: new Date(start.getTime() + i * 3 * 60 * 1000).toISOString(),
    }))
    const s = summarizeSamples(samples, start, end, { minSamples: 10, minSpanMs: 15 * 60 * 1000 })
    expect(s.sufficient).toBe(true)
    expect(s.sample_count).toBe(12)
    expect(s.resting_bpm).not.toBeNull()
    expect(s.avg_bpm).not.toBeNull()
  })
})
