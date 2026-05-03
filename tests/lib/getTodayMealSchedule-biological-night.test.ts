import { describe, it, expect } from 'vitest'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'
import { buildServerMealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'
import { isBiologicalNightLocal } from '@/lib/nutrition/applyBiologicalNightMealPolicy'

describe('isBiologicalNightLocal', () => {
  it('treats 00:00–05:59 as biological night and excludes 06:00', () => {
    expect(isBiologicalNightLocal(new Date(2026, 1, 1, 0, 0))).toBe(true)
    expect(isBiologicalNightLocal(new Date(2026, 1, 1, 5, 59))).toBe(true)
    expect(isBiologicalNightLocal(new Date(2026, 1, 1, 6, 0))).toBe(false)
    expect(isBiologicalNightLocal(new Date(2026, 1, 1, 14, 0))).toBe(false)
  })
})

describe('getTodayMealSchedule — biological night policy (standard night)', () => {
  it('caps overnight slots in 00:00–06:00 and keeps pre-shift main meal largest', () => {
    const wake = new Date(2026, 5, 2, 10, 0)
    const start = new Date(2026, 5, 1, 22, 0)
    const end = new Date(2026, 5, 2, 7, 0)
    const adjustedCalories = 2000
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories,
      shiftType: 'night',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      expectedSleepHours: 7.5,
      loggedWakeAfterShift: null,
    })

    expect(provenance.biologicalNightPolicyApplied).toBe(true)
    expect(provenance.transitionDayToNight).toBe(false)
    const scheduleMeta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'night',
      guidanceMode: 'night_shift',
      rhythmMode: 'night_rhythm',
      templateUsed: 'night',
    })
    expect(scheduleMeta.scheduleSource).toBe('server')
    expect(scheduleMeta.biologicalNightPolicyApplied).toBe(true)
    expect(scheduleMeta.scheduleReason).toContain('biological_night_policy')

    const pre = slots.find((s) => s.id === 'preShift')
    const mid = slots.find((s) => s.id === 'midShift')
    const overnight = slots.find((s) => s.id === 'nightSnack' && isBiologicalNightLocal(s.time))

    expect(pre?.label).toBe('Pre-shift main meal')
    // start + 2h from 22:00 lands exactly at midnight — must sit in biological night window
    expect(mid?.time.getHours()).toBe(0)
    expect(mid?.time.getMinutes()).toBe(0)
    expect(isBiologicalNightLocal(mid!.time)).toBe(true)
    expect(mid?.label).toBe('Early shift fuel')
    expect(overnight?.label).toBe('Small overnight snack')
    expect(mid?.biologicalNight).toBe(true)
    expect(overnight?.biologicalNight).toBe(true)

    const maxOvernightDefault = Math.round(adjustedCalories * 0.15)
    const maxOvernightSnack = Math.round(adjustedCalories * 0.1)
    expect(mid!.caloriesTarget).toBeLessThanOrEqual(maxOvernightDefault)
    expect(overnight!.caloriesTarget).toBeLessThanOrEqual(maxOvernightSnack)

    const preK = pre!.caloriesTarget
    for (const s of slots) {
      if (s.id === pre?.id) continue
      expect(preK).toBeGreaterThanOrEqual(s.caloriesTarget)
    }
  })
})

describe('getTodayMealSchedule — post-shift copy (legacy night end)', () => {
  it('uses soft post-finish wording even when post-shift slot is not kcal-capped', () => {
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
    expect(post?.hint ?? '').toMatch(/small|not a full/i)
    expect(post?.subtitle ?? '').toMatch(/Small fuel|wind-down/i)
  })
})

describe('getTodayMealSchedule — biological night does not affect day shift', () => {
  it('leaves midday labels and shares unchanged for day template', () => {
    const wake = new Date(2026, 5, 10, 7, 0)
    const start = new Date(2026, 5, 10, 9, 0)
    const end = new Date(2026, 5, 10, 17, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'day',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
    })
    expect(provenance.biologicalNightPolicyApplied).toBe(false)
    const mid = slots.find((s) => s.id === 'midShift')
    expect(mid?.label).toContain('Mid')
    expect(mid?.biologicalNight).toBeUndefined()
  })
})

describe('getTodayMealSchedule — transition_day_to_night + biological night', () => {
  it('relables pre-shift and applies overnight caps without changing transition times', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const nightStart = new Date(2026, 5, 10, 22, 0)
    const { slots } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'night',
      shiftStart: nightStart,
      shiftEnd: new Date(2026, 5, 11, 7, 0),
      wakeTime: wake,
      guidanceMode: 'transition_day_to_night',
    })
    const pre = slots.find((s) => s.id === 'preShift')
    expect(pre?.label).toBe('Pre-shift main meal')
    expect(pre?.time.getHours()).toBe(18)
    expect(pre?.time.getMinutes()).toBe(30)

    const mid = slots.find((s) => s.id === 'midShift')
    expect(mid?.time.getHours()).toBe(2)
    expect(mid?.time.getMinutes()).toBe(30)
    if (mid && isBiologicalNightLocal(mid.time)) {
      expect(mid.label).toBe('Early shift fuel')
    }

    const optionalOvernight = slots.find(
      (s) => s.id === 'nightSnack' && isBiologicalNightLocal(s.time),
    )
    if (optionalOvernight) {
      expect(optionalOvernight.label).toBe('Small overnight snack')
    }
  })
})
