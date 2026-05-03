import { describe, it, expect } from 'vitest'
import { applyUserShiftStateToMealTimingJson } from '@/lib/nutrition/applyUserShiftStateToMealTiming'
import { buildServerMealScheduleMeta } from '@/lib/nutrition/mealScheduleProvenance'
import type { UserShiftState } from '@/lib/shift-agent/types'

function baseMeals() {
  return [
    {
      id: 'breakfast',
      label: 'Breakfast',
      time: '07:30',
      windowLabel: '—',
      calories: 400,
      hint: 'x',
      macros: { protein: 20, carbs: 40, fats: 12 },
    },
    {
      id: 'lunch',
      label: 'Lunch',
      time: '12:00',
      windowLabel: '—',
      calories: 500,
      hint: 'x',
      macros: { protein: 25, carbs: 50, fats: 15 },
    },
    {
      id: 'daySnack',
      label: 'Snack',
      time: '15:00',
      windowLabel: '—',
      calories: 200,
      hint: 'x',
      macros: { protein: 8, carbs: 20, fats: 6 },
    },
    {
      id: 'dinner',
      label: 'Dinner',
      time: '19:00',
      windowLabel: '—',
      calories: 400,
      hint: 'x',
      macros: { protein: 20, carbs: 40, fats: 12 },
    },
  ]
}

function dayUserState(wakeEnd: Date): UserShiftState {
  const d = wakeEnd.getDate()
  const m = wakeEnd.getMonth()
  const y = wakeEnd.getFullYear()
  return {
    patternType: 'rotating',
    currentMode: 'DAY_NORMAL',
    activeTransition: null,
    mealWindows: {
      meal1: new Date(y, m, d, 8, 0),
      meal2: new Date(y, m, d, 12, 0),
      anchorMeal: new Date(y, m, d, 18, 0),
      shiftSnack1: new Date(y, m, d, 21, 0),
      shiftSnack2: null,
    },
    sleepWindows: {
      primarySleep: {
        start: new Date(y, m, d - 1, 23, 0),
        end: wakeEnd,
      },
      napWindow: null,
    },
    lastCalculated: new Date(y, m, d, 10, 0),
  }
}

