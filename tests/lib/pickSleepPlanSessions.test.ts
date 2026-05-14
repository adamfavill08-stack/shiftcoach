import { describe, expect, it } from 'vitest'
import { pickSleepPlanSessionsForCivilYmd } from '@/lib/sleep/pickSleepPlanSessions'

function session(id: string, start_at: string, end_at: string) {
  return { id, start_at, end_at, type: 'main_sleep' }
}

describe('pickSleepPlanSessionsForCivilYmd', () => {
  it('does not borrow first-day-off post-night recovery sleep on the second day off', () => {
    const shiftByDate = new Map([
      ['2026-05-10', 'NIGHT'],
      ['2026-05-11', 'OFF'],
      ['2026-05-12', 'OFF'],
    ])
    const recovery = session(
      'recovery',
      '2026-05-11T08:00:00.000Z',
      '2026-05-11T15:08:00.000Z',
    )

    const picked = pickSleepPlanSessionsForCivilYmd(
      '2026-05-12',
      [
        { date: '2026-05-10', sessions: [] },
        { date: '2026-05-11', sessions: [recovery] },
        { date: '2026-05-12', sessions: [] },
      ],
      [],
      { shiftByDate },
    )

    expect(picked).toEqual([])
  })

  it('uses last night sleep for today even when the session is bucketed under yesterday', () => {
    const shiftByDate = new Map([
      ['2026-05-10', 'NIGHT'],
      ['2026-05-11', 'OFF'],
      ['2026-05-12', 'OFF'],
    ])
    const lastNight = session(
      'last-night',
      '2026-05-11T22:30:00.000Z',
      '2026-05-12T06:45:00.000Z',
    )

    const picked = pickSleepPlanSessionsForCivilYmd(
      '2026-05-12',
      [
        { date: '2026-05-11', sessions: [lastNight] },
        { date: '2026-05-12', sessions: [] },
      ],
      [],
      { shiftByDate, timeZone: 'Europe/London' },
    )

    expect(picked).toEqual([lastNight])
  })

  it('still borrows prior sleep on the immediate OFF day after a night shift', () => {
    const shiftByDate = new Map([
      ['2026-05-10', 'NIGHT'],
      ['2026-05-11', 'OFF'],
    ])
    const recovery = session(
      'recovery',
      '2026-05-10T23:00:00.000Z',
      '2026-05-11T07:00:00.000Z',
    )

    const picked = pickSleepPlanSessionsForCivilYmd(
      '2026-05-11',
      [
        { date: '2026-05-10', sessions: [recovery] },
        { date: '2026-05-11', sessions: [] },
      ],
      [],
      { shiftByDate },
    )

    expect(picked).toEqual([recovery])
  })
})
