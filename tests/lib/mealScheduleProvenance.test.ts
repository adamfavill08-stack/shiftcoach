import { describe, it, expect } from 'vitest'
import {
  buildMealScheduleReasons,
  buildServerMealScheduleMeta,
} from '@/lib/nutrition/mealScheduleProvenance'

describe('mealScheduleProvenance', () => {
  it('buildServerMealScheduleMeta marks server source and long day', () => {
    const meta = buildServerMealScheduleMeta({
      provenance: {
        longShiftDay: true,
        longShiftLate: false,
        biologicalNightPolicyApplied: false,
        transitionDayToNight: false,
        preNightShift: false,
        offDayContext: null,
      },
      shiftType: 'day',
      guidanceMode: 'day_shift',
      rhythmMode: 'day_rhythm',
      templateUsed: 'day',
    })
    expect(meta.scheduleSource).toBe('server')
    expect(meta.longShift).toBe(true)
    expect(meta.scheduleReason).toContain('long_day')
    expect(meta.scheduleReason).not.toContain('biological_night_policy')
    expect(meta.longShiftLate).toBe(false)
  })

  it('buildServerMealScheduleMeta exposes longShiftLate for long late shifts', () => {
    const meta = buildServerMealScheduleMeta({
      provenance: {
        longShiftDay: false,
        longShiftLate: true,
        biologicalNightPolicyApplied: true,
        transitionDayToNight: false,
        preNightShift: false,
        offDayContext: null,
      },
      shiftType: 'late',
      guidanceMode: 'day_shift',
      rhythmMode: 'day_rhythm',
      templateUsed: 'late',
    })
    expect(meta.longShiftLate).toBe(true)
    expect(meta.scheduleReason).toContain('long_late')
    expect(meta.scheduleReason).toContain('biological_night_policy')
  })

  it('buildMealScheduleReasons adds biological_night_policy when planner flag is set', () => {
    expect(
      buildMealScheduleReasons(
        {
          longShiftDay: false,
          longShiftLate: false,
          biologicalNightPolicyApplied: true,
          transitionDayToNight: false,
          preNightShift: false,
          offDayContext: null,
        },
        'night',
      ),
    ).toEqual(expect.arrayContaining(['standard_night', 'biological_night_policy']))
  })

  it('buildMealScheduleReasons uses transition_day_to_night over standard_night', () => {
    const reasons = buildMealScheduleReasons(
      {
        longShiftDay: false,
        longShiftLate: false,
        biologicalNightPolicyApplied: true,
        transitionDayToNight: true,
        preNightShift: false,
        offDayContext: null,
      },
      'night',
    )
    expect(reasons).toContain('transition_day_to_night')
    expect(reasons).not.toContain('standard_night')
  })

  it('buildMealScheduleReasons uses off_normal vs off_between_nights', () => {
    expect(
      buildMealScheduleReasons(
        {
          longShiftDay: false,
          longShiftLate: false,
          biologicalNightPolicyApplied: false,
          transitionDayToNight: false,
          preNightShift: false,
          offDayContext: 'normal_off',
        },
        'off',
      ),
    ).toContain('off_normal')
    expect(
      buildMealScheduleReasons(
        {
          longShiftDay: false,
          longShiftLate: false,
          biologicalNightPolicyApplied: true,
          transitionDayToNight: false,
          preNightShift: false,
          offDayContext: 'between_nights',
        },
        'off',
      ),
    ).toEqual(expect.arrayContaining(['off_between_nights', 'biological_night_policy']))
  })

  it('buildMealScheduleReasons uses long_late vs standard_late', () => {
    expect(
      buildMealScheduleReasons(
        {
          longShiftDay: false,
          longShiftLate: true,
          biologicalNightPolicyApplied: false,
          transitionDayToNight: false,
          preNightShift: false,
          offDayContext: null,
        },
        'late',
      ),
    ).toContain('long_late')
    expect(
      buildMealScheduleReasons(
        {
          longShiftDay: false,
          longShiftLate: false,
          biologicalNightPolicyApplied: false,
          transitionDayToNight: false,
          preNightShift: false,
          offDayContext: null,
        },
        'late',
      ),
    ).toContain('standard_late')
  })
})
