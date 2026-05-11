import { describe, it, expect } from 'vitest'
import {
  coercePostNightSleepString,
  parsePostNightSleepToWallMinutes,
  postNightStartDayAfterScopeUtcMs,
  resolvePostNightAsleepByUtcMs,
  resolvePostNightPreferredStartForSleepPlan,
} from '@/lib/sleep/postNightSleepHabit'
import {
  computeNightShiftSleepPlan,
  WIND_DOWN_MINUTES,
} from '@/lib/sleep/nightShiftSleepPlan'
import { resolveRotaContextForSleepPlan } from '@/lib/sleep/resolveRotaForSleepPlan'

describe('parsePostNightSleepToWallMinutes', () => {
  it('parses HH:mm and HH:mm:ss', () => {
    expect(parsePostNightSleepToWallMinutes('09:30')).toBe(9 * 60 + 30)
    expect(parsePostNightSleepToWallMinutes('09:30:00')).toBe(9 * 60 + 30)
    expect(parsePostNightSleepToWallMinutes(null)).toBeNull()
  })

  it('parses object-shaped time from some API clients', () => {
    expect(parsePostNightSleepToWallMinutes({ hours: 9, minutes: 15 })).toBe(9 * 60 + 15)
  })
})

describe('coercePostNightSleepString', () => {
  it('string passthrough', () => {
    expect(coercePostNightSleepString('  08:05  ')).toBe('08:05')
  })
})

describe('resolvePostNightAsleepByUtcMs', () => {
  it(
    'returns same-morning wall time after shift end (UTC)',
    () => {
      const shiftEnd = Date.parse('2026-08-13T07:00:00.000Z')
      const t = resolvePostNightAsleepByUtcMs(shiftEnd, '09:15', 'UTC')
      expect(t).toBe(Date.parse('2026-08-13T09:15:00.000Z'))
    },
    20_000,
  )
})

describe('postNightStartDayAfterScopeUtcMs', () => {
  it('places onboarding clock on the civil day after scope (UTC)', () => {
    const t = postNightStartDayAfterScopeUtcMs('2026-08-13', '09:15', 'UTC')
    expect(t).toBe(Date.parse('2026-08-14T09:15:00.000Z'))
  })
})

describe('computeNightShiftSleepPlan + postNightPreferredStartUtcMs', () => {
  const H = 60 * 60 * 1000

  it(
    'uses onboarding start for night_to_off when preferred instant is passed',
    () => {
    const nStart = Date.parse('2026-08-20T22:00:00.000Z')
    const nEnd = Date.parse('2026-08-21T07:00:00.000Z')
    const preferredNine = Date.parse('2026-08-21T09:00:00.000Z')
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
      postNightPreferredStartUtcMs: preferredNine,
      postNightSleepRaw: '09:00',
    })
    expect(plan.ok).toBe(true)
    expect(plan.transition).toBe('night_to_off')
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.postNightProfileSavedTime')
    expect(plan.suggestedSleepStartMs).toBe(preferredNine)
  },
  20_000,
  )

  it(
    'when saved post_night_sleep is before commute + wind-down, start is floor not profile time',
    () => {
    const shiftEnd = Date.parse('2026-06-01T07:00:00.000Z')
    const shiftStart = shiftEnd - 9 * H
    const floorStart = Date.parse('2026-06-01T08:00:00.000Z')
    const sleepStart = shiftEnd + 30 * 60 * 1000
    const sleepEnd = sleepStart + 7 * H
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-05-31', startMs: shiftStart, endMs: shiftEnd },
      nextShift: null,
      commuteMinutes: 30,
      targetSleepMinutes: 7 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: sleepStart, endMs: sleepEnd },
      loggedNaps: [],
      timeZone: 'UTC',
      postNightSleepRaw: '07:15',
    })
    expect(plan.ok).toBe(true)
    expect(plan.suggestedSleepStartMs).toBe(floorStart)
    expect(plan.suggestedSleepStartMs).not.toBe(Date.parse('2026-06-01T07:15:00.000Z'))
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.postNightProfileAdjustedCommuteWindDown')
    expect(plan.calculationStepKeys).not.toContain('sleepPlan.calc.postNightProfileSavedTime')
  },
  20_000,
  )
})

