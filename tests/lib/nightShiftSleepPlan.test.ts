import { describe, it, expect } from 'vitest'
import {
  caffeineOffsetBeforeSleep,
  computeNightShiftSleepPlan,
  DAY_MINUTES,
  fmtClock,
  parseToMinutes,
  POST_DAY_BEFORE_NIGHT_MIN_REST_MS,
  PRE_NIGHT_NAP_DURATION_MS,
  PRE_NIGHT_NAP_WAKE_BEFORE_SHIFT_MS,
  PREP_BEFORE_NEXT_SHIFT,
  WIND_DOWN_MINUTES,
} from '@/lib/sleep/nightShiftSleepPlan'
import { resolveRotaContextForSleepPlan } from '@/lib/sleep/resolveRotaForSleepPlan'
import {
  eveningBedFloorYmd,
  EVENING_MAIN_BED_FLOOR_MINUTES_DEFAULT,
  EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED,
  SHIFT_END_TO_NIGHT_START_FOR_PREFERRED_FLOOR_MS,
  utcMsAtLocalWallOnDate,
} from '@/lib/sleep/sleepShiftWallClock'

const H = 60 * 60 * 1000

describe('parseToMinutes / fmtClock', () => {
  it('parses wall times', () => {
    expect(parseToMinutes('22:00')).toBe(22 * 60)
    expect(parseToMinutes('7:05')).toBe(7 * 60 + 5)
    expect(parseToMinutes('bad')).toBeNull()
  })

  it('formats clock and next-day hint', () => {
    expect(fmtClock(22 * 60)).toBe('22:00')
    expect(fmtClock(DAY_MINUTES + 30)).toBe('00:30')
  })
})

describe('caffeineOffsetBeforeSleep', () => {
  it('maps sensitivity to minutes', () => {
    expect(caffeineOffsetBeforeSleep('low')).toBe(4 * 60)
    expect(caffeineOffsetBeforeSleep('medium')).toBe(6 * 60)
    expect(caffeineOffsetBeforeSleep('high')).toBe(8 * 60)
  })
})

