import { describe, it, expect } from 'vitest'
import {
  getHydrationDayWindow,
  hydrationDayKeyFromTimestamp,
  startOfHydrationDayUtcMsForKey,
} from '@/lib/hydration/hydrationDayWindow'

describe('hydrationDayWindow (05:00 local rollover)', () => {
  it('labels 03:00 UTC May 10 as previous civil day in UTC zone (hour < 5)', () => {
    const tz = 'UTC'
    const instant = new Date('2026-05-10T03:00:00.000Z')
    expect(hydrationDayKeyFromTimestamp(instant, tz)).toBe('2026-05-09')
  })

  it('window for that instant spans May 9 05:00Z to May 10 05:00Z', () => {
    const tz = 'UTC'
    const instant = new Date('2026-05-10T03:00:00.000Z')
    const { start, end, dayKey } = getHydrationDayWindow(instant, tz)
    expect(dayKey).toBe('2026-05-09')
    expect(start.toISOString()).toBe('2026-05-09T05:00:00.000Z')
    expect(end.toISOString()).toBe('2026-05-10T05:00:00.000Z')
  })

  it('startOfHydrationDayUtcMsForKey returns 05:00 on that civil date in UTC', () => {
    const ms = startOfHydrationDayUtcMsForKey('2026-05-09', 'UTC')
    expect(new Date(ms).toISOString()).toBe('2026-05-09T05:00:00.000Z')
  })
})