describe('resolvePostNightPreferredStartForSleepPlan (ShiftWorkerSleepPage hierarchy)', () => {
  it(
    'uses duty-relative resolve for night-like anchor — never scope-day+1 when duty match exists',
    () => {
    const shiftJustEnded = {
      label: 'NIGHT',
      date: '2026-05-10',
      startMs: Date.parse('2026-05-10T18:00:00.000Z'),
      endMs: Date.parse('2026-05-11T06:00:00.000Z'),
    }
    const duty = resolvePostNightAsleepByUtcMs(shiftJustEnded.endMs, '09:00', 'Europe/London')
    expect(duty).not.toBeNull()
    const scopeOnly = postNightStartDayAfterScopeUtcMs('2026-05-11', '09:00', 'Europe/London')
    expect(scopeOnly).not.toBeNull()
    expect(scopeOnly).not.toBe(duty)

    const preferred = resolvePostNightPreferredStartForSleepPlan({
      shiftJustEnded,
      restAnchorSynthetic: false,
      chartHighlightYmd: '2026-05-11',
      postNightSleepRaw: '09:00',
      timeZone: 'Europe/London',
    })
    expect(preferred).toBe(duty)
  },
  20_000,
  )

  it(
    'Monday scope + Sunday-dated night row: rota anchor matches duty end; preferred is not Tuesday scope fallback',
    () => {
    const shifts = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T18:00:00.000Z',
        end_ts: '2026-05-10T06:00:00.000Z',
      },
      { date: '2026-05-11', label: 'OFF', start_ts: null, end_ts: null },
    ]
    const sleepStart = Date.parse('2026-05-11T08:10:00.000Z')
    const sleepEnd = Date.parse('2026-05-11T16:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'Europe/London', postNightSleepRaw: '09:00' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state !== 'ok') return

    const scopeFallback = postNightStartDayAfterScopeUtcMs('2026-05-11', '09:00', 'Europe/London')
    const duty = resolvePostNightAsleepByUtcMs(ctx.shiftJustEnded.endMs, '09:00', 'Europe/London')
    const preferred = resolvePostNightPreferredStartForSleepPlan({
      shiftJustEnded: ctx.shiftJustEnded,
      restAnchorSynthetic: ctx.restAnchorSynthetic,
      chartHighlightYmd: '2026-05-11',
      postNightSleepRaw: '09:00',
      timeZone: 'Europe/London',
    })
    expect(preferred).toBe(duty)
    expect(preferred).not.toBe(scopeFallback)
  },
  20_000,
  )

  it('real night: profile has no duty-relative match — helper returns null (no scope), planner uses floor', () => {
    const shiftJustEnded = {
      label: 'NIGHT',
      date: '2026-05-10',
      startMs: Date.parse('2026-05-10T18:00:00.000Z'),
      endMs: Date.parse('2026-05-11T06:00:00.000Z'),
    }
    expect(resolvePostNightAsleepByUtcMs(shiftJustEnded.endMs, '04:00', 'Europe/London')).toBeNull()
    const scopeBad = postNightStartDayAfterScopeUtcMs('2026-05-11', '04:00', 'Europe/London')
    expect(scopeBad).not.toBeNull()
    const fromHelper = resolvePostNightPreferredStartForSleepPlan({
      shiftJustEnded,
      restAnchorSynthetic: false,
      chartHighlightYmd: '2026-05-11',
      postNightSleepRaw: '04:00',
      timeZone: 'Europe/London',
    })
    expect(fromHelper).toBeNull()

    const commute = 25
    const homeFloor =
      shiftJustEnded.endMs +
      commute * 60 * 1000 +
      WIND_DOWN_MINUTES * 60 * 1000
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded,
      nextShift: null,
      commuteMinutes: commute,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: {
        startMs: Date.parse('2026-05-11T08:10:00.000Z'),
        endMs: Date.parse('2026-05-11T16:00:00.000Z'),
      },
      loggedNaps: [],
      timeZone: 'Europe/London',
      postNightPreferredStartUtcMs: scopeBad!,
      postNightSleepRaw: '04:00',
    })
    expect(plan.ok).toBe(true)
    expect(plan.transition).toBe('night_to_off')
    expect(plan.suggestedSleepStartMs).toBe(homeFloor)
    expect(plan.suggestedSleepStartMs).not.toBe(scopeBad)
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.postNightProfileOutsideWindow')
  }, 25_000)

  it('synthetic rest anchor skips duty end and uses scope fallback when parseable', () => {
    const shiftJustEnded = {
      label: 'OFF',
      date: '2026-05-11',
      startMs: Date.parse('2026-05-10T12:00:00.000Z'),
      endMs: Date.parse('2026-05-11T06:00:00.000Z'),
    }
    const scope = postNightStartDayAfterScopeUtcMs('2026-05-11', '09:15', 'UTC')
    const preferred = resolvePostNightPreferredStartForSleepPlan({
      shiftJustEnded,
      restAnchorSynthetic: true,
      chartHighlightYmd: '2026-05-11',
      postNightSleepRaw: '09:15',
      timeZone: 'UTC',
    })
    expect(preferred).toBe(scope)
  })
})
