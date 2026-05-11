import { describe, expect, it } from 'vitest'
import {
  computeActivityTotalsBreakdown,
  effectiveActivityLogSteps,
  sumStepsFromActivityLogRows,
  wearableDeltaSupersedesManual,
} from '@/lib/activity/activityLogStepSum'

describe('effectiveActivityLogSteps', () => {
  it('counts wearable rows normally', () => {
    expect(effectiveActivityLogSteps({ steps: 3000, source: 'health_connect' })).toBe(3000)
  })

  it('counts manual active', () => {
    expect(effectiveActivityLogSteps({ steps: 500, source: 'manual', merge_status: 'active' })).toBe(500)
  })

  it('excludes superseded manual', () => {
    expect(effectiveActivityLogSteps({ steps: 5000, source: 'manual', merge_status: 'superseded_by_wearable' })).toBe(0)
  })

  it('treats legacy manual without merge_status as active', () => {
    expect(effectiveActivityLogSteps({ steps: 1200, source: 'manual', merge_status: null })).toBe(1200)
  })

  it('treats legacy Manual entry label as manual for supersede rules', () => {
    expect(effectiveActivityLogSteps({ steps: 800, source: 'Manual entry', merge_status: 'active' })).toBe(800)
    expect(
      effectiveActivityLogSteps({ steps: 900, source: 'Manual entry', merge_status: 'superseded_by_wearable' }),
    ).toBe(0)
  })
})

describe('sumStepsFromActivityLogRows', () => {
  it('uses wearable as source of truth when wearable steps > 0 (does not add active manual)', () => {
    const total = sumStepsFromActivityLogRows([
      { id: 'w1', steps: 517, source: 'health_connect' },
      { id: 'm1', steps: 311, source: 'manual', merge_status: 'active' },
      { id: 'm2', steps: 5000, source: 'manual', merge_status: 'superseded_by_wearable' },
    ])
    expect(total).toBe(517)
  })
})

describe('computeActivityTotalsBreakdown', () => {
  it('wearable 517 + manual 311 → total 517, manual not counted', () => {
    const b = computeActivityTotalsBreakdown([
      { id: 'w', steps: 517, source: 'health_connect' },
      { id: 'm', steps: 311, source: 'manual', merge_status: 'active' },
    ])
    expect(b.totalSteps).toBe(517)
    expect(b.wearableSteps).toBe(517)
    expect(b.manualStepsCounted).toBe(0)
    expect(b.manualStepsNotCounted).toBe(311)
    expect(b.sourceOfTruth).toBe('wearable')
  })

  it('wearable 0 + manual 311 → total 311 from manual', () => {
    const b = computeActivityTotalsBreakdown([
      { id: 'm', steps: 311, source: 'manual', merge_status: 'active' },
    ])
    expect(b.totalSteps).toBe(311)
    expect(b.wearableSteps).toBe(0)
    expect(b.manualStepsCounted).toBe(311)
    expect(b.sourceOfTruth).toBe('manual')
  })

  it('dedupes duplicate ids before summing', () => {
    const b = computeActivityTotalsBreakdown([
      { id: 'x', steps: 4000, source: 'health_connect' },
      { id: 'x', steps: 4000, source: 'health_connect' },
      { id: 'm', steps: 100, source: 'manual', merge_status: 'active' },
    ])
    expect(b.totalSteps).toBe(4000)
  })

  it('among health_connect rows with tied sync times, uses higher step total (monotonic day)', () => {
    const b = computeActivityTotalsBreakdown([
      { id: 'a', steps: 4000, source: 'health_connect' },
      { id: 'b', steps: 4632, source: 'health_connect' },
    ])
    expect(b.totalSteps).toBe(4632)
  })

  it('prefers health_connect over a higher google_fit row (same calendar day double-source)', () => {
    const b = computeActivityTotalsBreakdown([
      { id: 'gf', steps: 7438, source: 'google_fit', ts: '2026-05-09T10:00:00.000Z' },
      { id: 'hc', steps: 5921, source: 'health_connect', logged_at: '2026-05-09T20:00:00.000Z' },
    ])
    expect(b.totalSteps).toBe(5921)
  })

  it('within health_connect prefers latest logged_at over a higher stale total', () => {
    const b = computeActivityTotalsBreakdown([
      {
        id: 'old',
        steps: 7438,
        source: 'health_connect',
        logged_at: '2026-05-09T08:00:00.000Z',
      },
      {
        id: 'new',
        steps: 5921,
        source: 'health_connect',
        logged_at: '2026-05-09T18:00:00.000Z',
      },
    ])
    expect(b.totalSteps).toBe(5921)
  })

  it('superseded manual steps appear in manualStepsSuperseded only', () => {
    const b = computeActivityTotalsBreakdown([
      { id: 'm', steps: 200, source: 'manual', merge_status: 'superseded_by_wearable' },
    ])
    expect(b.totalSteps).toBe(0)
    expect(b.manualStepsSuperseded).toBe(200)
  })
})

describe('wearableDeltaSupersedesManual', () => {
  it('returns false for non-positive delta', () => {
    expect(wearableDeltaSupersedesManual(0, 3000)).toBe(false)
    expect(wearableDeltaSupersedesManual(-100, 3000)).toBe(false)
  })

  it('returns false when manual steps zero', () => {
    expect(wearableDeltaSupersedesManual(5000, 0)).toBe(false)
  })

  it('supersedes when delta meets 70% threshold', () => {
    expect(wearableDeltaSupersedesManual(3500, 5000)).toBe(true)
    expect(wearableDeltaSupersedesManual(3499, 5000)).toBe(false)
  })
})
