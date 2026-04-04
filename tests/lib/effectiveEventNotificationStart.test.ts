import { describe, expect, it } from 'vitest'
import {
  effectiveEventNotificationStart,
  findShiftWindowOverlappingNow,
  isWholeDayRotaEvent,
} from '@/lib/notifications/effectiveEventNotificationStart'

describe('isWholeDayRotaEvent', () => {
  it('is true for all_day', () => {
    expect(isWholeDayRotaEvent({ all_day: true })).toBe(true)
  })
  it('is true for holiday type', () => {
    expect(isWholeDayRotaEvent({ type: 'holiday' })).toBe(true)
  })
  it('is false for timed work event', () => {
    expect(isWholeDayRotaEvent({ all_day: false, type: 'other' })).toBe(false)
  })
})

describe('findShiftWindowOverlappingNow', () => {
  it('returns shift when now is between start and end', () => {
    const now = new Date('2026-01-01T03:00:00.000Z')
    const days = [
      {
        start_ts: '2025-12-31T19:00:00.000Z',
        end_ts: '2026-01-01T07:00:00.000Z',
      },
    ]
    const w = findShiftWindowOverlappingNow(days, now, 0)
    expect(w).not.toBeNull()
    expect(w!.end.toISOString()).toBe('2026-01-01T07:00:00.000Z')
  })
})

describe('effectiveEventNotificationStart', () => {
  it('uses shift end when holiday midnight falls during an overnight shift', () => {
    const now = new Date('2025-12-31T22:00:00.000Z')
    const holidayStart = new Date('2026-01-01T00:00:00.000Z')
    const shift = {
      start: new Date('2025-12-31T19:00:00.000Z'),
      end: new Date('2026-01-01T07:00:00.000Z'),
    }
    const effective = effectiveEventNotificationStart(holidayStart, now, { all_day: true, type: 'holiday' }, shift)
    expect(effective.toISOString()).toBe('2026-01-01T07:00:00.000Z')
  })

  it('does not adjust timed events', () => {
    const now = new Date('2025-12-31T22:00:00.000Z')
    const meetingStart = new Date('2026-01-01T14:00:00.000Z')
    const shift = {
      start: new Date('2025-12-31T19:00:00.000Z'),
      end: new Date('2026-01-01T07:00:00.000Z'),
    }
    const effective = effectiveEventNotificationStart(meetingStart, now, { all_day: false, type: 'other' }, shift)
    expect(effective).toEqual(meetingStart)
  })

  it('does not adjust when nominal start is before shift (e.g. day off at midnight before day shift)', () => {
    const now = new Date('2026-01-01T10:00:00.000Z')
    const holidayMidnight = new Date('2026-01-01T00:00:00.000Z')
    const dayShift = {
      start: new Date('2026-01-01T07:00:00.000Z'),
      end: new Date('2026-01-01T19:00:00.000Z'),
    }
    const effective = effectiveEventNotificationStart(holidayMidnight, now, { all_day: true }, dayShift)
    expect(effective).toEqual(holidayMidnight)
  })
})