describe('applyUserShiftStateToMealTimingJson — mealScheduleMeta', () => {
  it('leaves server transition_day_to_night payload untouched (no client_overlay)', () => {
    const now = new Date(2026, 5, 10, 12, 0)
    const serverMeta = buildServerMealScheduleMeta({
      provenance: {
        longShiftDay: false,
        longShiftLate: false,
        biologicalNightPolicyApplied: true,
        transitionDayToNight: true,
        preNightShift: false,
        offDayContext: null,
      },
      shiftType: 'night',
      guidanceMode: 'transition_day_to_night',
      rhythmMode: 'transition_to_night',
      templateUsed: 'night',
    })
    const apiInput = {
      totalCalories: 2000,
      totalMacros: { protein_g: 80, carbs_g: 200, fat_g: 60 },
      shiftType: 'night',
      meals: baseMeals(),
      mealScheduleMeta: serverMeta,
      shiftContext: { guidanceMode: 'transition_day_to_night' },
    }
    const state: UserShiftState = {
      ...dayUserState(new Date(2026, 5, 10, 8, 0)),
      currentMode: 'TRANSITIONING',
      activeTransition: {
        from: 'day',
        to: 'night',
        severity: 'moderate',
        napRecommended: true,
        sleepAnchorShift: 0,
        recoveryHours: 0,
        nextShiftStart: new Date(2026, 5, 10, 22, 0),
        transitionStarted: new Date(2026, 5, 10, 6, 0),
      },
    }
    const out = applyUserShiftStateToMealTimingJson(apiInput, state, now)
    expect(out).toBe(apiInput)
    expect((out as { mealScheduleMeta?: { scheduleSource?: string } }).mealScheduleMeta?.scheduleSource).toBe(
      'server',
    )
  })

  it('marks DAY_NORMAL recompute as client_overlay with original server meta', () => {
    const now = new Date(2026, 5, 10, 10, 0)
    const wakeEnd = new Date(2026, 5, 10, 7, 30)
    const serverMeta = buildServerMealScheduleMeta({
      provenance: {
        longShiftDay: false,
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
    const apiInput = {
      totalCalories: 2000,
      totalMacros: { protein_g: 80, carbs_g: 200, fat_g: 60 },
      shiftType: 'day',
      meals: baseMeals(),
      mealScheduleMeta: serverMeta,
      shiftContext: { guidanceMode: 'day_shift' },
      mealPlanInputs: {
        shiftType: 'day',
        shiftStartIso: new Date(2026, 5, 10, 9, 0).toISOString(),
        shiftEndIso: new Date(2026, 5, 10, 17, 0).toISOString(),
        wakeTimeIso: wakeEnd.toISOString(),
      },
    }
    const out = applyUserShiftStateToMealTimingJson(apiInput, dayUserState(wakeEnd), now)
    expect(out).not.toBe(apiInput)
    const meta = (out as { mealScheduleMeta?: Record<string, unknown> }).mealScheduleMeta
    expect(meta?.scheduleSource).toBe('client_overlay')
    expect(meta?.scheduleReason).toEqual(expect.arrayContaining(['standard_day', 'client_day_normal_overlay']))
    const orig = meta?.originalMealScheduleMeta as { scheduleSource?: string } | null
    expect(orig?.scheduleSource).toBe('server')
  })

  it('TRANSITIONING with non-transition guidance uses client_transition_overlay', () => {
    const now = new Date(2026, 5, 10, 12, 0)
    const serverMeta = buildServerMealScheduleMeta({
      provenance: {
        longShiftDay: false,
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
    const apiInput = {
      totalCalories: 2000,
      totalMacros: { protein_g: 80, carbs_g: 200, fat_g: 60 },
      shiftType: 'day',
      meals: baseMeals(),
      mealScheduleMeta: serverMeta,
      shiftContext: { guidanceMode: 'day_shift' },
    }
    const state: UserShiftState = {
      ...dayUserState(new Date(2026, 5, 10, 7, 30)),
      currentMode: 'TRANSITIONING',
      activeTransition: {
        from: 'day',
        to: 'night',
        severity: 'moderate',
        napRecommended: true,
        sleepAnchorShift: 0,
        recoveryHours: 0,
        nextShiftStart: new Date(2026, 5, 10, 22, 0),
        transitionStarted: new Date(2026, 5, 10, 6, 0),
      },
    }
    const out = applyUserShiftStateToMealTimingJson(apiInput, state, now)
    expect(out).not.toBe(apiInput)
    const meta = (out as { mealScheduleMeta?: Record<string, unknown> }).mealScheduleMeta
    expect(meta?.scheduleSource).toBe('client_overlay')
    expect(meta?.scheduleReason).toEqual(expect.arrayContaining(['client_transition_overlay']))
  })

  it('RECOVERING uses client_recovery_overlay', () => {
    const now = new Date(2026, 5, 10, 12, 0)
    const serverMeta = buildServerMealScheduleMeta({
      provenance: {
        longShiftDay: false,
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
    const apiInput = {
      totalCalories: 2000,
      totalMacros: { protein_g: 80, carbs_g: 200, fat_g: 60 },
      shiftType: 'day',
      meals: baseMeals(),
      mealScheduleMeta: serverMeta,
      shiftContext: { guidanceMode: 'day_shift' },
    }
    const state: UserShiftState = {
      ...dayUserState(new Date(2026, 5, 10, 7, 30)),
      currentMode: 'RECOVERING',
      activeTransition: null,
    }
    const out = applyUserShiftStateToMealTimingJson(apiInput, state, now)
    const meta = (out as { mealScheduleMeta?: Record<string, unknown> }).mealScheduleMeta
    expect(meta?.scheduleSource).toBe('client_overlay')
    expect(meta?.scheduleReason).toEqual(expect.arrayContaining(['client_recovery_overlay']))
  })
})