describe('computeNightShiftSleepPlan', () => {
  it('fits sleep between shift end + wind-down and next shift prep', () => {
    const t0 = Date.parse('2026-05-01T22:00:00.000Z')
    const shiftEnd = t0 + 9 * H
    const nextStart = shiftEnd + 14 * H
    const sleepStart = shiftEnd + 45 * 60 * 1000 + WIND_DOWN_MINUTES * 60 * 1000 + 30 * 60 * 1000
    const sleepEnd = sleepStart + 7 * H

    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-05-01', startMs: t0, endMs: shiftEnd },
      nextShift: { label: 'NIGHT', date: '2026-05-02', startMs: nextStart, endMs: nextStart + 9 * H },
      commuteMinutes: 30,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
    })

    expect(plan.ok).toBe(true)
    expect(plan.transition).toBe('night_to_night')
    expect(plan.suggestedSleepEndMs).not.toBeNull()
    expect(plan.suggestedSleepStartMs).not.toBeNull()
    expect(plan.modelSleepMs).toBeGreaterThan(0)
    expect(plan.caffeineCutoffMs).not.toBeNull()
    if (plan.suggestedSleepStartMs && plan.caffeineCutoffMs) {
      expect(plan.caffeineCutoffMs).toBeLessThanOrEqual(plan.suggestedSleepStartMs - 6 * H + 1)
    }
  })

  it('flags wake close to next shift when buffer is tight', () => {
    const shiftStart = Date.parse('2026-06-01T22:00:00.000Z')
    const shiftEnd = shiftStart + 10 * H
    const nextStart = Date.parse('2026-06-02T12:00:00.000Z')
    const nextEnd = Date.parse('2026-06-02T20:00:00.000Z')
    const sleepStart = shiftEnd + 30 * 60 * 1000 + WIND_DOWN_MINUTES * 60 * 1000
    const sleepEnd = nextStart - (PREP_BEFORE_NEXT_SHIFT + 20) * 60 * 1000

    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-06-01', startMs: shiftStart, endMs: shiftEnd },
      nextShift: { label: 'DAY', date: '2026-06-02', startMs: nextStart, endMs: nextEnd },
      commuteMinutes: 20,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'high',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
    })

    expect(plan.transition).toBe('night_to_day')
    expect(plan.feedback.some((f) => f.code === 'wake_close_next_shift')).toBe(true)
  })

  it('detects sleep overlapping prior shift', () => {
    const shiftStart = Date.parse('2026-07-01T20:00:00.000Z')
    const shiftEnd = shiftStart + 9 * H
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-07-01', startMs: shiftStart, endMs: shiftEnd },
      nextShift: { label: 'DAY', date: '2026-07-02', startMs: shiftEnd + 20 * H, endMs: shiftEnd + 28 * H },
      commuteMinutes: 15,
      targetSleepMinutes: 6 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: shiftStart + 2 * H, endMs: shiftEnd + 1 * H },
      loggedNaps: [],
    })
    expect(plan.feedback.some((f) => f.code === 'overlap_shift')).toBe(true)
  })

  it('dayish → next-calendar-day night: evening floor (not shift-end rush) plus pre-night nap from next shift start', () => {
    const dayEnd = Date.parse('2026-05-11T17:00:00.000Z')
    const dayStart = dayEnd - 8 * H
    const nextNightStart = Date.parse('2026-05-12T22:00:00.000Z')
    const commute = 30
    const commuteMs = commute * 60 * 1000
    const wind = WIND_DOWN_MINUTES * 60 * 1000
    const homePlusWind = dayEnd + commuteMs + wind
    const socialEarliest = dayEnd + POST_DAY_BEFORE_NIGHT_MIN_REST_MS
    const gapToNight = nextNightStart - dayEnd
    const ymd = eveningBedFloorYmd(dayEnd, nextNightStart, 'UTC')
    const wallMin =
      gapToNight >= SHIFT_END_TO_NIGHT_START_FOR_PREFERRED_FLOOR_MS
        ? EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED
        : EVENING_MAIN_BED_FLOOR_MINUTES_DEFAULT
    const eveningUtc = utcMsAtLocalWallOnDate(ymd, wallMin, 'UTC', dayEnd + Math.floor(gapToNight / 2))
    expect(eveningUtc).not.toBeNull()
    const expectedEarliest = Math.max(homePlusWind, socialEarliest, eveningUtc!)
    const latestWake = nextNightStart - PREP_BEFORE_NEXT_SHIFT * 60 * 1000 - commuteMs
    const modelTargetH = 8

    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'DAY', date: '2026-05-11', startMs: dayStart, endMs: dayEnd },
      nextShift: { label: 'NIGHT', date: '2026-05-12', startMs: nextNightStart, endMs: nextNightStart + 9 * H },
      commuteMinutes: commute,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: expectedEarliest + H, endMs: expectedEarliest + 8 * H },
      loggedNaps: [],
      timeZone: 'UTC',
    })

    expect(plan.suggestedSleepStartMs).toBe(expectedEarliest)
    expect(plan.suggestedSleepEndMs).toBe(Math.min(expectedEarliest + modelTargetH * H, latestWake))
    expect(plan.transition).toBe('dayish_work_to_night')
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.preNightEvening')
    expect(plan.suggestedSleepStartMs!).toBeGreaterThanOrEqual(eveningUtc!)
    expect(plan.suggestedSleepStartMs!).toBeLessThan(Date.parse('2026-05-12T12:00:00.000Z'))
    expect(plan.napSuggested).toBe(true)
    expect(plan.napWindowEndMs).toBe(nextNightStart - PRE_NIGHT_NAP_WAKE_BEFORE_SHIFT_MS)
    expect(plan.napWindowStartMs).toBe(plan.napWindowEndMs! - PRE_NIGHT_NAP_DURATION_MS)
  })

  it('long day (09–19) → night next day: main sleep respects evening floor and nap uses next shift start', () => {
    const dayStart = Date.parse('2026-05-11T09:00:00.000Z')
    const dayEnd = Date.parse('2026-05-11T19:00:00.000Z')
    const nextNightStart = Date.parse('2026-05-12T22:00:00.000Z')
    const tz = 'UTC'
    const gapToNight = nextNightStart - dayEnd
    const ymd = eveningBedFloorYmd(dayEnd, nextNightStart, tz)
    const wallMin =
      gapToNight >= SHIFT_END_TO_NIGHT_START_FOR_PREFERRED_FLOOR_MS
        ? EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED
        : EVENING_MAIN_BED_FLOOR_MINUTES_DEFAULT
    const eveningUtc = utcMsAtLocalWallOnDate(ymd, wallMin, tz, dayEnd + Math.floor(gapToNight / 2))
    expect(eveningUtc).not.toBeNull()
    const commute = 25
    const commuteMs = commute * 60 * 1000
    const homePlusWind = dayEnd + commuteMs + WIND_DOWN_MINUTES * 60 * 1000
    const socialEarliest = dayEnd + POST_DAY_BEFORE_NIGHT_MIN_REST_MS
    const expectedEarliest = Math.max(homePlusWind, socialEarliest, eveningUtc!)
    const latestWake = nextNightStart - PREP_BEFORE_NEXT_SHIFT * 60 * 1000 - commuteMs
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'DAY', date: '2026-05-11', startMs: dayStart, endMs: dayEnd },
      nextShift: { label: 'NIGHT', date: '2026-05-12', startMs: nextNightStart, endMs: nextNightStart + 9 * H },
      commuteMinutes: commute,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: expectedEarliest + 30 * 60 * 1000, endMs: expectedEarliest + 8 * H },
      loggedNaps: [],
      timeZone: tz,
    })
    expect(plan.transition).toBe('dayish_work_to_night')
    expect(plan.suggestedSleepStartMs).toBe(expectedEarliest)
    expect(plan.suggestedSleepStartMs).toBeGreaterThanOrEqual(eveningUtc!)
    expect(plan.napSuggested).toBe(true)
    expect(plan.napWindowEndMs).toBe(nextNightStart - PRE_NIGHT_NAP_WAKE_BEFORE_SHIFT_MS)
  })

  it('same local day day → night: tight recovery warning and nap before main when needed', () => {
    const dayStart = Date.parse('2026-05-11T09:00:00.000Z')
    const dayEnd = Date.parse('2026-05-11T15:00:00.000Z')
    const nightStart = Date.parse('2026-05-11T22:00:00.000Z')
    const commute = 0
    const commuteMs = 0
    const homePlusWind = dayEnd + commuteMs + WIND_DOWN_MINUTES * 60 * 1000
    const socialEarliest = dayEnd + POST_DAY_BEFORE_NIGHT_MIN_REST_MS
    const expectedEarliest = Math.max(homePlusWind, socialEarliest)
    const latestWake = nightStart - PREP_BEFORE_NEXT_SHIFT * 60 * 1000 - commuteMs
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'DAY', date: '2026-05-11', startMs: dayStart, endMs: dayEnd },
      nextShift: { label: 'NIGHT', date: '2026-05-11', startMs: nightStart, endMs: nightStart + 9 * H },
      commuteMinutes: commute,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: expectedEarliest + 15 * 60 * 1000, endMs: expectedEarliest + 6 * H },
      loggedNaps: [],
      timeZone: 'UTC',
    })
    expect(plan.feedback.some((f) => f.code === 'tight_recovery_before_night')).toBe(true)
    expect(plan.napSuggested).toBe(true)
    expect(plan.napWindowEndMs).not.toBeNull()
    expect(plan.napWindowStartMs).not.toBeNull()
    expect(plan.napWindowEndMs!).toBeLessThanOrEqual(plan.suggestedSleepStartMs! - 15 * 60 * 1000)
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.preNightNapBeforeMain')
  })

  it('high sleep debt relaxes evening floor (earlier main start than default wall)', () => {
    const dayEnd = Date.parse('2026-05-11T17:00:00.000Z')
    const dayStart = dayEnd - 8 * H
    const nextNightStart = Date.parse('2026-05-12T22:00:00.000Z')
    const commute = 30
    const commuteMs = commute * 60 * 1000
    const wind = WIND_DOWN_MINUTES * 60 * 1000
    const homePlusWind = dayEnd + commuteMs + wind
    const socialEarliest = dayEnd + POST_DAY_BEFORE_NIGHT_MIN_REST_MS
    const debtEarliest = Math.max(homePlusWind, socialEarliest)
    const ymd = eveningBedFloorYmd(dayEnd, nextNightStart, 'UTC')
    const eveningUtc = utcMsAtLocalWallOnDate(
      ymd,
      EVENING_MAIN_BED_FLOOR_MINUTES_PREFERRED,
      'UTC',
      dayEnd + Math.floor((nextNightStart - dayEnd) / 2),
    )
    expect(eveningUtc).not.toBeNull()
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'DAY', date: '2026-05-11', startMs: dayStart, endMs: dayEnd },
      nextShift: { label: 'NIGHT', date: '2026-05-12', startMs: nextNightStart, endMs: nextNightStart + 9 * H },
      commuteMinutes: commute,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: debtEarliest + H, endMs: debtEarliest + 8 * H },
      loggedNaps: [],
      timeZone: 'UTC',
      sleepDebtMinutes: 150,
    })
    expect(plan.suggestedSleepStartMs).toBe(debtEarliest)
    expect(plan.suggestedSleepStartMs!).toBeLessThan(eveningUtc!)
    expect(plan.feedback.some((f) => f.code === 'sleep_debt_earlier_recovery')).toBe(true)
  })

  it('returns no_main_sleep when missing log', () => {
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-01-01', startMs: 0, endMs: H },
      nextShift: null,
      commuteMinutes: 20,
      targetSleepMinutes: 420,
      caffeineSensitivity: 'low',
      loggedMainSleep: null,
      loggedNaps: [],
    })
    expect(plan.ok).toBe(false)
    expect(plan.reason).toBe('no_main_sleep')
  })
})

