import { describe, it, expect } from 'vitest'
import {
  computeActivityIntelligence,
  ACTIVITY_BASELINE_LOOKBACK_DAYS,
} from '@/lib/activity/activityIntelligence'

describe('computeActivityIntelligence (shift-aware keys)', () => {
  const key = '2025-06-15'

  it('returns insufficient_data when no past anchored days with steps', () => {
    const r = computeActivityIntelligence({
      currentActivityDayKey: key,
      stepsByActivityDay: { [key]: 5000 },
      weeklyDeficitHours: null,
      activityTimeZone: 'Europe/London',
    })
    expect(r.baselineSteps).toBeNull()
    expect(r.activityStatus).toBe('insufficient_data')
    expect(r.readinessHint).toBeNull()
    expect(r.activityDaySteps).toBe(5000)
    expect(r.activityDayKey).toBe(key)
    expect(r.activityTimeZone).toBe('Europe/London')
  })

  it('median baseline from past anchored days and near status', () => {
    const stepsByActivityDay: Record<string, number> = {
      '2025-06-10': 8000,
      '2025-06-11': 10000,
      '2025-06-12': 9000,
      '2025-06-13': 10000,
      '2025-06-14': 9000,
      [key]: 9500,
    }
    const r = computeActivityIntelligence({
      currentActivityDayKey: key,
      stepsByActivityDay,
      weeklyDeficitHours: 1,
      activityTimeZone: 'UTC',
    })
    expect(r.baselineSteps).toBe(9000)
    expect(r.activityDaySteps).toBe(9500)
    expect(r.deltaVsBaseline).toBe(500)
    expect(r.activityStatus).toBe('near')
    expect(r.readinessHint).toBe('steady')
  })

  it('well_below when activity day is far under baseline', () => {
    const r = computeActivityIntelligence({
      currentActivityDayKey: key,
      stepsByActivityDay: {
        '2025-06-14': 10000,
        [key]: 4000,
      },
      weeklyDeficitHours: 0,
      activityTimeZone: 'UTC',
    })
    expect(r.baselineSteps).toBe(10000)
    expect(r.activityStatus).toBe('well_below')
    expect(r.lowActivityDay).toBe(true)
  })

  it('rest hint when high sleep debt and low movement', () => {
    const r = computeActivityIntelligence({
      currentActivityDayKey: key,
      stepsByActivityDay: {
        '2025-06-14': 10000,
        [key]: 5000,
      },
      weeklyDeficitHours: 6,
      activityTimeZone: 'UTC',
    })
    expect(r.readinessHint).toBe('rest')
  })

  it('ignores anchored days outside lookback window', () => {
    const r = computeActivityIntelligence({
      currentActivityDayKey: key,
      stepsByActivityDay: {
        '2025-05-01': 500,
        '2025-06-14': 8000,
        [key]: 8000,
      },
      weeklyDeficitHours: null,
      activityTimeZone: 'UTC',
    })
    expect(r.baselineDaysUsed).toBe(1)
    expect(r.baselineSteps).toBe(8000)
  })

  it('exports lookback constant for docs', () => {
    expect(ACTIVITY_BASELINE_LOOKBACK_DAYS).toBe(14)
  })
})
