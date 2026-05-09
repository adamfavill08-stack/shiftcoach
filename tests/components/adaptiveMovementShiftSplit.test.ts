import { describe, expect, it } from 'vitest'
import { buildAdaptiveMovementData } from '@/components/activity/AdaptiveMovementCard'

describe('buildAdaptiveMovementData shift fallbacks (no step samples)', () => {
  /** Shift crosses midnight in UTC: civil “same calendar day” rule must not apply. */
  it('uses anchored hourly split for overnight shift, not civil buckets, when local dates differ', () => {
    const shift = {
      start: '2026-01-08T22:00:00.000Z',
      end: '2026-01-09T06:00:00.000Z',
      type: 'night' as const,
    }
    const civil = Array.from({ length: 24 }, (_, h) => (h === 12 ? 99_999 : 0))
    const anchorStart = '2026-01-08T21:00:00.000Z'
    const anchored = Array.from({ length: 24 }, () => 0)
    anchored[1] = 2000
    anchored[2] = 3000
    anchored[3] = 4000
    const r = buildAdaptiveMovementData({
      samples: [],
      dayType: 'shift',
      shift,
      activityTimeZone: 'UTC',
      hourlyCivilBuckets: civil,
      hourlyShiftAnchoredBuckets: anchored,
      stepsByHourAnchorStart: anchorStart,
      activityDateYmd: '2026-01-09',
      coherentStepsFallback: null,
      nowForDistribution: new Date('2026-01-09T12:00:00Z'),
    })
    expect(r.mode).toBe('shift')
    if (r.mode !== 'shift') return
    expect(r.totalSteps).toBe(9000)
    expect(r.segments.before + r.segments.during + r.segments.after).toBe(9000)
    expect(r.segments.during).toBeGreaterThan(0)
    const civilOnly = buildAdaptiveMovementData({
      samples: [],
      dayType: 'shift',
      shift,
      activityTimeZone: 'UTC',
      hourlyCivilBuckets: civil,
      hourlyShiftAnchoredBuckets: null,
      stepsByHourAnchorStart: null,
      activityDateYmd: '2026-01-09',
      coherentStepsFallback: null,
      nowForDistribution: new Date('2026-01-09T12:00:00Z'),
    })
    expect(civilOnly.mode).toBe('shift')
    if (civilOnly.mode !== 'shift') return
    expect(civilOnly.totalSteps).toBe(0)
  })

  it('conserves hourly total across before/during/after after overlap split (± rounding)', () => {
    const shift = {
      start: '2026-06-10T10:30:00.000Z',
      end: '2026-06-10T14:30:00.000Z',
      type: 'day' as const,
    }
    const civil = Array.from({ length: 24 }, (_, h) => {
      if (h === 10) return 100
      if (h === 11) return 100
      if (h === 12) return 100
      return 0
    })
    const r = buildAdaptiveMovementData({
      samples: [],
      dayType: 'shift',
      shift,
      activityTimeZone: 'UTC',
      hourlyCivilBuckets: civil,
      hourlyShiftAnchoredBuckets: null,
      stepsByHourAnchorStart: null,
      activityDateYmd: '2026-06-10',
      coherentStepsFallback: null,
      nowForDistribution: new Date('2026-06-10T18:00:00Z'),
    })
    expect(r.mode).toBe('shift')
    if (r.mode !== 'shift') return
    expect(r.totalSteps).toBe(300)
    expect(r.segments.before + r.segments.during + r.segments.after).toBe(300)
  })

  it('uses civil hourly path when shift start/end share one local calendar date', () => {
    const shift = {
      start: '2026-06-10T09:00:00.000Z',
      end: '2026-06-10T17:00:00.000Z',
      type: 'day' as const,
    }
    const civil = Array.from({ length: 24 }, () => 0)
    civil[10] = 5000
    const r = buildAdaptiveMovementData({
      samples: [],
      dayType: 'shift',
      shift,
      activityTimeZone: 'UTC',
      hourlyCivilBuckets: civil,
      hourlyShiftAnchoredBuckets: null,
      stepsByHourAnchorStart: null,
      activityDateYmd: '2026-06-10',
      coherentStepsFallback: null,
      nowForDistribution: new Date('2026-06-10T18:00:00Z'),
    })
    expect(r.mode).toBe('shift')
    if (r.mode !== 'shift') return
    expect(r.totalSteps).toBe(5000)
    expect(r.segments.before + r.segments.during + r.segments.after).toBe(5000)
    expect(r.segments.during).toBe(5000)
  })
})
