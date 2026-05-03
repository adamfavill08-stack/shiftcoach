import { describe, expect, it } from 'vitest'
import { parseManualHistoryResponse } from '@/lib/activity/manualHistoryApi'

describe('parseManualHistoryResponse', () => {
  it('parses entries and coerces string steps', () => {
    const out = parseManualHistoryResponse({
      date: '2026-05-01',
      entries: [{ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', steps: '4200', merge_status: null }],
    })
    expect(out).not.toBeNull()
    expect(out!.date).toBe('2026-05-01')
    expect(out!.entries).toHaveLength(1)
    expect(out!.entries[0]!.steps).toBe(4200)
  })

  it('defaults missing entries to empty array', () => {
    const out = parseManualHistoryResponse({ date: '2026-05-02' })
    expect(out).not.toBeNull()
    expect(out!.entries).toEqual([])
  })

  it('trims date', () => {
    const out = parseManualHistoryResponse({ date: '  2026-05-03  ', entries: [] })
    expect(out).not.toBeNull()
    expect(out!.date).toBe('2026-05-03')
  })

  it('parses activityTotalsBreakdown when present', () => {
    const out = parseManualHistoryResponse({
      date: '2026-05-04',
      entries: [],
      activityTotalsBreakdown: {
        totalSteps: 517,
        wearableSteps: 517,
        manualStepsCounted: 0,
        manualStepsNotCounted: 311,
        manualStepsSuperseded: 0,
        sourceOfTruth: 'wearable',
      },
    })
    expect(out!.activityTotalsBreakdown?.totalSteps).toBe(517)
    expect(out!.activityTotalsBreakdown?.sourceOfTruth).toBe('wearable')
    expect(out!.activityTotalsBreakdown?.manualStepsNotCounted).toBe(311)
  })
})
