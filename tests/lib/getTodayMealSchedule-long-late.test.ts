import { describe, it, expect } from 'vitest'
import {
  getTodayMealSchedule,
  shiftDurationHours,
  LONG_LATE_SHIFT_MIN_HOURS,
} from '@/lib/nutrition/getTodayMealSchedule'
import { buildServerMealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'

describe('getTodayMealSchedule — long late (≥10h)', () => {
  const wake = new Date(2026, 5, 10, 7, 0)
  const start = new Date(2026, 5, 10, 14, 0)
  const end = new Date(2026, 5, 11, 0, 0)

  it('uses long-late template for 14:00–00:00 (10h)', () => {
    expect(shiftDurationHours(start, end)).toBeGreaterThanOrEqual(LONG_LATE_SHIFT_MIN_HOURS)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'late',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    expect(provenance.longShiftLate).toBe(true)
    const meta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'late',
      guidanceMode: 'day_shift',
      rhythmMode: 'day_rhythm',
      templateUsed: 'late',
    })
    expect(meta.scheduleReason).toContain('long_late')

    const main = slots.find((s) => s.id === 'midShift')
    const light = slots.find((s) => s.id === 'nightSnack')
    const post = slots.find((s) => s.id === 'dinner')

    expect(main?.label).toBe('Main on-shift meal')
    expect(light?.label).toBe('Light late-shift fuel')
    expect(main?.time.getHours()).toBe(18)
    expect(main?.time.getMinutes()).toBe(30)

    expect(light?.time.getTime()).toBeLessThan(end.getTime())
    expect(light?.time.getHours()).toBe(22)
    expect(light?.time.getMinutes()).toBe(30)

    expect(post?.time.getHours()).toBeLessThanOrEqual(2)
    expect(post?.label).toMatch(/Light post-shift bite before sleep/i)
  })

  it('does not assign a large post-shift meal share after a midnight finish', () => {
    const adjustedCalories = 2000
    const { slots } = getTodayMealSchedule({
      adjustedCalories,
      shiftType: 'late',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    const post = slots.find((s) => s.id === 'dinner')
    const main = slots.find((s) => s.id === 'midShift')
    expect(post!.caloriesTarget).toBeLessThanOrEqual(Math.round(adjustedCalories * 0.13) + 1)
    expect(main!.caloriesTarget).toBeGreaterThanOrEqual(Math.round(adjustedCalories * 0.32))
  })

  it('keeps total kcal aligned with adjusted calories', () => {
    const adjustedCalories = 2000
    const { slots } = getTodayMealSchedule({
      adjustedCalories,
      shiftType: 'late',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    const sum = slots.reduce((a, s) => a + s.caloriesTarget, 0)
    expect(Math.abs(sum - adjustedCalories)).toBeLessThanOrEqual(4)
  })
})

describe('getTodayMealSchedule — standard late (<10h)', () => {
  it('keeps midpoint mid-shift and post at end+2h for 14:00–22:00', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const start = new Date(2026, 5, 10, 14, 0)
    const end = new Date(2026, 5, 10, 22, 0)
    expect(shiftDurationHours(start, end)).toBeLessThan(LONG_LATE_SHIFT_MIN_HOURS)

    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'late',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    expect(provenance.longShiftLate).toBe(false)

    const mid = slots.find((s) => s.id === 'midShift')
    const post = slots.find((s) => s.id === 'dinner')
    expect(mid?.label).toBe('Mid‑shift meal')
    expect(mid?.time.getHours()).toBe(18)
    expect(post?.time.getHours()).toBe(0)
    expect(post?.label).toBe('Post‑shift light meal')
  })
})