describe('resolveRotaContextForSleepPlan', () => {
  it('resolves night shift crossing civil midnight (explicit shift bounds)', () => {
    const shifts = [
      {
        date: '2026-05-04',
        label: 'NIGHT',
        start_ts: '2026-05-04T22:00:00.000Z',
        end_ts: '2026-05-05T07:00:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-05-05T08:00:00.000Z')
    const sleepEnd = Date.parse('2026-05-05T15:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [{ start_at: new Date(sleepStart).toISOString(), end_at: new Date(sleepEnd).toISOString(), type: 'main_sleep' }],
      shifts,
      { commuteMinutes: 25, timeZone: 'UTC' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state === 'ok') {
      expect(ctx.shiftJustEnded.label).toMatch(/night/i)
      expect(ctx.shiftJustEnded.endMs).toBeLessThanOrEqual(sleepStart + 45 * 60 * 1000)
    }
  })

  it('returns insufficient when only naps', () => {
    const ctx = resolveRotaContextForSleepPlan(
      [{ start_at: new Date(0).toISOString(), end_at: new Date(H).toISOString(), type: 'nap' }],
      [{ date: '2026-01-01', label: 'NIGHT', start_ts: null, end_ts: null }],
      {},
    )
    expect(ctx.state).toBe('insufficient_data')
    if (ctx.state === 'insufficient_data') expect(ctx.reason).toBe('no_main_sleep')
  })

  it('picks next shift after sleep end using explicit timestamps', () => {
    const day = '2026-03-10'
    // Crossing midnight: proper ISO order
    const sStart = Date.parse(`${day}T22:00:00.000Z`)
    const sEnd = Date.parse(`2026-03-11T07:00:00.000Z`)
    const shiftsFixed = [{ date: day, label: 'NIGHT', start_ts: new Date(sStart).toISOString(), end_ts: new Date(sEnd).toISOString() }]
    const sleepStart = sEnd + 2 * H
    const sleepEnd = sleepStart + 6 * H
    const nextDay = '2026-03-11'
    const nextStart = Date.parse(`${nextDay}T22:00:00.000Z`)
    const nextEnd = Date.parse(`2026-03-12T07:00:00.000Z`)
    const shifts2 = [
      ...shiftsFixed,
      {
        date: nextDay,
        label: 'NIGHT',
        start_ts: new Date(nextStart).toISOString(),
        end_ts: new Date(nextEnd).toISOString(),
      },
    ]
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'post_shift_sleep',
        },
      ],
      shifts2,
      {},
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state === 'ok') {
      expect(ctx.nextShift).not.toBeNull()
      expect(ctx.nextShift!.startMs).toBeGreaterThan(sleepEnd)
    }
  })

  it('after dayish shift and morning wake, prefers a following night within 48h over an earlier day row', () => {
    const shifts = [
      { date: '2026-05-11', label: 'DAY', start_ts: '2026-05-11T09:00:00.000Z', end_ts: '2026-05-11T17:00:00.000Z' },
      { date: '2026-05-12', label: 'DAY', start_ts: '2026-05-12T09:00:00.000Z', end_ts: '2026-05-12T17:00:00.000Z' },
      {
        date: '2026-05-13',
        label: 'NIGHT',
        start_ts: '2026-05-13T22:00:00.000Z',
        end_ts: '2026-05-14T07:00:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-05-11T19:00:00.000Z')
    const sleepEnd = Date.parse('2026-05-12T07:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'UTC' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state === 'ok') {
      expect(ctx.nextShift?.label).toMatch(/night/i)
      expect(ctx.nextShift?.startMs).toBe(Date.parse('2026-05-13T22:00:00.000Z'))
    }
  })

  it('returns no_shift_anchor when rota has no work before sleep', () => {
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date('2026-08-01T10:00:00.000Z').toISOString(),
          end_at: new Date('2026-08-01T18:00:00.000Z').toISOString(),
          type: 'main_sleep',
        },
      ],
      [{ date: '2026-08-01', label: 'OFF', start_ts: null, end_ts: null }],
      {},
    )
    expect(ctx.state).toBe('insufficient_data')
    if (ctx.state === 'insufficient_data') expect(ctx.reason).toBe('no_shift_anchor')
  })

  it('OFF row plus night shift: synthesises rest anchor before night', () => {
    const shifts = [
      { date: '2026-08-15', label: 'OFF', start_ts: null, end_ts: null },
      {
        date: '2026-08-15',
        label: 'NIGHT',
        start_ts: '2026-08-15T22:00:00.000Z',
        end_ts: '2026-08-16T07:00:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-08-15T12:00:00.000Z')
    const sleepEnd = Date.parse('2026-08-15T18:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'UTC', commuteMinutes: 25 },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state === 'ok') {
      expect(ctx.restAnchorSynthetic).toBe(true)
      expect(ctx.shiftJustEnded.label).toMatch(/off/i)
      expect(ctx.nextShift).not.toBeNull()
      expect(ctx.nextShift!.startMs).toBe(Date.parse('2026-08-15T22:00:00.000Z'))
    }
  })
})

