import { describe, expect, it } from 'vitest'
import { computeAdaptedStepGoalAgent } from '@/lib/activity/computeAdaptedStepGoalAgent'

const basePrefs = { hardGoalMin: null, hardGoalMax: null, optOutAdaptive: false }

describe('computeAdaptedStepGoalAgent', () => {
  it('opt-out returns baseline with opt_out', () => {
    const r = computeAdaptedStepGoalAgent({
      userId: 'u1',
      baselineGoal: 8000,
      heightCm: 170,
      weightKg: 70,
      sex: 'male',
      ageYears: 30,
      recent7DaySteps: [8000, 8000, 8000, 8000, 8000, 8000, 8000],
      todayStepsSoFar: 0,
      sleepLastNightMinutes: 480,
      avgSleepLast3NightsMinutes: 480,
      shift: 'day',
      timezone: 'UTC',
      preferences: { ...basePrefs, optOutAdaptive: true },
      lastAdaptedAt: null,
      lastAdaptedStepGoal: null,
      nowIso: '2026-04-12T12:00:00.000Z',
    })
    expect(r.adaptedStepGoal).toBe(8000)
    expect(r.activityPersonalization.reasons).toEqual(['opt_out'])
  })

  it('debounce within 12h and <5% change keeps lastAdaptedStepGoal', () => {
    const r = computeAdaptedStepGoalAgent({
      userId: 'u1',
      baselineGoal: 10000,
      heightCm: 170,
      weightKg: 70,
      sex: 'female',
      ageYears: 45,
      recent7DaySteps: [9040, 9040, 9040, 9040, 9040, 9040, 9040],
      todayStepsSoFar: 3000,
      sleepLastNightMinutes: 480,
      avgSleepLast3NightsMinutes: 480,
      shift: 'day',
      timezone: 'UTC',
      preferences: basePrefs,
      lastAdaptedAt: '2026-04-12T08:00:00.000Z',
      lastAdaptedStepGoal: 9000,
      nowIso: '2026-04-12T12:00:00.000Z',
    })
    expect(r.adaptedStepGoal).toBe(9000)
    expect(r.activityPersonalization.reasons).toContain('maintenance')
    expect(r.activityPersonalization.factors.debounceHeld).toBe(1)
  })

  it('same inputs and nowIso are deterministic', () => {
    const input = {
      userId: 'u1',
      baselineGoal: 10000,
      heightCm: null,
      weightKg: null,
      sex: null,
      ageYears: null,
      recent7DaySteps: [8000, 9000, 7500, 7000, 8200, 7600, 7800] as Array<number | null>,
      todayStepsSoFar: 3000,
      sleepLastNightMinutes: 320,
      avgSleepLast3NightsMinutes: 340,
      shift: 'night' as const,
      timezone: 'America/Los_Angeles',
      preferences: { hardGoalMin: 5000, hardGoalMax: 20000, optOutAdaptive: false },
      lastAdaptedAt: '2026-04-11T08:00:00.000Z',
      lastAdaptedStepGoal: 9200,
      nowIso: '2026-04-12T04:00:00.000Z',
    }
    const a = computeAdaptedStepGoalAgent(input)
    const b = computeAdaptedStepGoalAgent(input)
    expect(a).toEqual(b)
    expect(a.activityPersonalization.computedAt).toBe('2026-04-12T04:00:00.000Z')
    expect(a.adaptedStepGoal).toBeGreaterThanOrEqual(1000)
    expect(a.adaptedStepGoal).toBeGreaterThanOrEqual(5000)
    expect(a.adaptedStepGoal).toBeLessThanOrEqual(20000)
  })

  it('clamps to ±30% of baseline', () => {
    const r = computeAdaptedStepGoalAgent({
      userId: 'u1',
      baselineGoal: 10000,
      heightCm: 150,
      weightKg: 120,
      sex: 'other',
      ageYears: 40,
      recent7DaySteps: [2000, 2000, 2000, 2000, 2000, 2000, 2000],
      todayStepsSoFar: 0,
      sleepLastNightMinutes: 200,
      avgSleepLast3NightsMinutes: 200,
      shift: 'night',
      timezone: 'UTC',
      preferences: basePrefs,
      lastAdaptedAt: null,
      lastAdaptedStepGoal: null,
      nowIso: '2026-01-01T00:00:00.000Z',
    })
    expect(r.adaptedStepGoal).toBeGreaterThanOrEqual(7000)
    expect(r.adaptedStepGoal).toBeLessThanOrEqual(13000)
  })

  it('inSleepWindow holds lastAdaptedStepGoal without recomputing', () => {
    const r = computeAdaptedStepGoalAgent({
      userId: 'u1',
      baselineGoal: 10000,
      heightCm: 170,
      weightKg: 70,
      sex: 'male',
      ageYears: 30,
      recent7DaySteps: [1000, 1000, 1000, 1000, 1000, 1000, 1000],
      todayStepsSoFar: 0,
      sleepLastNightMinutes: 480,
      avgSleepLast3NightsMinutes: 480,
      shift: 'night',
      timezone: 'UTC',
      preferences: basePrefs,
      lastAdaptedAt: '2026-04-12T02:00:00.000Z',
      lastAdaptedStepGoal: 9450,
      nowIso: '2026-04-12T14:00:00.000Z',
      inSleepWindow: true,
    })
    expect(r.adaptedStepGoal).toBe(9450)
    expect(r.activityPersonalization.reasons).toEqual(['sleep_window_hold'])
    expect(r.activityPersonalization.factors.sleepWindowHold).toBe(1)
  })

  it('shiftTransitionDetected pins trendFactor to 1.0', () => {
    const r = computeAdaptedStepGoalAgent({
      userId: 'u1',
      baselineGoal: 10000,
      heightCm: null,
      weightKg: null,
      sex: null,
      ageYears: null,
      recent7DaySteps: [2000, 2000, 2000, 2000, 2000, 2000, 2000],
      todayStepsSoFar: 0,
      sleepLastNightMinutes: 480,
      avgSleepLast3NightsMinutes: 480,
      shift: 'night',
      timezone: 'UTC',
      preferences: basePrefs,
      lastAdaptedAt: null,
      lastAdaptedStepGoal: null,
      nowIso: '2026-04-12T12:00:00.000Z',
      shiftTransitionDetected: true,
    })
    expect(r.activityPersonalization.factors.trendFactor).toBe(1)
    expect(r.activityPersonalization.factors.trendPinned).toBe(1)
    expect(r.activityPersonalization.reasons).toContain('shift_transition')
    expect(r.activityPersonalization.reasons).not.toContain('trend_down')
    expect(r.adaptedStepGoal).toBe(9000)
  })

  it('emits sleep_data_unavailable when both sleep inputs are null', () => {
    const r = computeAdaptedStepGoalAgent({
      userId: 'u1',
      baselineGoal: 10000,
      heightCm: null,
      weightKg: null,
      sex: null,
      ageYears: null,
      recent7DaySteps: [10000, 10000, 10000, 10000, 10000, 10000, 10000],
      todayStepsSoFar: 0,
      sleepLastNightMinutes: null,
      avgSleepLast3NightsMinutes: null,
      shift: 'day',
      timezone: 'UTC',
      preferences: basePrefs,
      lastAdaptedAt: null,
      lastAdaptedStepGoal: null,
      nowIso: '2026-04-12T12:00:00.000Z',
    })
    expect(r.activityPersonalization.reasons).toContain('sleep_data_unavailable')
    expect(r.activityPersonalization.reasons).not.toContain('missing_data')
  })
})
