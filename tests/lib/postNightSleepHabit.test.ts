import { describe, it, expect } from 'vitest'
import {
  coercePostNightSleepString,
  parsePostNightSleepToWallMinutes,
  postNightStartDayAfterScopeUtcMs,
  resolvePostNightAsleepByUtcMs,
} from '@/lib/sleep/postNightSleepHabit'
import { computeNightShiftSleepPlan } from '@/lib/sleep/nightShiftSleepPlan'

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
  it('returns same-morning wall time after shift end (UTC)', () => {
    const shiftEnd = Date.parse('2026-08-13T07:00:00.000Z')
    const t = resolvePostNightAsleepByUtcMs(shiftEnd, '09:15', 'UTC')
    expect(t).toBe(Date.parse('2026-08-13T09:15:00.000Z'))
  })
})

describe('postNightStartDayAfterScopeUtcMs', () => {
  it('places onboarding clock on the civil day after scope (UTC)', () => {
    const t = postNightStartDayAfterScopeUtcMs('2026-08-13', '09:15', 'UTC')
    expect(t).toBe(Date.parse('2026-08-14T09:15:00.000Z'))
  })
})

describe('computeNightShiftSleepPlan + postNightPreferredStartTomorrowUtcMs', () => {
  const H = 60 * 60 * 1000

  it('uses onboarding start for night_to_off when tomorrow instant is passed', () => {
    const nStart = Date.parse('2026-08-20T22:00:00.000Z')
    const nEnd = Date.parse('2026-08-21T07:00:00.000Z')
    const tomorrowNine = Date.parse('2026-08-22T09:00:00.000Z')
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
      postNightPreferredStartTomorrowUtcMs: tomorrowNine,
    })
    expect(plan.ok).toBe(true)
    expect(plan.transition).toBe('night_to_off')
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.postNightOnboardingStart')
    expect(plan.suggestedSleepStartMs).toBe(tomorrowNine)
  })
})
