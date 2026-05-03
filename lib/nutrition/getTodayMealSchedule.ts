import {
  isMorningNightShiftEndLocal,
  mealFallsInExpectedSleepWindow,
  NO_MEAL_MS_AFTER_NIGHT_SHIFT_END,
  pickLoggedWakeAfterMorningShiftEnd,
} from '@/lib/nutrition/nightShiftMorningEndMeals'
import { applyBiologicalNightMealPolicy } from '@/lib/nutrition/applyBiologicalNightMealPolicy'
import { applyLongLatePostShiftSoftPolicy } from '@/lib/nutrition/applyLongLatePostShiftSoftPolicy'
import type { MealSchedulePlannerProvenance } from '@/lib/nutrition/mealScheduleProvenance'
import type { GuidanceMode, OffDayContext } from '@/lib/shift-context/types'

const MS_H = 60 * 60 * 1000

/** Wall-clock shift length in hours (can exceed 24 if roster spans long). */
export function shiftDurationHours(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return ms / MS_H
}

/** Long day shifts (10h+) use on-shift main + light fuel instead of crowding two meals right after clock-off. */
export const LONG_DAY_SHIFT_MIN_HOURS = 10

/** Long late shifts (10h+) spread fuel on shift and keep post-finish bites light after midnight / very late. */
export const LONG_LATE_SHIFT_MIN_HOURS = 10

/** On rest days, last main meal should not run past 19:00 local; keeps snack ordered before dinner. */
function applyOffDayLastMealCap(
  slots: MealSlot[],
  wake: Date,
  fmt: (d: Date) => string,
  window: (start: Date, hours?: number) => string,
) {
  const dinner = slots.find((s) => s.id === 'dinner')
  if (!dinner) return

  const cap = new Date(
    dinner.time.getFullYear(),
    dinner.time.getMonth(),
    dinner.time.getDate(),
    19,
    0,
    0,
    0,
  )
  if (dinner.time.getTime() > cap.getTime()) {
    dinner.time = new Date(cap)
    dinner.hint =
      'On days off, aim to finish your last main meal by 19:00 so your evening wind-down and sleep drive stay on track.'
    dinner.windowLabel = window(dinner.time, 1)
  }

  const snack = slots.find((s) => s.id === 'daySnack')
  if (snack && snack.time.getTime() >= dinner.time.getTime() - 45 * 60 * 1000) {
    snack.time = new Date(dinner.time.getTime() - 2 * MS_H)
    const lunch = slots.find((s) => s.id === 'lunch')
    const minSnack = lunch ? lunch.time.getTime() + 2 * MS_H : snack.time.getTime()
    if (snack.time.getTime() < minSnack) snack.time = new Date(minSnack)
    snack.windowLabel = window(snack.time, 0.5)
  }
}

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
  /** Set by {@link applyBiologicalNightMealPolicy} for overnight slots. */
  role?: 'overnight_light_fuel' | string
  biologicalNight?: boolean
  kcalCapped?: boolean
}

/** Which branch of the meal planner actually ran (may differ from requested shift when times are missing). */
export type MealScheduleTemplate = 'off' | 'day' | 'night' | 'late'

