import { describe, expect, it } from 'vitest'
import {
  buildMinimalConsecutiveOffSleepPlan,
  buildNormalDayOffSleepPlan,
  consecutiveOffDaysEndingOn,
  consecutiveRosterRestDaysEndingOn,
  isCivilDateOff,
  isRosterRestDay,
  shouldUseNormalDayOffSleepPlan,
} from '@/lib/sleep/dayOffSleepPlan'
import type { ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import type { ShiftInstant } from '@/lib/sleep/nightShiftSleepPlan'
import { resolveRotaContextForSleepPlan } from '@/lib/sleep/resolveRotaForSleepPlan'
import { localMinutesFromMidnight } from '@/lib/sleep/sleepShiftWallClock'

describe('normal day-off sleep plan', () => {
  it('uses today and tonight for a second-day-off sleep that started yesterday before midnight', () => {
    const plan = buildNormalDayOffSleepPlan({
      scopeYmd: '2026-05-12',
      sessions: [
        {
          start_at: '2026-05-11T21:30:00.000Z',
          end_at: '2026-05-12T05:45:00.000Z',
          type: 'main_sleep',
        },
      ],
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      timeZone: 'Europe/London',
      nextShift: null,
      commuteMinutes: 25,
    })

    expect(plan).not.toBeNull()
    expect(plan!.transition).toBe('other')
    expect(plan!.suggestedSleepWindowKind).toBe('off_day_overnight_recovery')
    expect(plan!.transitionSummaryKey).toBe('sleepPlan.transition.day_off_normal')
    expect(new Date(plan!.suggestedSleepStartMs!).toISOString()).toBe('2026-05-12T21:30:00.000Z')
    expect(new Date(plan!.suggestedSleepEndMs!).toISOString()).toBe('2026-05-13T04:30:00.000Z')
  })

  it('does not anchor second-day-off sleep to daytime post-night recovery start (uses default evening bed)', () => {
    const plan = buildNormalDayOffSleepPlan({
      scopeYmd: '2026-05-12',
      sessions: [
        {
          start_at: '2026-05-12T10:50:00.000Z',
          end_at: '2026-05-12T17:58:00.000Z',
          type: 'main_sleep',
        },
      ],
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      timeZone: 'Europe/London',
      nextShift: null,
      commuteMinutes: 25,
    })

    expect(plan).not.toBeNull()
    expect(plan!.suggestedSleepWindowKind).toBe('off_day_overnight_recovery')
    expect(new Date(plan!.suggestedSleepStartMs!).toISOString()).toBe('2026-05-12T21:30:00.000Z')
    expect(new Date(plan!.suggestedSleepEndMs!).toISOString()).toBe('2026-05-13T04:30:00.000Z')
  })

  it('does not use a morning main-sleep start (e.g. 08:00 local) as the next civil bedtime anchor', () => {
    const plan = buildNormalDayOffSleepPlan({
      scopeYmd: '2026-05-12',
      sessions: [
        {
          start_at: '2026-05-12T07:00:00.000Z',
          end_at: '2026-05-12T11:00:00.000Z',
          type: 'main_sleep',
        },
      ],
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      timeZone: 'Europe/London',
      nextShift: null,
      commuteMinutes: 25,
    })
    expect(plan).not.toBeNull()
    expect(new Date(plan!.suggestedSleepStartMs!).toISOString()).toBe('2026-05-12T21:30:00.000Z')
  })

  it('with no next shift, clamps habit-derived bed wall before 17:00 local to default evening (long overnight block)', () => {
    const tz = 'Europe/London'
    const plan = buildNormalDayOffSleepPlan({
      scopeYmd: '2026-05-14',
      sessions: [
        {
          start_at: '2026-05-14T01:30:00.000Z',
          end_at: '2026-05-15T04:00:00.000Z',
          type: 'main_sleep',
        },
      ],
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      timeZone: tz,
      nextShift: null,
      commuteMinutes: 25,
    })
    expect(plan).not.toBeNull()
    const startMs = plan!.suggestedSleepStartMs!
    expect(localMinutesFromMidnight(startMs, tz)).toBeGreaterThanOrEqual(17 * 60)
    expect(new Date(startMs).toISOString()).toBe('2026-05-15T21:30:00.000Z')
  })

  it('classifies rest day before a night shift as pre-night preparation', () => {
    const nextNight: ShiftInstant = {
      label: 'NIGHT',
      date: '2026-05-13',
      startMs: Date.parse('2026-05-12T20:00:00.000Z'),
      endMs: Date.parse('2026-05-13T08:00:00.000Z'),
    }
    const plan = buildNormalDayOffSleepPlan({
      scopeYmd: '2026-05-12',
      sessions: [
        {
          start_at: '2026-05-11T21:30:00.000Z',
          end_at: '2026-05-12T05:45:00.000Z',
          type: 'main_sleep',
        },
      ],
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      timeZone: 'Europe/London',
      nextShift: nextNight,
      commuteMinutes: 25,
    })
    expect(plan).not.toBeNull()
    expect(plan!.suggestedSleepWindowKind).toBe('pre_night_shift_preparation')
    expect(plan!.transitionSummaryKey).toBe('sleepPlan.transition.dayOffBeforeNight')
  })

  it('buildMinimalConsecutiveOffSleepPlan works without a logged primary sleep row', () => {
    const plan = buildMinimalConsecutiveOffSleepPlan({
      scopeYmd: '2026-05-12',
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      timeZone: 'Europe/London',
      nextShift: null,
      commuteMinutes: 25,
      nowMs: Date.parse('2026-05-12T08:00:00.000Z'),
    })
    expect(plan.ok).toBe(true)
    expect(plan.suggestedSleepWindowKind).toBe('off_day_overnight_recovery')
    expect(new Date(plan.suggestedSleepStartMs!).toISOString()).toBe('2026-05-12T21:30:00.000Z')
  })

  it('second civil day off with sparse map (no rows for off dates) still enables consecutive-off mode', () => {
    const shifts: ShiftRowInput[] = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T18:00:00.000Z',
        end_ts: '2026-05-11T06:00:00.000Z',
      },
    ]
    const map = new Map<string, string>([['2026-05-10', 'NIGHT']])

    expect(shouldUseNormalDayOffSleepPlan('2026-05-11', map, shifts, 'Europe/London')).toBe(false)
    expect(shouldUseNormalDayOffSleepPlan('2026-05-12', map, shifts, 'Europe/London')).toBe(false)
    expect(shouldUseNormalDayOffSleepPlan('2026-05-13', map, shifts, 'Europe/London')).toBe(true)
    expect(consecutiveOffDaysEndingOn('2026-05-13', map, shifts, 'Europe/London')).toBeGreaterThanOrEqual(2)
  })

  it('does not treat a civil date as off when overnight work overlaps that local calendar day', () => {
    const shifts: ShiftRowInput[] = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T18:00:00.000Z',
        end_ts: '2026-05-11T06:00:00.000Z',
      },
    ]
    const map = new Map<string, string>([
      ['2026-05-10', 'NIGHT'],
      ['2026-05-11', 'OFF'],
    ])
    expect(isCivilDateOff('2026-05-11', map, shifts, 'Europe/London')).toBe(false)
  })

  it('second roster OFF after a night enables normal plan even when the first OFF date is not civil-off (overnight overlap)', () => {
    const shifts: ShiftRowInput[] = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T18:00:00.000Z',
        end_ts: '2026-05-11T06:00:00.000Z',
      },
      { date: '2026-05-11', label: 'OFF', start_ts: null, end_ts: null },
      { date: '2026-05-12', label: 'OFF', start_ts: null, end_ts: null },
    ]
    const map = new Map([
      ['2026-05-10', 'NIGHT'],
      ['2026-05-11', 'OFF'],
      ['2026-05-12', 'OFF'],
    ])
    expect(isCivilDateOff('2026-05-11', map, shifts, 'Europe/London')).toBe(false)
    expect(isRosterRestDay('2026-05-11', map, shifts, 'Europe/London')).toBe(true)
    expect(consecutiveOffDaysEndingOn('2026-05-12', map, shifts, 'Europe/London')).toBe(1)
    expect(consecutiveRosterRestDaysEndingOn('2026-05-12', map, shifts, 'Europe/London')).toBe(2)
    expect(shouldUseNormalDayOffSleepPlan('2026-05-11', map, shifts, 'Europe/London')).toBe(false)
    expect(shouldUseNormalDayOffSleepPlan('2026-05-12', map, shifts, 'Europe/London')).toBe(true)
  })

  it('only switches to normal day-off mode after at least one OFF day has already happened', () => {
    const shifts = new Map([
      ['2026-05-10', 'NIGHT'],
      ['2026-05-11', 'OFF'],
      ['2026-05-12', 'OFF'],
    ])

    expect(shouldUseNormalDayOffSleepPlan('2026-05-11', shifts)).toBe(false)
    expect(shouldUseNormalDayOffSleepPlan('2026-05-12', shifts)).toBe(true)
  })

  it('does not anchor a normal off-night sleep back to the final night shift', () => {
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: '2026-05-11T21:30:00.000Z',
          end_at: '2026-05-12T05:45:00.000Z',
          type: 'main_sleep',
        },
      ],
      [
        {
          date: '2026-05-10',
          label: 'NIGHT',
          start_ts: '2026-05-10T18:00:00.000Z',
          end_ts: '2026-05-11T06:00:00.000Z',
        },
        { date: '2026-05-11', label: 'OFF', start_ts: null, end_ts: null },
        { date: '2026-05-12', label: 'OFF', start_ts: null, end_ts: null },
      ],
      { timeZone: 'Europe/London' },
    )

    expect(ctx.state).toBe('ok')
    if (ctx.state === 'ok') {
      expect(ctx.restAnchorSynthetic).toBe(true)
      expect(ctx.shiftJustEnded.label).toMatch(/off/i)
    }
  })
})