describe('computeNightShiftSleepPlan transitions', () => {
  it('night_to_off: open-ended recovery when no next shift', () => {
    const nStart = Date.parse('2026-08-20T22:00:00.000Z')
    const nEnd = Date.parse('2026-08-21T07:00:00.000Z')
    const sleepStart = nEnd + 2 * H
    const sleepEnd = sleepStart + 8 * H
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-08-20', startMs: nStart, endMs: nEnd },
      nextShift: null,
      commuteMinutes: 25,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
      timeZone: 'UTC',
    })
    expect(plan.ok).toBe(true)
    expect(plan.transition).toBe('night_to_off')
    expect(plan.suggestedSleepStartMs).not.toBeNull()
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.openEndedRecovery')
    expect(plan.feedback.some((f) => f.code === 'open_ended_recovery')).toBe(true)
  })

  it('late_to_early: warns on tight turnaround', () => {
    const lateStart = Date.parse('2026-06-15T15:00:00.000Z')
    const lateEnd = Date.parse('2026-06-15T23:00:00.000Z')
    const earlyNext = Date.parse('2026-06-16T06:00:00.000Z')
    const sleepStart = Date.parse('2026-06-15T23:30:00.000Z')
    const sleepEnd = Date.parse('2026-06-16T05:00:00.000Z')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'LATE', date: '2026-06-15', startMs: lateStart, endMs: lateEnd },
      nextShift: {
        label: 'EARLY',
        date: '2026-06-16',
        startMs: earlyNext,
        endMs: earlyNext + 8 * H,
      },
      commuteMinutes: 20,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
      timeZone: 'UTC',
    })
    expect(plan.transition).toBe('late_to_early')
    expect(plan.feedback.some((f) => f.code === 'tight_recovery_window')).toBe(true)
  })

  it('early_to_night: pre-night path for early finish before evening night', () => {
    const earlyStart = Date.parse('2026-07-10T06:00:00.000Z')
    const earlyEnd = Date.parse('2026-07-10T14:00:00.000Z')
    const nightStart = Date.parse('2026-07-11T22:00:00.000Z')
    const sleepStart = Date.parse('2026-07-10T18:00:00.000Z')
    const sleepEnd = Date.parse('2026-07-11T12:00:00.000Z')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'EARLY', date: '2026-07-10', startMs: earlyStart, endMs: earlyEnd },
      nextShift: {
        label: 'NIGHT',
        date: '2026-07-11',
        startMs: nightStart,
        endMs: nightStart + 9 * H,
      },
      commuteMinutes: 25,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'low',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
      timeZone: 'UTC',
    })
    expect(plan.transition).toBe('early_to_night')
    expect(plan.calculationStepKeys.some((k) => k.includes('preNight'))).toBe(true)
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.preNightTargetBand')
  })

  it('no_next_shift: day work with no following row in range', () => {
    const dayStart = Date.parse('2026-07-20T09:00:00.000Z')
    const dayEnd = Date.parse('2026-07-20T17:00:00.000Z')
    const sleepStart = dayEnd + 2 * H
    const sleepEnd = sleepStart + 7 * H
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'DAY', date: '2026-07-20', startMs: dayStart, endMs: dayEnd },
      nextShift: null,
      commuteMinutes: 25,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
      timeZone: 'UTC',
    })
    expect(plan.transition).toBe('no_next_shift')
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.openEndedRecovery')
  })

  it('off_to_night with synthetic anchor from resolver', () => {
    const shifts = [
      { date: '2026-08-15', label: 'OFF', start_ts: null, end_ts: null },
      {
        date: '2026-08-15',
        label: 'NIGHT',
        start_ts: '2026-08-15T22:00:00.000Z',
        end_ts: '2026-08-16T07:00:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-08-15T12:00:00.000Z')
    const sleepEnd = Date.parse('2026-08-15T18:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'UTC' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state !== 'ok') return
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: ctx.shiftJustEnded,
      nextShift: ctx.nextShift,
      commuteMinutes: ctx.commuteMinutes,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: ctx.primarySleep,
      loggedNaps: ctx.loggedNaps,
      timeZone: 'UTC',
      restAnchorSynthetic: ctx.restAnchorSynthetic,
    })
    expect(plan.transition).toBe('off_to_night')
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.preNightOff')
  })
})

describe('DST boundary (explicit UTC timestamps)', () => {
  it('keeps ordering with absolute ms across offset change', () => {
    const shiftStart = Date.parse('2026-03-29T23:00:00.000Z')
    const shiftEnd = Date.parse('2026-03-30T08:00:00.000Z')
    const sleepStart = Date.parse('2026-03-30T09:00:00.000Z')
    const sleepEnd = Date.parse('2026-03-30T16:00:00.000Z')
    const nextStart = Date.parse('2026-03-30T22:00:00.000Z')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-03-29', startMs: shiftStart, endMs: shiftEnd },
      nextShift: { label: 'NIGHT', date: '2026-03-30', startMs: nextStart, endMs: nextStart + 8 * H },
      commuteMinutes: 20,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
    })
    expect(plan.ok).toBe(true)
    expect(plan.latestWakeMs).not.toBeNull()
    if (plan.latestWakeMs) {
      expect(plan.latestWakeMs).toBeLessThan(nextStart)
    }
  })
})
