import { describe, expect, it } from 'vitest'
import {
  inferSleepWindowStartAfterShiftEnd,
  nextLocalClockInstantAfterUtcMs,
} from '@/lib/activity/inferSleepWindowStartAfterShiftEnd'

describe('nextLocalClockInstantAfterUtcMs', () => {
  it('returns the next local occurrence strictly after anchor', () => {
    const tz = 'Europe/London'
    const anchor = Date.parse('2026-05-13T07:00:00.000Z')
    const next = nextLocalClockInstantAfterUtcMs(anchor, 8 * 60 + 30, tz)
    expect(next).not.toBeNull()
    expect(next!.getTime()).toBeGreaterThan(anchor)
  })
})

describe('inferSleepWindowStartAfterShiftEnd', () => {
  it('uses median local main-sleep starts when enough logs exist', () => {
    const tz = 'Europe/London'
    const shiftEnd = new Date('2026-05-13T07:00:00.000Z')
    const s1 = new Date('2026-05-10T22:30:00.000Z')
    const s2 = new Date('2026-05-11T22:45:00.000Z')
    const out = inferSleepWindowStartAfterShiftEnd({
      shiftEnd,
      timeZone: tz,
      shiftType: 'day',
      mainSleepStarts: [s1, s2],
    })
    expect(out).not.toBeNull()
    expect(out!.getTime()).toBeGreaterThan(shiftEnd.getTime())
  })

  it('falls back to 08:30 local heuristic for night shift when no logs', () => {
    const tz = 'Europe/London'
    const shiftEnd = new Date('2026-05-13T07:00:00.000Z')
    const out = inferSleepWindowStartAfterShiftEnd({
      shiftEnd,
      timeZone: tz,
      shiftType: 'night',
      mainSleepStarts: [],
    })
    expect(out).not.toBeNull()
    expect(out!.getTime()).toBeGreaterThan(shiftEnd.getTime())
  })

  it('returns null when shift end is missing', () => {
    expect(
      inferSleepWindowStartAfterShiftEnd({
        shiftEnd: null,
        timeZone: 'UTC',
        shiftType: 'day',
        mainSleepStarts: [],
      }),
    ).toBeNull()
  })
})
