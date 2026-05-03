import { describe, it, expect } from 'vitest'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'

describe('getTodayMealSchedule — night shift ending 05:00–10:00', () => {
  it('schedules wake-up meal at shift end + expected sleep, not right after clock-off', () => {
    const wake = new Date(2026, 5, 2, 10, 0)
    const start = new Date(2026, 5, 1, 22, 0)
    const end = new Date(2026, 5, 2, 7, 0)
    const { slots } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'night',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      expectedSleepHours: 7.5,
      loggedWakeAfterShift: null,
    })
    const wakeMeal = slots.find((s) => s.id === 'postShiftBreakfast')
    expect(wakeMeal?.label).toBe('First meal after sleep')
    expect(wakeMeal?.time.getHours()).toBe(14)
    expect(wakeMeal?.time.getMinutes()).toBe(30)
    expect(wakeMeal?.subtitle).toMatch(/Assumes ~7\.5h sleep/)
    const postMs = wakeMeal!.time.getTime()
    expect(wakeMeal?.caloriesTarget ?? 0).toBeGreaterThan(0)
    expect(postMs).toBeGreaterThanOrEqual(end.getTime() + 3 * 60 * 60 * 1000)
    expect(slots.some((s) => s.id === 'daySnack')).toBe(true)
  })

  it('uses logged wake time when provided', () => {
    const wake = new Date(2026, 5, 2, 10, 0)
    const start = new Date(2026, 5, 1, 22, 0)
    const end = new Date(2026, 5, 2, 7, 0)
    const loggedWake = new Date(2026, 5, 2, 13, 15)
    const { slots } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'night',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      expectedSleepHours: 7.5,
      loggedWakeAfterShift: loggedWake,
    })
    const wakeMeal = slots.find((s) => s.id === 'postShiftBreakfast')
    expect(wakeMeal?.time.getHours()).toBe(13)
    expect(wakeMeal?.time.getMinutes()).toBe(15)
    expect(wakeMeal?.subtitle).toMatch(/logged wake/)
  })

  it('keeps legacy labels when night shift does not end in the early-morning window', () => {
    const wake = new Date(2026, 5, 2, 10, 0)
    const start = new Date(2026, 5, 2, 18, 0)
    const end = new Date(2026, 5, 3, 2, 0)
    const { slots } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'night',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    const post = slots.find((s) => s.id === 'postShiftBreakfast')
    expect(post?.label).toBe('Light post-shift bite before sleep')
  })
})
