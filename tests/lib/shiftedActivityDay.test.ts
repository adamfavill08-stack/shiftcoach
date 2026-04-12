import { describe, it, expect } from 'vitest'
import {
  activityDayKeyFromCivilActivityDate,
  activityDayKeyFromTimestamp,
  ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR,
} from '@/lib/activity/shiftedActivityDay'

describe('activityDayKeyFromTimestamp', () => {
  it('uses 7am boundary in the given IANA zone (pre-7am rolls to previous label)', () => {
    const instant = new Date('2025-06-10T01:00:00.000Z')
    const key = activityDayKeyFromTimestamp(instant, 'Europe/London')
    expect(ACTIVITY_INTELLIGENCE_SHIFT_START_HOUR).toBe(7)
    expect(key).toBe('2025-06-09')
  })

  it('after boundary uses same civil date label', () => {
    const instant = new Date('2025-06-10T08:00:00.000Z')
    const key = activityDayKeyFromTimestamp(instant, 'Europe/London')
    expect(key).toBe('2025-06-10')
  })
})

describe('activityDayKeyFromCivilActivityDate', () => {
  it('buckets the logical civil day using local noon, so UTC civil date maps to that shifted day key', () => {
    expect(activityDayKeyFromCivilActivityDate('2025-06-10', 'UTC')).toBe('2025-06-10')
  })
})