export type GetTodayMealScheduleResult = {
  slots: MealSlot[]
  templateUsed: MealScheduleTemplate
  provenance: MealSchedulePlannerProvenance
}

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
  /** Refined off-day pattern; `shiftStart`/`shiftEnd` should be the upcoming night when `before_first_night` / `between_nights`. */
  offDayContext?: OffDayContext | null
}): GetTodayMealScheduleResult {
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
  let longShiftDay = false
  let longShiftLate = false
  /** Which off-day branch actually ran (only for `shiftType === 'off'`). */
  let ranOffContext: OffDayContext | null = null

  function fillOffNightBridgeSlots(
    nightStart: Date,
    variant: 'before_first_night' | 'between_nights',
  ) {
    const preShiftHours = variant === 'between_nights' ? 3 : 3.5
    const breakfast = addH(wake, 1)
    const preShift = addH(nightStart, -preShiftHours)
    const minAfterBreakfast = addH(breakfast, 2)
    const maxBeforePre = addH(preShift, -2.5)
    let lunch = addH(wake, 5)
    lunch = new Date(
      Math.max(minAfterBreakfast.getTime(), Math.min(lunch.getTime(), maxBeforePre.getTime())),
    )
    const gapHours = (preShift.getTime() - lunch.getTime()) / (60 * 60 * 1000)
    const napStart = addH(nightStart, -5.5)
    const preNapSnack = addH(napStart, -0.5)
    const midShift = addH(nightStart, 4.5)
    const overnightSnack = addH(nightStart, 7.5)

    const lunchHint =
      variant === 'between_nights'
        ? 'Balanced fuel between night blocks — not too heavy if you are catching day sleep.'
        : 'Keep this balanced and not too heavy before your nap or rest window.'
    const lunchSub =
      variant === 'between_nights'
        ? 'Off day between nights — keep afternoon fuel sensible if you are sleeping then.'
        : 'Keep this balanced and not too heavy before your nap.'

    pushUniqueSlot(slots, {
      id: 'breakfast',
      label: 'Light breakfast',
      time: breakfast,
      windowLabel: window(breakfast, 0.75),
      caloriesTarget: toKcal(0.10),
      hint: 'Very light within about an hour of waking — not your main pre-night meal.',
      subtitle: 'Very light within about an hour of waking — not your main pre-night meal.',
    })
    pushUniqueSlot(slots, {
      id: 'lunch',
      label: 'Lunch',
      time: lunch,
      windowLabel: window(lunch, 1),
      caloriesTarget: toKcal(0.27),
      hint: lunchHint,
      subtitle: lunchSub,
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
      caloriesTarget: toKcal(0.33),
      hint: 'Main meal roughly 3–4 hours before clock-in so you are not still digesting heavily on the way in.',
      subtitle: 'Largest meal of the day — timed well before your night shift starts.',
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
  }

  if (opts.shiftType === 'off') {
    templateUsed = 'off'
    const requested = opts.offDayContext ?? 'normal_off'
    const hasNightBounds =
      Boolean(start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))

    if (requested === 'after_final_night') {
      ranOffContext = 'after_final_night'
      const bf = addH(wake, 0.5)
      const lu = addH(wake, 4.5)
      const sn = addH(wake, 7.25)
      const di = addH(wake, 10)
      slots.push(
        {
          id: 'breakfast',
          label: 'Light breakfast',
          time: bf,
          windowLabel: window(bf, 1),
          caloriesTarget: toKcal(0.22),
          hint: 'Easy start after nights — keep portions lighter if you are still sleepy.',
        },
        {
          id: 'lunch',
          label: 'Lunch',
          time: lu,
          windowLabel: window(lu, 1),
          caloriesTarget: toKcal(0.32),
          hint: 'Balanced midday fuel as you settle back toward daytime rhythm.',
        },
        {
          id: 'daySnack',
          label: 'Afternoon snack',
          time: sn,
          windowLabel: window(sn, 0.5),
          caloriesTarget: toKcal(0.12),
          hint: 'Light top-up — keep it easy if you are protecting sleep tonight.',
        },
        {
          id: 'dinner',
          label: 'Dinner',
          time: di,
          windowLabel: window(di, 1),
          caloriesTarget: toKcal(0.34),
          hint: 'Move gently toward a normal day pattern — avoid a very heavy ultra-late feast if sleep is soon.',
        },
      )
    } else if (
      (requested === 'before_first_night' || requested === 'between_nights') &&
      hasNightBounds &&
      start
    ) {
      ranOffContext = requested
      fillOffNightBridgeSlots(start, requested)
    } else {
      ranOffContext = 'normal_off'
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
      applyOffDayLastMealCap(slots, wake, fmt, window)
    }
  } else if (opts.shiftType === 'day' && start && end) {
    templateUsed = 'day'
    const durH = shiftDurationHours(start, end)

    if (durH >= LONG_DAY_SHIFT_MIN_HOURS) {
      longShiftDay = true
      // 10h+ day: first meal before shift, main ~start+4.5h, light ~start+8h, post ~end+45–60min — no second evening bite crowding post-shift.
      let pre = addH(wake, 0.5)
      if (pre.getTime() >= start.getTime()) {
        pre = addH(start, -1.5)
      }

      let mainOn = addH(start, 4.5)
      if (mainOn.getTime() >= end.getTime()) {
        mainOn = new Date((start.getTime() + end.getTime()) / 2)
      }

      let lightOn = addH(start, 8)
      const lastOnShift = addH(end, -1)
      if (lightOn.getTime() >= end.getTime()) {
        lightOn = new Date((mainOn.getTime() + lastOnShift.getTime()) / 2)
      }
      if (lightOn.getTime() <= mainOn.getTime()) {
        lightOn = addH(mainOn, Math.min(2, Math.max(0.5, (end.getTime() - mainOn.getTime()) / MS_H / 2)))
      }

      const post = addH(end, 0.75)

      slots.push(
        {
          id: 'preShift',
          label: 'Pre‑shift breakfast',
          time: pre,
          windowLabel: window(pre, 1),
          caloriesTarget: toKcal(0.27),
          hint: 'First fuel before work — protein-forward when you can sit down.',
        },
        {
          id: 'midShift',
          label: 'Main on-shift meal',
          time: mainOn,
          windowLabel: window(mainOn, 1),
          caloriesTarget: toKcal(0.33),
          hint: 'Largest energy block while you are still on shift — balanced plate.',
        },
        {
          id: 'daySnack',
          label: 'Light on-shift fuel',
          time: lightOn,
          windowLabel: window(lightOn, 0.75),
          caloriesTarget: toKcal(0.12),
          hint: 'Small top-up before the home stretch — not a heavy sit-down meal.',
        },
        {
          id: 'dinner',
          label: 'Post-shift meal',
          time: post,
          windowLabel: window(post, 1),
          caloriesTarget: toKcal(0.28),
          hint: 'Recovery meal after you finish — aim about 45–90 minutes after clock-off, then wind down.',
        },
      )
    } else {
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
    }
  } else if (
    opts.shiftType === 'night' &&
    start &&
    opts.guidanceMode === 'transition_day_to_night'
  ) {
    templateUsed = 'night'
    // First fuel after sleep: ~1h post-wake, intentionally light — not the pre-night main meal.
    const breakfast = addH(wake, 1)
    const preShift = addH(start, -3.5)
    const minAfterBreakfast = addH(breakfast, 2)
    const maxBeforePre = addH(preShift, -2.5)
    let lunch = addH(wake, 5)
    lunch = new Date(
      Math.max(minAfterBreakfast.getTime(), Math.min(lunch.getTime(), maxBeforePre.getTime())),
    )
    const gapHours = (preShift.getTime() - lunch.getTime()) / (60 * 60 * 1000)
    const napStart = addH(start, -5.5)
    const preNapSnack = addH(napStart, -0.5)
    const midShift = addH(start, 4.5)
    const overnightSnack = addH(start, 7.5)

    pushUniqueSlot(slots, {
      id: 'breakfast',
      label: 'Light breakfast',
      time: breakfast,
      windowLabel: window(breakfast, 0.75),
      caloriesTarget: toKcal(0.10),
      hint: 'Very light within about an hour of waking — fluids, small protein, easy carbs (not your main pre-night meal).',
      subtitle: 'Very light within about an hour of waking — not your main pre-night meal.',
    })
    pushUniqueSlot(slots, {
      id: 'lunch',
      label: 'Lunch',
      time: lunch,
      windowLabel: window(lunch, 1),
      caloriesTarget: toKcal(0.27),
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
      caloriesTarget: toKcal(0.33),
      hint: 'Main meal roughly 3–4 hours before clock-in so you are not still digesting heavily on the way in.',
      subtitle: 'Largest meal of the day — timed well before your night shift starts.',
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
    const durH = shiftDurationHours(start, end)
    if (durH >= LONG_LATE_SHIFT_MIN_HOURS) {
      longShiftLate = true
      const first = addH(wake, 0.5)
      let earlyMain = addH(start, -1)
      const minAfterFirst = addH(first, 1.25)
      if (earlyMain.getTime() < minAfterFirst.getTime()) {
        earlyMain = addH(start, 2)
      }
      if (earlyMain.getTime() >= start.getTime()) {
        earlyMain = addH(start, 1)
      }

      let mainOn = addH(start, 4.5)
      if (mainOn.getTime() >= end.getTime() - MS_H) {
        mainOn = new Date((start.getTime() + end.getTime()) / 2)
      }
      const gapEarlyMainH = (mainOn.getTime() - earlyMain.getTime()) / MS_H
      const includeEarlyMain = gapEarlyMainH >= 2

      let lightLate = addH(end, -1.5)
      const lastOnShift = addH(end, -0.5)
      if (lightLate.getTime() >= end.getTime()) {
        lightLate = addH(end, -1)
      }
      if (lightLate.getTime() <= mainOn.getTime()) {
        lightLate = new Date((mainOn.getTime() + lastOnShift.getTime()) / 2)
      }

      const post = addH(end, 0.75)

      const firstPct = includeEarlyMain ? 0.22 : 0.23
      const lunchPct = includeEarlyMain ? 0.18 : 0
      const mainPct = includeEarlyMain ? 0.34 : 0.49
      const lightPct = 0.13
      /** Slightly above strict post cap so very-late finish can trim to ~13% and move kcal to main. */
      const postPct = includeEarlyMain ? 0.13 : 0.15

      slots.push(
        {
          id: 'preShift',
          label: 'First meal after waking',
          time: first,
          windowLabel: window(first, 1),
          caloriesTarget: toKcal(firstPct),
          hint: 'Protein-forward start — easy to digest before your long late block.',
        },
      )
      if (includeEarlyMain) {
        slots.push(
          {
            id: 'lunch',
            label: 'Early on-shift main',
            time: earlyMain,
            windowLabel: window(earlyMain, 1),
            caloriesTarget: toKcal(lunchPct),
            hint: 'Solid fuel well before the busiest stretch of your late shift.',
          },
        )
      }
      slots.push(
        {
          id: 'midShift',
          label: 'Main on-shift meal',
          time: mainOn,
          windowLabel: window(mainOn, 1),
          caloriesTarget: toKcal(mainPct),
          hint: 'Largest energy block while you are still on shift — balanced plate.',
        },
        {
          id: 'nightSnack',
          label: 'Light late-shift fuel',
          time: lightLate,
          windowLabel: window(lightLate, 0.75),
          caloriesTarget: toKcal(lightPct),
          hint: 'Small top-up before clock-off — not a heavy sit-down meal.',
        },
        {
          id: 'dinner',
          label: 'Post-shift meal',
          time: post,
          windowLabel: window(post, 1),
          caloriesTarget: toKcal(postPct),
          hint: 'Recovery fuel after you finish — kept modest if your finish is very late.',
        },
      )
    } else {
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
    }
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
    applyOffDayLastMealCap(slots, wake, fmt, window)
  }

  slots.sort((a, b) => a.time.getTime() - b.time.getTime())

  if (opts.shiftType === 'night') {
    applyBiologicalNightMealPolicy(slots, { shiftType: opts.shiftType, adjustedCalories: total })
  } else if (
    opts.shiftType === 'off' &&
    (ranOffContext === 'before_first_night' || ranOffContext === 'between_nights')
  ) {
    applyBiologicalNightMealPolicy(slots, {
      shiftType: 'off',
      adjustedCalories: total,
      offDayContext: ranOffContext,
    })
  }

  let longLatePostSoftApplied = false
  if (opts.shiftType === 'late' && longShiftLate) {
    longLatePostSoftApplied = applyLongLatePostShiftSoftPolicy(slots, total)
  }

  const transitionDayToNight = opts.guidanceMode === 'transition_day_to_night'
  const preNightShift = opts.guidanceMode === 'pre_night_shift'
  const biologicalNightPolicyApplied =
    opts.shiftType === 'night' ||
    (opts.shiftType === 'off' &&
      (ranOffContext === 'before_first_night' || ranOffContext === 'between_nights')) ||
    longLatePostSoftApplied
  const provenance: MealSchedulePlannerProvenance = {
    longShiftDay,
    longShiftLate,
    biologicalNightPolicyApplied,
    transitionDayToNight,
    preNightShift,
    offDayContext: opts.shiftType === 'off' ? ranOffContext ?? 'normal_off' : null,
  }

  return { slots, templateUsed, provenance }
}
