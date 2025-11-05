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
}

export function getTodayMealSchedule(opts: {
  adjustedCalories: number
  shiftType: 'day' | 'night' | 'late' | 'off'
  shiftStart?: Date
  shiftEnd?: Date
  wakeTime: Date
}): MealSlot[] {
  const total = Math.max(1200, Math.round(opts.adjustedCalories || 0))
  const toKcal = (pct: number) => Math.round(total * pct)
  const addH = (d: Date, h: number) => new Date(d.getTime() + h * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const window = (start: Date, hours = 1) => `${fmt(start)}–${fmt(addH(start, hours))}`

  const slots: MealSlot[] = []
  const wake = opts.wakeTime
  const start = opts.shiftStart
  const end = opts.shiftEnd

  if (opts.shiftType === 'off') {
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
    const pre = addH(wake, 0.5)
    const mid = new Date((start.getTime() + end.getTime()) / 2)
    const post = addH(end, 1)
    const eve = addH(end, 4)
    slots.push(
      { id: 'preShift', label: 'Pre‑shift breakfast', time: pre, windowLabel: window(pre, 1), caloriesTarget: toKcal(0.25), hint: 'Fuel before work' },
      { id: 'midShift', label: 'Mid‑shift meal', time: mid, windowLabel: window(mid, 1), caloriesTarget: toKcal(0.40), hint: 'Main energy block' },
      { id: 'daySnack', label: 'Post‑shift snack', time: post, windowLabel: window(post, 0.75), caloriesTarget: toKcal(0.15), hint: 'Recovery snack' },
      { id: 'dinner', label: 'Light evening meal', time: eve, windowLabel: window(eve, 1), caloriesTarget: toKcal(0.20), hint: 'Lighter evening' },
    )
  } else if (opts.shiftType === 'night' && start && end) {
    const pre = addH(start, -2.5)
    const early = addH(start, 2)
    const bodyNight = new Date(pre)
    bodyNight.setHours(2, 0, 0, 0)
    const post = addH(end, 1)
    const daySnack = addH(post, 6)
    slots.push(
      { id: 'preShift', label: 'Pre‑shift meal', time: pre, windowLabel: window(pre, 1), caloriesTarget: toKcal(0.35), hint: 'Largest before shift' },
      { id: 'midShift', label: 'Early‑shift snack', time: early, windowLabel: window(early, 0.75), caloriesTarget: toKcal(0.25), hint: 'Keep steady' },
      { id: 'nightSnack', label: 'Body‑night snack', time: bodyNight, windowLabel: window(bodyNight, 0.5), caloriesTarget: toKcal(0.10), hint: 'Very light' },
      { id: 'postShiftBreakfast', label: 'Post‑shift breakfast', time: post, windowLabel: window(post, 1), caloriesTarget: toKcal(0.20), hint: 'Before sleep' },
      { id: 'daySnack', label: 'Day snack (optional)', time: daySnack, windowLabel: window(daySnack, 0.5), caloriesTarget: toKcal(0.10), hint: 'Only if needed' },
    )
  } else if (opts.shiftType === 'late' && start && end) {
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
    // fallback similar to off day
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

  // Sort chronologically
  slots.sort((a, b) => a.time.getTime() - b.time.getTime())
  return slots
}


