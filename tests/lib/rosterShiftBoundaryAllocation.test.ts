import { describe, expect, it } from 'vitest'
import { allocateStepsAcrossRosterShiftBoundaries } from '@/lib/activity/normalizeWearableStepSamplesForMovement'

describe('allocateStepsAcrossRosterShiftBoundaries', () => {
  const S = Date.parse('2026-05-12T19:00:00.000Z')
  const E = Date.parse('2026-05-13T07:00:00.000Z')
  const clip0 = Date.parse('2026-05-12T00:00:00.000Z')
  const clip1 = Date.parse('2026-05-14T00:00:00.000Z')

  it('attributes only pre-roster time to before (bucket straddling roster start)', () => {
    const samples = [
      {
        timestamp: '2026-05-12T18:50:00.000Z',
        steps: 100,
        endTimestamp: '2026-05-12T19:05:00.000Z',
      },
    ]
    const r = allocateStepsAcrossRosterShiftBoundaries(samples, clip0, clip1, S, E)
    expect(r.before).toBeGreaterThan(0)
    expect(r.during).toBeGreaterThan(0)
    expect(r.before + r.during + r.after).toBe(100)
  })

  it('puts fully pre-start bucket entirely in before', () => {
    const samples = [
      {
        timestamp: '2026-05-12T10:00:00.000Z',
        steps: 42,
        endTimestamp: '2026-05-12T10:15:00.000Z',
      },
    ]
    const r = allocateStepsAcrossRosterShiftBoundaries(samples, clip0, clip1, S, E)
    expect(r.before).toBe(42)
    expect(r.during).toBe(0)
    expect(r.after).toBe(0)
  })

  it('caps after-shift segment at sleep window start (exclusive)', () => {
    const samples = [
      {
        timestamp: '2026-05-13T08:00:00.000Z',
        steps: 100,
        endTimestamp: '2026-05-13T08:15:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-05-13T08:10:00.000Z')
    const uncapped = allocateStepsAcrossRosterShiftBoundaries(samples, clip0, clip1, S, E)
    const capped = allocateStepsAcrossRosterShiftBoundaries(samples, clip0, clip1, S, E, sleepStart)
    expect(uncapped.after).toBeGreaterThan(0)
    expect(capped.after).toBeLessThan(uncapped.after)
    expect(capped.before + capped.during + capped.after).toBeLessThanOrEqual(100)
  })
})
