/**
 * Merges GET /api/meal-timing/today JSON with shift-agent UserShiftState on the client.
 * When userShiftState is null/undefined, returns the payload unchanged (no rota / loading).
 */
import type { UserShiftState } from '@/lib/shift-agent/types'
import { getTodayMealSchedule, type MealSlot } from '@/lib/nutrition/getTodayMealSchedule'

const DAY_MS = 24 * 60 * 60 * 1000

function formatTime24(value: Date): string {
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export type MealPlanInputs = {
  shiftType: 'day' | 'night' | 'late' | 'off'
  shiftStartIso: string | null
  shiftEndIso: string | null
  wakeTimeIso: string | null
  expectedSleepHours?: number
  loggedWakeAfterShiftIso?: string | null
}

type ApiMealRow = {
  id: string
  label: string
  time: string
  dayTag?: 'today' | 'tomorrow'
  windowLabel: string
  calories: number
  hint: string
  subtitle?: string
  macros: { protein: number; carbs: number; fats: number }
  categoryLabel?: string
}

type ApiPayload = Record<string, unknown> & {
  totalCalories: number
  totalMacros: { protein_g: number; carbs_g: number; fat_g: number }
  shiftType: 'day' | 'night' | 'late' | 'off'
  meals: ApiMealRow[]
  mealPlanInputs?: MealPlanInputs
  nextMealLabel?: string
  nextMealTime?: string
  nextMealAt?: string | null
  nextMealType?: string
  nextMealSubtitle?: string | null
  nextMealMacros?: { protein: number; carbs: number; fats: number }
  coach?: {
    recommendedWindows?: { id: string; label: string; timeRange: string; focus?: string }[]
    meals?: { id: string; label: string; time: string; position: number; inWindow: boolean }[]
    tips?: { id: string; text: string }[]
    status?: string
  }
  cardSubtitle?: string | null
  shiftContext?: {
    guidanceMode?: string | null
  }
}

function pickNextMealOccurrence(mealSchedule: MealSlot[], now: Date): { slot: MealSlot; at: Date } | null {
  if (!mealSchedule.length) return null
  let best: { slot: MealSlot; at: Date } | null = null
  for (const m of mealSchedule) {
    let atMs = m.time.getTime()
    if (atMs <= now.getTime()) {
      atMs += DAY_MS
    }
    const at = new Date(atMs)
    if (!best || at.getTime() < best.at.getTime()) {
      best = { slot: m, at }
    }
  }
  return best
}

function parseTimeToMinutes(timeStr: string): number {
  let clean = timeStr.trim().toUpperCase()
  const isPM = clean.includes('PM')
  const isAM = clean.includes('AM')
  clean = clean.replace(/\s*(AM|PM)/i, '')
  const [hStr, mStr] = clean.split(':')
  let h = parseInt(hStr ?? '0', 10)
  const m = parseInt(mStr ?? '0', 10)
  if (isPM && h !== 12) h += 12
  if (isAM && h === 12) h = 0
  return h * 60 + m
}

function buildMealsWithMacros(
  mealSchedule: MealSlot[],
  totalCalories: number,
  totalMacros: { protein_g: number; carbs_g: number; fat_g: number },
  categoryLabels: (string | undefined)[],
  now: Date,
): ApiMealRow[] {
  const nowDay = new Date(now)
  nowDay.setHours(0, 0, 0, 0)
  const tomorrowDay = new Date(nowDay)
  tomorrowDay.setDate(tomorrowDay.getDate() + 1)

  return mealSchedule.map((meal, index) => {
    const mealCalorieRatio = meal.caloriesTarget / Math.max(1, totalCalories)
    const mealDay = new Date(meal.time)
    mealDay.setHours(0, 0, 0, 0)
    const dayTag: 'today' | 'tomorrow' =
      mealDay.getTime() >= tomorrowDay.getTime() ? 'tomorrow' : 'today'

    return {
      id: meal.id,
      label: meal.label,
      categoryLabel: categoryLabels[index],
      time: formatTime24(meal.time),
      dayTag,
      windowLabel: meal.windowLabel,
      calories: meal.caloriesTarget,
      hint: meal.hint,
      subtitle: meal.subtitle,
      macros: {
        protein: Math.round(totalMacros.protein_g * mealCalorieRatio),
        carbs: Math.round(totalMacros.carbs_g * mealCalorieRatio),
        fats: Math.round(totalMacros.fat_g * mealCalorieRatio),
      },
    }
  })
}

function transitionMealsFromShiftState(
  state: UserShiftState,
  baseMeals: ApiMealRow[],
  totalCalories: number,
  totalMacros: { protein_g: number; carbs_g: number; fat_g: number },
): { slots: MealSlot[]; categoryLabels: (string | undefined)[] } {
  const mw = state.mealWindows
  type T = { id: string; time: Date; reason: string; hint: string }
  const raw: T[] = [
    { id: 'meal1', time: mw.meal1, reason: 'Post-wake meal', hint: 'Protein-aware start after sleep' },
    { id: 'meal2', time: mw.meal2, reason: 'Mid-day fuel', hint: 'Steady energy for your shift rhythm' },
    {
      id: 'anchorMeal',
      time: mw.anchorMeal,
      reason: 'Pre-shift anchor meal',
      hint: 'Anchor fuel before your next shift block',
    },
    { id: 'shiftSnack1', time: mw.shiftSnack1, reason: 'Shift-time snack', hint: 'Light, easy to digest' },
  ]
  if (mw.shiftSnack2) {
    raw.push({
      id: 'shiftSnack2',
      time: mw.shiftSnack2,
      reason: 'Second shift snack',
      hint: 'Optional — keep it small',
    })
  }
  raw.sort((a, b) => a.time.getTime() - b.time.getTime())
  const sortedBase = [...baseMeals].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
  const n = raw.length
  const defaultCal = Math.round(Math.max(1200, totalCalories) / n)

  const fmt = (d: Date) => formatTime24(d)
  const addH = (d: Date, h: number) => new Date(d.getTime() + h * 60 * 60 * 1000)
  const window = (start: Date, hours = 1) => `${fmt(start)}–${fmt(addH(start, hours))}`

  const slots: MealSlot[] = []
  const categoryLabels: (string | undefined)[] = []

  for (let i = 0; i < raw.length; i += 1) {
    const r = raw[i]!
    const base = sortedBase[i]
    const caloriesTarget = base?.calories ?? defaultCal
    categoryLabels.push(base?.label)
    slots.push({
      id: r.id as MealSlot['id'],
      label: r.reason,
      time: r.time,
      windowLabel: window(r.time, 1),
      caloriesTarget,
      hint: base?.hint ?? r.hint,
    } as unknown as MealSlot)
  }

  return { slots, categoryLabels }
}

function patchPayloadFromSchedule(
  api: ApiPayload,
  mealSchedule: MealSlot[],
  categoryLabels: (string | undefined)[],
  now: Date,
  subtitleExtra?: string,
): ApiPayload {
  const totalCalories = Math.max(1200, Math.round(api.totalCalories || 0))
  const totalMacros = api.totalMacros
  const meals = buildMealsWithMacros(mealSchedule, totalCalories, totalMacros, categoryLabels, now)
  const nextPick = pickNextMealOccurrence(mealSchedule, now)
  const nextMealSlot = nextPick?.slot ?? null
  const nextMealAt = nextPick?.at ?? null
  const nextMealWithMacros = nextMealSlot
    ? meals.find((m) => m.id === nextMealSlot.id) ?? meals[0]
    : meals[0]

  const nextMealTimeStr = nextMealAt ? formatTime24(nextMealAt) : '—'

  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const coachMeals = mealSchedule.map((meal) => {
    const mealTime = meal.time
    const position = ((mealTime.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) % 1
    return {
      id: meal.id,
      label: meal.label,
      time: formatTime24(meal.time),
      position: Math.max(0, Math.min(1, position)),
      inWindow: true,
    }
  })

  const recommendedWindows = mealSchedule.map((meal) => ({
    id: meal.id,
    label: meal.label,
    timeRange: meal.windowLabel,
    focus: [meal.hint, meal.subtitle].filter(Boolean).join(' · ') || meal.hint,
  }))

  const out: ApiPayload = {
    ...api,
    meals,
    nextMealLabel: nextMealSlot?.label || 'Next meal',
    nextMealTime: nextMealTimeStr,
    nextMealAt: nextMealAt ? nextMealAt.toISOString() : null,
    nextMealType: nextMealSlot?.hint || 'Balanced meal',
    nextMealSubtitle: nextMealWithMacros?.subtitle ?? null,
    nextMealMacros: nextMealWithMacros?.macros || {
      protein: Math.round(totalMacros.protein_g / meals.length),
      carbs: Math.round(totalMacros.carbs_g / meals.length),
      fats: Math.round(totalMacros.fat_g / meals.length),
    },
    cardSubtitle: subtitleExtra
      ? [api.cardSubtitle, subtitleExtra].filter(Boolean).join(' ')
      : api.cardSubtitle,
    coach: {
      ...api.coach,
      recommendedWindows,
      meals: coachMeals,
      status: api.coach?.status,
      tips: api.coach?.tips,
    },
  }
  return out
}

/**
 * Returns a deep copy of the API JSON with shift-aware meal times when applicable.
 */
export function applyUserShiftStateToMealTimingJson(
  apiInput: Record<string, unknown>,
  userShiftState: UserShiftState | null | undefined,
  nowInput: Date = new Date(),
): Record<string, unknown> {
  if (!userShiftState) {
    return apiInput
  }

  const api = structuredClone(apiInput) as ApiPayload
  const now = nowInput
  const mode = userShiftState.currentMode
  const baseMeals = api.meals ?? []
  const totalCalories = Math.max(1200, Math.round(api.totalCalories || 0))
  const totalMacros = api.totalMacros ?? { protein_g: 0, carbs_g: 0, fat_g: 0 }

  if (mode === 'TRANSITIONING' || mode === 'RECOVERING') {
    // Keep server-authored transition day→night schedule intact.
    // The server now applies a dedicated hybrid transition template; overriding it here
    // with generic shift-agent windows can incorrectly move first meal to pre-shift.
    if (api.shiftContext?.guidanceMode === 'transition_day_to_night') {
      return apiInput
    }

    const { slots, categoryLabels } = transitionMealsFromShiftState(
      userShiftState,
      baseMeals,
      totalCalories,
      totalMacros,
    )
    const extra =
      mode === 'TRANSITIONING'
        ? 'Times follow your shift transition plan (shift coach).'
        : 'Times follow your recovery window after a rough transition (shift coach).'
    return patchPayloadFromSchedule(api, slots, categoryLabels, now, extra)
  }

  if (mode === 'DAY_NORMAL' || mode === 'NIGHT_NORMAL') {
    const inputs = api.mealPlanInputs
    const wake = userShiftState.sleepWindows.primarySleep.end
    const shiftType = (inputs?.shiftType ?? api.shiftType) as 'day' | 'night' | 'late' | 'off'
    const shiftStart = inputs?.shiftStartIso ? new Date(inputs.shiftStartIso) : undefined
    const shiftEnd = inputs?.shiftEndIso ? new Date(inputs.shiftEndIso) : undefined

    if (
      (shiftType === 'day' || shiftType === 'night' || shiftType === 'late') &&
      (!shiftStart || !shiftEnd || Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime()))
    ) {
      return apiInput
    }

    let loggedWakeParsed: Date | null = null
    if (inputs?.loggedWakeAfterShiftIso) {
      const d = new Date(inputs.loggedWakeAfterShiftIso)
      loggedWakeParsed = Number.isNaN(d.getTime()) ? null : d
    }

    const { slots } = getTodayMealSchedule({
      adjustedCalories: totalCalories,
      shiftType,
      shiftStart,
      shiftEnd,
      wakeTime: wake,
      expectedSleepHours: inputs?.expectedSleepHours,
      loggedWakeAfterShift: loggedWakeParsed,
    })

    const sortedBase = [...baseMeals].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
    const sortedSlots = [...slots].sort((a, b) => a.time.getTime() - b.time.getTime())
    const categoryLabels = sortedSlots.map((_, i) => sortedBase[i]?.label)

    return patchPayloadFromSchedule(
      api,
      slots,
      categoryLabels,
      now,
      'Wake anchor from your main sleep window (shift coach).',
    )
  }

  return apiInput
}
