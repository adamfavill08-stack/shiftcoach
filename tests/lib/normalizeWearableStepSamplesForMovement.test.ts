import { describe, expect, it } from 'vitest'
import {
  allocateStepsAcrossWindows,
  dedupeWearableStepSamplesByBucketStart,
  filterSamplesOverlappingUtcWindow,
  processWearableStepSamplesForMovementCard,
  recoveryDayMovementWindows,
  shiftDayMovementWindows,
  wearableSamplesToIncrementalIfCumulative,
} from '@/lib/activity/normalizeWearableStepSamplesForMovement'

describe('shiftDayMovementWindows', () => {
  it('splits a day shift 06:00–14:00 on the same civil day (UTC)', () => {
    const d0 = Date.parse('2026-06-10T00:00:00.000Z')
    const d1 = Date.parse('2026-06-11T00:00:00.000Z')
    const S = Date.parse('2026-06-10T06:00:00.000Z')
    const E = Date.parse('2026-06-10T14:00:00.000Z')
    const w = shiftDayMovementWindows(d0, d1, S, E)
    expect(w.map((x) => x.key)).toEqual(['before', 'during', 'after'])
    expect(w[0]).toMatchObject({ key: 'before', startMs: d0, endMs: S })
    expect(w[1]).toMatchObject({ key: 'during', startMs: S, endMs: E })
    expect(w[2]).toMatchObject({ key: 'after', startMs: E, endMs: d1 })
  })

  it('handles night shift 22:00–06:00 clipped to Tuesday civil window only', () => {
    const d0 = Date.parse('2026-01-09T00:00:00.000Z')
    const d1 = Date.parse('2026-01-10T00:00:00.000Z')
    const S = Date.parse('2026-01-08T22:00:00.000Z')
    const E = Date.parse('2026-01-09T06:00:00.000Z')
    const w = shiftDayMovementWindows(d0, d1, S, E)
    expect(w.find((x) => x.key === 'before')).toBeUndefined()
    const du = w.find((x) => x.key === 'during')!
    expect(du.startMs).toBe(d0)
    expect(du.endMs).toBe(E)
  })
})

describe('recoveryDayMovementWindows', () => {
  it('uses 00–12, 12–18, 18–24 local', () => {
    const d0 = Date.parse('2026-03-01T00:00:00.000Z')
    const d1 = Date.parse('2026-03-02T00:00:00.000Z')
    const w = recoveryDayMovementWindows(d0, d1)
    expect(w).toHaveLength(3)
    expect(w[0]!.endMs - w[0]!.startMs).toBe(12 * 60 * 60 * 1000)
    expect(w[1]!.endMs - w[1]!.startMs).toBe(6 * 60 * 60 * 1000)
    expect(w[2]!.endMs - w[2]!.startMs).toBe(6 * 60 * 60 * 1000)
  })
})

describe('allocateStepsAcrossWindows', () => {
  it('splits a 15m bucket that straddles shift_start proportionally', () => {
    const d0 = Date.parse('2026-06-10T00:00:00.000Z')
    const d1 = Date.parse('2026-06-11T00:00:00.000Z')
    const S = Date.parse('2026-06-10T06:10:00.000Z')
    const E = Date.parse('2026-06-10T14:00:00.000Z')
    const windows = shiftDayMovementWindows(d0, d1, S, E)
    const b0 = Date.parse('2026-06-10T06:00:00.000Z')
    const b1 = Date.parse('2026-06-10T06:15:00.000Z')
    const alloc = allocateStepsAcrossWindows([{ timestamp: new Date(b0).toISOString(), steps: 100, endTimestamp: new Date(b1).toISOString() }], windows)
    expect(alloc.before + alloc.during).toBe(100)
    expect(alloc.before).toBeGreaterThan(0)
    expect(alloc.during).toBeGreaterThan(0)
    expect(alloc.after).toBe(0)
  })
})

describe('processWearableStepSamplesForMovementCard', () => {
  it('dedupes duplicate bucket_start from repeated sync and excludes other civil days', () => {
    const d0 = Date.parse('2026-06-10T00:00:00.000Z')
    const d1 = Date.parse('2026-06-11T00:00:00.000Z')
    const raw = [
      {
        bucket_start_utc: '2026-06-10T12:00:00.000Z',
        bucket_end_utc: '2026-06-10T12:15:00.000Z',
        steps: 80,
      },
      {
        bucket_start_utc: '2026-06-10T12:00:00.000Z',
        bucket_end_utc: '2026-06-10T12:15:00.000Z',
        steps: 80,
      },
      {
        bucket_start_utc: '2026-06-09T12:00:00.000Z',
        bucket_end_utc: '2026-06-09T12:15:00.000Z',
        steps: 999,
      },
    ]
    const out = processWearableStepSamplesForMovementCard({
      rawRows: raw,
      dayStartMs: d0,
      dayEndExclusiveMs: d1,
      coherentStepsHint: 200,
    })
    expect(out).toHaveLength(1)
    expect(out[0]!.steps).toBe(80)
  })
})

describe('dedupe + cumulative', () => {
  it('dedupes duplicate bucket starts keeping max steps', () => {
    const t = '2026-06-10T12:00:00.000Z'
    const d = dedupeWearableStepSamplesByBucketStart([
      { timestamp: t, steps: 100 },
      { timestamp: t, steps: 500 },
    ])
    expect(d).toHaveLength(1)
    expect(d[0]!.steps).toBe(500)
  })

  it('repeated cumulative-style rows convert to deltas when hint matches', () => {
    const rows = [
      { timestamp: '2026-06-10T10:00:00.000Z', steps: 1000 },
      { timestamp: '2026-06-10T10:15:00.000Z', steps: 2500 },
      { timestamp: '2026-06-10T10:30:00.000Z', steps: 4000 },
    ]
    const out = wearableSamplesToIncrementalIfCumulative(rows, 4000)
    expect(out[0]!.steps).toBe(1000)
    expect(out[1]!.steps).toBe(1500)
    expect(out[2]!.steps).toBe(1500)
  })

  it('filterSamplesOverlappingUtcWindow excludes previous civil day', () => {
    const d0 = Date.parse('2026-06-10T00:00:00.000Z')
    const d1 = Date.parse('2026-06-11T00:00:00.000Z')
    const rows = [
      { timestamp: '2026-06-09T23:45:00.000Z', steps: 99 },
      { timestamp: '2026-06-10T08:00:00.000Z', steps: 50 },
    ]
    const f = filterSamplesOverlappingUtcWindow(rows, d0, d1)
    expect(f).toHaveLength(1)
    expect(f[0]!.steps).toBe(50)
  })
})
