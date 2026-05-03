import { describe, it, expect } from 'vitest'
import type { MealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'
import { getMealSlotDisplayCopy, getScheduleContextSubtitle } from '@/lib/nutrition/getMealSlotDisplayCopy'

function meta(partial: Partial<MealScheduleMeta>): MealScheduleMeta {
  return {
    scheduleSource: 'server',
    scheduleReason: partial.scheduleReason ?? [],
    shiftType: partial.shiftType ?? 'night',
    guidanceMode: partial.guidanceMode ?? null,
    rhythmMode: partial.rhythmMode ?? 'day_rhythm',
    longShift: partial.longShift ?? false,
    longShiftLate: partial.longShiftLate,
    biologicalNightPolicyApplied: partial.biologicalNightPolicyApplied ?? false,
    transitionDayToNight: partial.transitionDayToNight ?? false,
    templateUsed: partial.templateUsed ?? 'night',
    offDayContext: partial.offDayContext ?? null,
  }
}

describe('getMealSlotDisplayCopy', () => {
  it('nightSnack with biological night returns Small overnight snack', () => {
    const copy = getMealSlotDisplayCopy(
      {
        id: 'nightSnack',
        label: 'Night snack',
        biologicalNight: true,
      },
      meta({ shiftType: 'night' }),
    )
    expect(copy.title).toBe('Small overnight snack')
  })

  it('biological night + kcal capped uses Light overnight fuel and avoids "meal" in surfaced strings', () => {
    const copy = getMealSlotDisplayCopy(
      {
        id: 'nightSnack',
        label: 'Night snack',
        biologicalNight: true,
        kcalCapped: true,
      },
      meta({ shiftType: 'night', scheduleReason: ['biological_night_policy'] }),
    )
    expect(copy.title).toBe('Light overnight fuel')
    const surfaced = `${copy.title} ${copy.subtitle} ${copy.explanation}`
    expect(/\bmeal\b/i.test(surfaced)).toBe(false)
  })

  it('long_day daySnack with planner label maps to Light on-shift fuel', () => {
    const copy = getMealSlotDisplayCopy(
      {
        id: 'daySnack',
        label: 'Light on-shift fuel',
        hint: 'Helps avoid a late-shift energy crash.',
      },
      meta({ shiftType: 'day', longShift: true, scheduleReason: ['long_day'] }),
    )
    expect(copy.title).toBe('Light on-shift fuel')
    expect(copy.badge).toBe('Long day')
  })

  it('long_late post-shift dinner maps to Light post-shift bite before sleep', () => {
    const copy = getMealSlotDisplayCopy(
      {
        id: 'dinner',
        label: 'Light post-shift bite before sleep',
        hint: 'Small fuel after a late finish — easier sleep after a long late block.',
      },
      meta({ shiftType: 'late', longShiftLate: true, scheduleReason: ['long_late'] }),
    )
    expect(copy.title).toBe('Light post-shift bite before sleep')
    expect(copy.badge).toBe('Long late')
  })
})

describe('getScheduleContextSubtitle', () => {
  it('off_before_first_night differs from transition_day_to_night', () => {
    const transition = getScheduleContextSubtitle(
      meta({
        shiftType: 'night',
        guidanceMode: 'transition_day_to_night',
        scheduleReason: ['transition_day_to_night', 'biological_night_policy'],
      }),
    )
    const offBefore = getScheduleContextSubtitle(
      meta({
        shiftType: 'off',
        offDayContext: 'before_first_night',
        scheduleReason: ['off_before_first_night', 'biological_night_policy'],
      }),
    )
    expect(transition).toBe('Preparing your meals around your first night shift tonight.')
    expect(offBefore).toBe('Off today, but your meals are timed to prepare for tonight’s night shift.')
    expect(transition).not.toBe(offBefore)
  })

  it('normal off-day returns calm off-day schedule copy', () => {
    const sub = getScheduleContextSubtitle(
      meta({
        shiftType: 'off',
        offDayContext: 'normal_off',
        scheduleReason: ['off_normal'],
      }),
    )
    expect(sub).toBe('Off-day meal rhythm.')
  })
})
