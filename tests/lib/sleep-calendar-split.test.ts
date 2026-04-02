import { describe, it, expect } from 'vitest'
import {
  splitSleepMinutesAcrossLocalDays,
  formatYmdInTimeZone,
  startOfLocalDayUtcMs,
} from '@/lib/sleep/utils'

describe('splitSleepMinutesAcrossLocalDays', () => {
  it('splits at UTC midnight', () => {
    const tz = 'UTC'
    const start = new Date('2025-01-06T22:00:00.000Z')
    const end = new Date('2025-01-07T06:00:00.000Z')
    const m = splitSleepMinutesAcrossLocalDays(start, end, tz)
    expect(m.get('2025-01-06')).toBe(120)
    expect(m.get('2025-01-07')).toBe(360)
  })

  it('finds next calendar day after anchor (boundary finder)', () => {
    const tz = 'America/New_York'
    const anchor = new Date('2025-06-15T12:00:00').getTime()
    const y0 = formatYmdInTimeZone(new Date(anchor), tz)
    let next = anchor + 1
    let found = false
    for (let i = 0; i < 2000; i++) {
      if (formatYmdInTimeZone(new Date(next), tz) !== y0) {
        found = true
        break
      }
      next += 60000
    }
    expect(found).toBe(true)
    const m = splitSleepMinutesAcrossLocalDays(
      new Date('2025-06-15T23:00:00'),
      new Date('2025-06-16T07:00:00'),
      tz,
    )
    const jun15 = m.get('2025-06-15')
    const jun16 = m.get('2025-06-16')
    expect((jun15 ?? 0) + (jun16 ?? 0)).toBe(8 * 60)
  })

  it('startOfLocalDayUtcMs matches UTC midnight for UTC zone', () => {
    const ms = startOfLocalDayUtcMs('2025-01-15', 'UTC')
    expect(formatYmdInTimeZone(new Date(ms), 'UTC')).toBe('2025-01-15')
    expect(ms).toBe(Date.UTC(2025, 0, 15, 0, 0, 0))
  })
})
