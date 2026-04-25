import {
  isMorningNightShiftEndLocal,
  mealFallsInExpectedSleepWindow,
  NO_MEAL_MS_AFTER_NIGHT_SHIFT_END,
  pickLoggedWakeAfterMorningShiftEnd,
} from '@/lib/nutrition/nightShiftMorningEndMeals'
import type { GuidanceMode } from '@/lib/shift-context/types'

export type MealSlotId =
  | 'breakfast'
  | 'preShift'
  | 'midShift'
  | 'nightSnack'
  | 'postShiftBreakfast'
  | 'lunch'
  | 'dinner'
  | 'daySnack'

export type MealSlot = {
  id: MealSlotId
  label: string
  time: Date
  windowLabel: string
  caloriesTarget: number
  hint: string
  /** Extra line under the label (e.g. wake assumption for night-shift morning ends). */
  subtitle?: string
}

/** Which branch of the meal planner actually ran (may differ from requested shift when times are missing). */
export type MealScheduleTemplate = 'off' | 'day' | 'night' | 'late'

export function getTodayMealSchedule(opts: {
  adjustedCalories: number
  shiftType: 'day' | 'night' | 'late' | 'off'
  shiftStart?: Date
  shiftEnd?: Date
  wakeTime: Date
  guidanceMode?: GuidanceMode
  /** Used when night shift ends early morning; from profile + recent sleep averages. */
  expectedSleepHours?: number
  /** Latest logged sleep end if it qualifies as wake after this shift end (early-morning night end only). */
  loggedWakeAfterShift?: Date | null
}): { slots: MealSlot[]; templateUsed: MealScheduleTemplate } {
  function pushUniqueSlot(slots: MealSlot[], slot: MealSlot, minGapMinutes = 45) {
    const t = slot.time.getTime()
    const overlaps = slots.some(
      s => Math.abs(s.time.getTime() - t) < minGapMinutes * 60_000
    )
    if (!overlaps) slots.push(slot)
  }

  const total = Math.max(1200, Math.round(opts.adjustedCalories || 0))
  const toKcal = (pct: number) => Math.round(total * pct)
  const addH = (d: Date, h: number) => new Date(d.getTime() + h * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const window = (start: Date, hours = 1) => `${fmt(start)}–${fmt(addH(start, hours))}`

  const slots: MealSlot[] = []
  const wake =
    opts.wakeTime && !Number.isNaN(opts.wakeTime.getTime()) ? opts.wakeTime : new Date()
  const start = opts.shiftStart
  const end = opts.shiftEnd
  let templateUsed: MealScheduleTemplate = 'off'

  if (opts.shiftType === 'off') {
    templateUsed = 'off'
    const s1 = addH(wake, 0.5)
    const s2 = addH(wake, 5.5)
    const s3 = addH(wake, 8)
    const s4 = addH(wake, 10.5)
    slots.push(
      { id: 'breakfast', label: 'Breakfast', time: s1, windowLabel: window(s1, 1), caloriesTarget: toKcal(0.30), hint: 'Protein-forward start' },
      { id: 'lunch', label: 'Lunch', time: s2, windowLabel: window(s2, 1), caloriesTarget: toKcal(0.35), hint: 'Balanced plate' },
      { id: 'daySnack', label: 'Snack', time: s3, windowLabel: window(s3, 0.5), caloriesTarget: toKcal(0.10), hint: 'Light, keep energy steady' },
      { id: 'dinner', label: 'Dinner', time: s4, windowLabel: window(s4, 1), caloriesTarget: toKcal(0.25), hint: 'Lighter evening' },
    )
  } else if (opts.shiftType === 'day' && start && end) {
    templateUsed = 'day'
    const pre = addH(wake, 0.5)
    const mid = new Date((start.getTime() + end.getTime()) / 2)
    // Hunger hits soon after clocking off — put most post-work calories in the first slot.
    // Second slot stays small and earlier (not late) so it’s easy before bed.
    const post = addH(end, 0.28)
    const eve = addH(end, 0.78)
    slots.push(
      { id: 'preShift', label: 'Pre‑shift breakfast', time: pre, windowLabel: window(pre, 1), caloriesTarget: toKcal(0.25), hint: 'Fuel before work' },
      { id: 'midShift', label: 'Mid‑shift meal', time: mid, windowLabel: window(mid, 1), caloriesTarget: toKcal(0.40), hint: 'Main energy block' },
      {
        id: 'daySnack',
        label: 'Post‑shift meal',
        time: post,
        windowLabel: window(post, 1),
        caloriesTarget: toKcal(0.24),
        hint: 'When hunger peaks after work — balanced plate, not a heavy late feast',
      },
      {
        id: 'dinner',
        label: 'Light evening bite',
        time: eve,
        windowLabel: window(eve, 0.75),
        caloriesTarget: toKcal(0.11),
        hint: 'Optional small portion if you still want something before wind‑down',
      },
    )
  } else if (
    opts.shiftType === 'night' &&
    start &&
    opts.guidanceMode === 'transition_day_to_night'
  ) {
    templateUsed = 'night'
    const breakfast = addH(wake, 0.5)
    const lunch = addH(wake, 5)
    const preShift = addH(start, -2.25)
    const gapHours = (preShift.getTime() - lunch.getTime()) / (60 * 60 * 1000)
    const napStart = addH(start, -5.5)
    const preNapSnack = addH(napStart, -0.5)
    const midShift = addH(start, 4.5)
    const overnightSnack = addH(start, 7.5)

    pushUniqueSlot(slots, {
      id: 'breakfast',
      label: 'Breakfast',
      time: breakfast,
      windowLabel: window(breakfast, 1),
      caloriesTarget: toKcal(0.20),
      hint: 'Eat soon after waking to anchor your normal day before nights.',
      subtitle: 'Eat soon after waking to anchor your normal day before nights.',
    })
    pushUniqueSlot(slots, {
      id: 'lunch',
      label: 'Lunch',
      time: lunch,
      windowLabel: window(lunch, 1),
      caloriesTarget: toKcal(0.25),
      hint: 'Keep this balanced and not too heavy before your nap.',
      subtitle: 'Keep this balanced and not too heavy before your nap.',
    })

    if (gapHours > 4) {
      pushUniqueSlot(slots, {
        id: 'daySnack',
        label: 'Pre-nap snack',
        time: preNapSnack,
        windowLabel: window(preNapSnack, 0.5),
        caloriesTarget: toKcal(0.10),
        hint: 'Small snack only, so sleep is not disrupted.',
        subtitle: 'Small snack only, so sleep is not disrupted.',
      })
    }

    pushUniqueSlot(slots, {
      id: 'preShift',
      label: 'Pre-shift meal',
      time: preShift,
      windowLabel: window(preShift, 1),
      caloriesTarget: toKcal(0.30),
      hint: 'Main meal before the night shift. Avoid making this too close to clock-in.',
      subtitle: 'Main meal before the night shift. Avoid making this too close to clock-in.',
    })
    pushUniqueSlot(slots, {
      id: 'midShift',
      label: 'Mid-shift snack',
      time: midShift,
      windowLabel: window(midShift, 0.75),
      caloriesTarget: toKcal(0.10),
      hint: 'Keep this light to reduce body-clock disruption.',
      subtitle: 'Keep this light to reduce body-clock disruption.',
    })

    const overnightGapHours = (overnightSnack.getTime() - midShift.getTime()) / (60 * 60 * 1000)
    if (overnightGapHours >= 2) {
      pushUniqueSlot(slots, {
        id: 'nightSnack',
        label: 'Optional overnight snack',
        time: overnightSnack,
        windowLabel: window(overnightSnack, 0.5),
        caloriesTarget: toKcal(0.05),
        hint: 'Only if genuinely hungry. Keep it small and easy to digest.',
        subtitle: 'Only if genuinely hungry. Keep it small and easy to digest.',
      })
    }
  } else if (opts.shiftType === 'night' && start && end) {
    templateUsed = 'night'
    const pre = addH(start, -2.5)
    const early = addH(start, 2)
    const bodyNight = new Date(pre)
    bodyNight.setHours(2, 0, 0, 0)
    // On transition/pre-night days, ensure "body-night" points to the upcoming 02:00
    // (after the pre-shift meal), not 02:00 earlier the same calendar day.
    if (bodyNight.getTime() <= pre.getTime()) {
      bodyNight.setDate(bodyNight.getDate() + 1)
    }

    if (isMorningNightShiftEndLocal(end)) {
      const sleepH = Math.min(14, Math.max(4, opts.expectedSleepHours ?? 7.5))
      const loggedWake = pickLoggedWakeAfterMorningShiftEnd(end, opts.loggedWakeAfterShift ?? null)
      const expectedWake = new Date(end.getTime() + sleepH * 60 * 60 * 1000)
      const wakeAt = loggedWake ?? expectedWake
      const postSubtitle = loggedWake
        ? `Using your logged wake · ${fmt(loggedWake)}`
        : `Assumes ~${sleepH}h sleep · wake ~${fmt(expectedWake)}`

      const wakeMealKcal = toKcal(0.20)
      const snackKcal = toKcal(0.10)

      const optionalSnackTime = addH(wakeAt, 3.5)
      const optionalInSleep = mealFallsInExpectedSleepWindow(optionalSnackTime, end, wakeAt)
      const optionalTooSoon = optionalSnackTime.getTime() <= end.getTime() + NO_MEAL_MS_AFTER_NIGHT_SHIFT_END

      const includeDaySnack = !optionalInSleep && !optionalTooSoon
      const postCalories = includeDaySnack ? wakeMealKcal : wakeMealKcal + snackKcal

      slots.push(
        { id: 'preShift', label: 'Pre‑shift meal', time: pre, windowLabel: window(pre, 1), caloriesTarget: toKcal(0.35), hint: 'Largest before shift' },
        { id: 'midShift', label: 'Early‑shift snack', time: early, windowLabel: window(early, 0.75), caloriesTarget: toKcal(0.25), hint: 'Keep steady' },
        { id: 'nightSnack', label: 'Body‑night snack', time: bodyNight, windowLabel: window(bodyNight, 0.5), caloriesTarget: toKcal(0.10), hint: 'Very light' },
        {
          id: 'postShiftBreakfast',
          label: 'Wake-up meal',
          time: wakeAt,
          windowLabel: window(wakeAt, 1),
          caloriesTarget: postCalories,
          hint: 'First meal after sleep — protein, fluids, gentle carbs',
          subtitle: postSubtitle,
        },
      )

      if (includeDaySnack) {
        slots.push({
          id: 'daySnack',
          label: 'Day snack (optional)',
          time: optionalSnackTime,
          windowLabel: window(optionalSnackTime, 0.5),
          caloriesTarget: snackKcal,
          hint: 'Only if needed',
        })
      }
    } else {
      const post = addH(end, 1)
      const daySnack = addH(post, 6)
      slots.push(
        { id: 'preShift', label: 'Pre‑shift meal', time: pre, windowLabel: window(pre, 1), caloriesTarget: toKcal(0.35), hint: 'Largest before shift' },
        { id: 'midShift', label: 'Early‑shift snack', time: early, windowLabel: window(early, 0.75), caloriesTarget: toKcal(0.25), hint: 'Keep steady' },
        { id: 'nightSnack', label: 'Body‑night snack', time: bodyNight, windowLabel: window(bodyNight, 0.5), caloriesTarget: toKcal(0.10), hint: 'Very light' },
        { id: 'postShiftBreakfast', label: 'Post‑shift breakfast', time: post, windowLabel: window(post, 1), caloriesTarget: toKcal(0.20), hint: 'Before sleep' },
        { id: 'daySnack', label: 'Day snack (optional)', time: daySnack, windowLabel: window(daySnack, 0.5), caloriesTarget: toKcal(0.10), hint: 'Only if needed' },
      )
    }
  } else if (opts.shiftType === 'late' && start && end) {
    templateUsed = 'late'
    const pre = addH(wake, 0.5)
    const mid = new Date((start.getTime() + end.getTime()) / 2)
    const lateSnack = addH(end, -1)
    const post = addH(end, 2)
    slots.push(
      { id: 'preShift', label: 'Pre‑shift meal', time: pre, windowLabel: window(pre, 1), caloriesTarget: toKcal(0.30), hint: 'Fuel up' },
      { id: 'midShift', label: 'Mid‑shift meal', time: mid, windowLabel: window(mid, 1), caloriesTarget: toKcal(0.35), hint: 'Main energy' },
      { id: 'nightSnack', label: 'Late‑shift light snack', time: lateSnack, windowLabel: window(lateSnack, 0.5), caloriesTarget: toKcal(0.10), hint: 'Keep light late' },
      { id: 'dinner', label: 'Post‑shift light meal', time: post, windowLabel: window(post, 0.75), caloriesTarget: toKcal(0.25), hint: 'Wind down' },
    )
  } else {
    templateUsed = 'off'
    const s1 = addH(wake, 0.5)
    const s2 = addH(wake, 5.5)
    const s3 = addH(wake, 8)
    const s4 = addH(wake, 10.5)
    slots.push(
      { id: 'breakfast', label: 'Breakfast', time: s1, windowLabel: window(s1, 1), caloriesTarget: toKcal(0.30), hint: 'Protein-forward start' },
      { id: 'lunch', label: 'Lunch', time: s2, windowLabel: window(s2, 1), caloriesTarget: toKcal(0.35), hint: 'Balanced plate' },
      { id: 'daySnack', label: 'Snack', time: s3, windowLabel: window(s3, 0.5), caloriesTarget: toKcal(0.10), hint: 'Light, keep energy steady' },
      { id: 'dinner', label: 'Dinner', time: s4, windowLabel: window(s4, 1), caloriesTarget: toKcal(0.25), hint: 'Lighter evening' },
    )
  }

  slots.sort((a, b) => a.time.getTime() - b.time.getTime())
  return { slots, templateUsed }
}
