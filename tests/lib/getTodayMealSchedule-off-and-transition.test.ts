import { describe, it, expect } from 'vitest'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'
import { buildServerMealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'

describe('getTodayMealSchedule — off days', () => {
  it('caps dinner at 19:00 local when spaced offsets would run late', () => {
    const wake = new Date(2026, 5, 10, 12, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'off',
      wakeTime: wake,
    })
    expect(provenance.offDayContext).toBe('normal_off')
    const dinner = slots.find((s) => s.id === 'dinner')
    expect(dinner).toBeDefined()
    expect(dinner!.time.getHours()).toBe(19)
    expect(dinner!.time.getMinutes()).toBe(0)
    expect(dinner!.hint).toMatch(/19:00/)
  })
})

describe('getTodayMealSchedule — day → night transition', () => {
  it('places light breakfast ~1h after wake and pre-shift main meal ~3.5h before night start', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const nightStart = new Date(2026, 5, 10, 22, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'night',
      shiftStart: nightStart,
      shiftEnd: new Date(2026, 5, 11, 7, 0),
      wakeTime: wake,
      guidanceMode: 'transition_day_to_night',
    })
    expect(provenance.transitionDayToNight).toBe(true)
    const transitionMeta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'night',
      guidanceMode: 'transition_day_to_night',
      rhythmMode: 'transition_to_night',
      templateUsed: 'night',
    })
    expect(transitionMeta.scheduleSource).toBe('server')
    expect(transitionMeta.transitionDayToNight).toBe(true)
    expect(transitionMeta.scheduleReason).toContain('transition_day_to_night')

    const lightBf = slots.find((s) => s.id === 'breakfast')
    const pre = slots.find((s) => s.id === 'preShift')
    expect(lightBf?.label).toBe('Light breakfast')
    expect(lightBf?.time.getHours()).toBe(9)
    expect(lightBf?.time.getMinutes()).toBe(0)
    expect(pre?.time.getHours()).toBe(18)
    expect(pre?.time.getMinutes()).toBe(30)
    const gapMin = (nightStart.getTime() - pre!.time.getTime()) / (60 * 1000)
    expect(gapMin).toBeGreaterThanOrEqual(3 * 60 + 25)
  })
})
