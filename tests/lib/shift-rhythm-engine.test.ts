import { describe, expect, it } from 'vitest'
import { calculateShiftRhythm, type ShiftRhythmInputs } from '@/lib/shift-rhythm/engine'
import { computeSleepComposite } from '@/lib/shift-rhythm/scoring'

const emptyNutrition = {
  adjustedCalories: 2000,
  consumedCalories: 0,
  calorieTarget: 2000,
  macros: {
    protein: { target: 100, consumed: null },
    carbs: { target: 200, consumed: null },
    fat: { target: 70, consumed: null },
    satFat: { limit: 20, consumed: null },
  },
  hydration: {
    water: { targetMl: 2000, consumedMl: 1000 },
    caffeine: { limitMg: 400, consumedMg: 0 },
  },
}

const emptyActivity = {
  steps: 5000,
  stepsGoal: 10000,
  activeMinutes: 15,
  activeMinutesGoal: 30,
}

const emptyMealTiming = { recommended: [] as any[], actual: [] as any[] }

function baseInputs(overrides: Partial<ShiftRhythmInputs> = {}): ShiftRhythmInputs {
  return {
    sleepLogs: [],
    shiftDays: [],
    nutrition: emptyNutrition,
    activity: emptyActivity,
    mealTiming: emptyMealTiming,
    ...overrides,
  }
}

describe('calculateShiftRhythm regularity', () => {
  it('returns null regularity when at most one sleep log', () => {
    const oneLog = baseInputs({
      sleepLogs: [
        {
          date: '2026-01-10',
          start: '2026-01-10T23:00:00.000Z',
          end: '2026-01-11T07:00:00.000Z',
          durationHours: 8,
          quality: 4,
        },
      ],
      shiftDays: [{ date: '2026-01-10', type: 'day' }],
    })
    const r = calculateShiftRhythm(oneLog)
    expect(r.regularity_score).toBeNull()
  })

  it('returns null when two logs fall in different shift buckets (one each)', () => {
    const r = calculateShiftRhythm(
      baseInputs({
        sleepLogs: [
          {
            date: '2026-01-11',
            start: '2026-01-11T23:00:00.000Z',
            end: '2026-01-12T07:00:00.000Z',
            durationHours: 8,
            quality: 4,
          },
          {
            date: '2026-01-10',
            start: '2026-01-10T08:00:00.000Z',
            end: '2026-01-10T16:00:00.000Z',
            durationHours: 8,
            quality: 4,
          },
        ],
        shiftDays: [
          { date: '2026-01-11', type: 'day' },
          { date: '2026-01-10', type: 'night' },
        ],
      }),
    )
    expect(r.regularity_score).toBeNull()
  })

  it('computes regularity when two logs share a shift bucket with same clock bedtime', () => {
    const r = calculateShiftRhythm(
      baseInputs({
        sleepLogs: [
          {
            date: '2026-01-11',
            start: '2026-01-11T22:30:00.000Z',
            end: '2026-01-12T06:30:00.000Z',
            durationHours: 8,
            quality: 4,
          },
          {
            date: '2026-01-10',
            start: '2026-01-10T22:30:00.000Z',
            end: '2026-01-11T06:30:00.000Z',
            durationHours: 8,
            quality: 4,
          },
        ],
        shiftDays: [
          { date: '2026-01-11', type: 'day' },
          { date: '2026-01-10', type: 'day' },
        ],
      }),
    )
    expect(r.regularity_score).not.toBeNull()
    expect(r.regularity_score!).toBeGreaterThanOrEqual(95)
  })
})

describe('computeSleepComposite', () => {
  it('renormalizes weights when regularity is null', () => {
    const v = computeSleepComposite({
      sleep_score: 40,
      regularity_score: null,
      shift_pattern_score: 40,
      recovery_score: 40,
    })
    expect(v).toBe(40)
  })

  it('includes regularity when present', () => {
    const withReg = computeSleepComposite({
      sleep_score: 100,
      regularity_score: 100,
      shift_pattern_score: 0,
      recovery_score: 0,
    })
    const noReg = computeSleepComposite({
      sleep_score: 100,
      regularity_score: null,
      shift_pattern_score: 0,
      recovery_score: 0,
    })
    expect(withReg).not.toBeNull()
    expect(noReg).not.toBeNull()
    expect(withReg!).toBeGreaterThan(noReg!)
  })
})
