import { describe, expect, it } from 'vitest'
import {
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
  it('sums wearable plus active manual and skips superseded manual', () => {
    const total = sumStepsFromActivityLogRows([
      { steps: 4000, source: 'health_connect' },
      { steps: 1000, source: 'manual', merge_status: 'active' },
      { steps: 5000, source: 'manual', merge_status: 'superseded_by_wearable' },
    ])
    expect(total).toBe(5000)
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
