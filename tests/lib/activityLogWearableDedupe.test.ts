import { describe, it, expect } from 'vitest'
import {
  buildExplicitWearableShiftedKeysByFamily,
  filterActivityLogRowsForWearableDedupe,
  shouldSkipLegacyWearableActivityLogRow,
} from '@/lib/activity/activityLogWearableDedupe'
import { activityDayKeyFromCivilActivityDate } from '@/lib/activity/shiftedActivityDay'

describe('activityLogWearableDedupe', () => {
  it('drops legacy Health Connect row when explicit activity_date row covers the same shifted key', () => {
    const tz = 'UTC'
    const ymd = '2025-06-10'
    const explicitKey = activityDayKeyFromCivilActivityDate(ymd, tz)
    const logs = [
      { steps: 8000, source: 'Health Connect', activity_date: ymd, ts: '2025-06-10T18:00:00.000Z' },
      { steps: 8000, source: 'Health Connect', activity_date: null, ts: '2025-06-10T12:00:00.000Z' },
    ]
    const map = buildExplicitWearableShiftedKeysByFamily(logs, tz)
    expect(map.get('health_connect')?.has(explicitKey)).toBe(true)
    expect(shouldSkipLegacyWearableActivityLogRow(logs[1], tz, map)).toBe(true)
    expect(shouldSkipLegacyWearableActivityLogRow(logs[0], tz, map)).toBe(false)
    const kept = filterActivityLogRowsForWearableDedupe(logs, tz)
    expect(kept).toHaveLength(1)
    expect(kept[0].activity_date).toBe(ymd)
  })

  it('does not skip manual entry legacy rows', () => {
    const tz = 'UTC'
    const ymd = '2025-06-10'
    const logs = [
      { steps: 5000, source: 'Health Connect', activity_date: ymd, ts: '2025-06-10T18:00:00.000Z' },
      { steps: 1000, source: 'Manual entry', activity_date: null, ts: '2025-06-10T12:00:00.000Z' },
    ]
    const map = buildExplicitWearableShiftedKeysByFamily(logs, tz)
    expect(shouldSkipLegacyWearableActivityLogRow(logs[1], tz, map)).toBe(false)
    expect(filterActivityLogRowsForWearableDedupe(logs, tz)).toHaveLength(2)
  })
})
