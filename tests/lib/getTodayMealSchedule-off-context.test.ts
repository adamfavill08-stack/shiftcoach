import { describe, it, expect } from 'vitest'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'
import { buildServerMealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'
import { inferWakeAnchorRhythm, resolveWakeAnchorForMeals } from '@/lib/nutrition/resolveDiurnalWakeAnchor'

describe('getTodayMealSchedule — off-day subtypes', () => {
  const nightStart = new Date(2026, 5, 10, 22, 0)
  const nightEnd = new Date(2026, 5, 11, 7, 0)

  it('normal off keeps 19:00 dinner cap and off_normal provenance', () => {
    const wake = new Date(2026, 5, 10, 12, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'off',
      wakeTime: wake,
      offDayContext: 'normal_off',
    })
    const dinner = slots.find((s) => s.id === 'dinner')
    expect(dinner!.time.getHours()).toBe(19)
    expect(provenance.offDayContext).toBe('normal_off')
    const meta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'off',
      guidanceMode: 'off_day',
      rhythmMode: 'day_rhythm',
      templateUsed: 'off',
    })
    expect(meta.scheduleReason).toContain('off_normal')
  })

  it('before_first_night uses pre-night bridge (not simple wake+10.5h dinner)', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'off',
      shiftStart: nightStart,
      shiftEnd: nightEnd,
      wakeTime: wake,
      offDayContext: 'before_first_night',
    })
    const pre = slots.find((s) => s.id === 'preShift')
    expect(pre?.time.getHours()).toBe(18)
    expect(pre?.time.getMinutes()).toBe(30)
    expect(slots.some((s) => s.label === 'Dinner' && s.id === 'dinner')).toBe(false)
    expect(provenance.offDayContext).toBe('before_first_night')
    const meta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'off',
      guidanceMode: 'off_day',
      rhythmMode: 'transition_to_night',
      templateUsed: 'off',
    })
    expect(meta.scheduleReason).toContain('off_before_first_night')
  })

  it('between_nights does not apply 19:00 dinner cap (uses night-bridge slots)', () => {
    const wake = new Date(2026, 5, 10, 15, 30)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'off',
      shiftStart: nightStart,
      shiftEnd: nightEnd,
      wakeTime: wake,
      offDayContext: 'between_nights',
    })
    expect(slots.find((s) => s.id === 'dinner')).toBeUndefined()
    expect(provenance.offDayContext).toBe('between_nights')
    const meta = buildServerMealScheduleMeta({
      provenance,
      shiftType: 'off',
      guidanceMode: 'off_day',
      rhythmMode: 'night_rhythm',
      templateUsed: 'off',
    })
    expect(meta.scheduleReason).toContain('off_between_nights')
  })

  it('after_final_night allows dinner past 19:00 when wake is midday', () => {
    const wake = new Date(2026, 5, 10, 12, 0)
    const { slots, provenance } = getTodayMealSchedule({
      adjustedCalories: 2000,
      shiftType: 'off',
      wakeTime: wake,
      offDayContext: 'after_final_night',
    })
    const dinner = slots.find((s) => s.id === 'dinner')
    expect(dinner!.time.getHours()).toBe(22)
    expect(provenance.offDayContext).toBe('after_final_night')
  })
})

describe('inferWakeAnchorRhythm — offDayContext', () => {
  const noon = new Date(2026, 5, 10, 12, 0, 0, 0)

  it('after_final_night uses recovery_from_night (no-sleep fallback is not 07:00)', () => {
    expect(
      inferWakeAnchorRhythm({
        shiftType: 'off',
        guidanceMode: 'off_day',
        transitionState: 'stable',
        offDayContext: 'after_final_night',
      }),
    ).toBe('recovery_from_night')
    const anchor = resolveWakeAnchorForMeals(null, noon, 'recovery_from_night')
    expect(anchor.getHours()).toBe(12)
  })

  it('between_nights uses night_rhythm', () => {
    expect(
      inferWakeAnchorRhythm({
        shiftType: 'off',
        guidanceMode: 'off_day',
        transitionState: 'stable',
        offDayContext: 'between_nights',
      }),
    ).toBe('night_rhythm')
  })
})
