import { describe, it, expect } from 'vitest'
import {
  getTodayMealSchedule,
  shiftDurationHours,
  LONG_DAY_SHIFT_MIN_HOURS,
} from '@/lib/nutrition/getTodayMealSchedule'
import { buildServerMealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'

describe('shiftDurationHours', () => {
  it('returns hours between start and end', () => {
    const start = new Date(2026, 5, 10, 7, 0)
    const end = new Date(2026, 5, 10, 19, 0)
    expect(shiftDurationHours(start, end)).toBe(12)
    expect(shiftDurationHours(new Date(2026, 5, 10, 9, 0), new Date(2026, 5, 10, 17, 0))).toBe(8)
  })
})

describe('getTodayMealSchedule — long day (≥10h)', () => {
  it('uses two on-shift meals + post-shift at end+~45min for 07:00–19:00', () => {
    const wake = new Date(2026, 5, 10, 6, 0)
    const start = new Date(2026, 5, 10, 7, 0)
    const end = new Date(2026, 5, 10, 19, 0)
    const adjustedCalories = 2000
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories,
      shiftType: 'day',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })

    expect(provenance.longShiftDay).toBe(true)
    const meta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'day',
      guidanceMode: 'day_shift',
      rhythmMode: 'day_rhythm',
      templateUsed: 'day',
    })
    expect(meta.scheduleSource).toBe('server')
    expect(meta.longShift).toBe(true)
    expect(meta.scheduleReason).toContain('long_day')

    expect(shiftDurationHours(start, end)).toBeGreaterThanOrEqual(LONG_DAY_SHIFT_MIN_HOURS)
    expect(slots).toHaveLength(4)

    const main = slots.find((s) => s.id === 'midShift')
    const light = slots.find((s) => s.id === 'daySnack')
    const post = slots.find((s) => s.id === 'dinner')

    expect(main?.label).toBe('Main on-shift meal')
    expect(light?.label).toBe('Light on-shift fuel')
    expect(post?.label).toBe('Post-shift meal')

    expect(main?.time.getHours()).toBe(11)
    expect(main?.time.getMinutes()).toBe(30)

    expect(light?.time.getHours()).toBe(15)
    expect(light?.time.getMinutes()).toBe(0)

    const postAfterEndMin = (post!.time.getTime() - end.getTime()) / (60 * 1000)
    expect(postAfterEndMin).toBeGreaterThanOrEqual(40)
    expect(postAfterEndMin).toBeLessThanOrEqual(95)

    expect(slots.some((s) => s.label === 'Light evening bite')).toBe(false)
  })

  it('does not add a separate evening bite crowded against post-shift', () => {
    const wake = new Date(2026, 5, 10, 6, 0)
    const start = new Date(2026, 5, 10, 7, 0)
    const end = new Date(2026, 5, 10, 19, 0)
    const { slots } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'day',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    expect(slots.filter((s) => s.label.includes('evening')).length).toBe(0)
    expect(slots.find((s) => s.id === 'dinner')?.label).toBe('Post-shift meal')
  })

  it('keeps total kcal targets aligned with adjusted calories (rounding)', () => {
    const adjustedCalories = 2000
    const { slots } = getTodayMealSchedule({
      adjustedCalories,
      shiftType: 'day',
      shiftStart: new Date(2026, 5, 10, 7, 0),
      shiftEnd: new Date(2026, 5, 10, 19, 0),
      wakeTime: new Date(2026, 5, 10, 6, 0),
    })
    const sum = slots.reduce((a, s) => a + s.caloriesTarget, 0)
    expect(Math.abs(sum - adjustedCalories)).toBeLessThanOrEqual(4)
  })
})

describe('getTodayMealSchedule — standard day (<10h) unchanged', () => {
  it('keeps midpoint mid-shift and post at end+~17min for 09:00–17:00', () => {
    const wake = new Date(2026, 5, 10, 7, 30)
    const start = new Date(2026, 5, 10, 9, 0)
    const end = new Date(2026, 5, 10, 17, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'day',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    expect(provenance.longShiftDay).toBe(false)
    expect(shiftDurationHours(start, end)).toBeLessThan(LONG_DAY_SHIFT_MIN_HOURS)

    const mid = slots.find((s) => s.id === 'midShift')
    const post = slots.find((s) => s.id === 'daySnack')
    const eve = slots.find((s) => s.id === 'dinner')

    expect(mid?.label).toContain('Mid')
    expect(mid?.time.getHours()).toBe(13)
    expect(post?.time.getHours()).toBe(17)
    expect(post?.time.getMinutes()).toBeGreaterThanOrEqual(16)
    expect(post?.time.getMinutes()).toBeLessThanOrEqual(18)
    expect(eve?.label).toBe('Light evening bite')
  })
})
