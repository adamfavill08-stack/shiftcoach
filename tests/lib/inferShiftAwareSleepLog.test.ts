import { describe, expect, it } from 'vitest'
import { inferShiftAwareSleepLog } from '@/lib/sleep/inferShiftAwareSleepLog'

describe('inferShiftAwareSleepLog', () => {
  it('suggests post-shift sleep for a morning recovery sleep after a night, even when wake day is OFF', () => {
    const result = inferShiftAwareSleepLog({
      startAt: '2026-05-11T08:30:00.000Z',
      endAt: '2026-05-11T15:00:00.000Z',
      timeZone: 'Europe/London',
      shifts: [
        {
          date: '2026-05-10',
          label: 'NIGHT',
          start_ts: '2026-05-10T18:00:00.000Z',
          end_ts: '2026-05-10T06:00:00.000Z',
        },
        { date: '2026-05-11', label: 'OFF', start_ts: null, end_ts: null },
      ],
    })

    expect(result.suggestedType).toBe('post_shift_sleep')
    expect(result.reason).toBe('post_night')
    expect(result.linkedShift?.date).toBe('2026-05-10')
    expect(result.warning).toBe('off_day_after_night')
  })

  it('suggests a nap for short sleep before an upcoming night shift', () => {
    const result = inferShiftAwareSleepLog({
      startAt: '2026-05-12T15:30:00.000Z',
      endAt: '2026-05-12T16:20:00.000Z',
      timeZone: 'Europe/London',
      shifts: [
        {
          date: '2026-05-12',
          label: 'NIGHT',
          start_ts: '2026-05-12T18:00:00.000Z',
          end_ts: '2026-05-13T06:00:00.000Z',
        },
      ],
    })

    expect(result.suggestedType).toBe('nap')
    expect(result.reason).toBe('pre_night_nap')
    expect(result.nextShift?.label).toBe('NIGHT')
  })
})
