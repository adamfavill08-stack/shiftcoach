import { getShiftedDayKey } from '@/lib/sleep/utils'
import {
  fetchShiftContext,
  mealGuidanceFromContext,
  type ShiftContextResult,
} from '@/lib/shift-context'

export type MealSlot = {
  id: string
  label: string
  suggestedTime: string
  calories: number
}

export type MacroTargets = {
  protein_g: number
  carbs_g: number
  fat_g: number
  sat_fat_g: number
}

export type ModifierChainItem = {
  id: string
  factor: number
  deltaKcal: number
  runningKcal: number
}

export type CalorieResult = {
  baseCalories: number
  /** BMR × PAL only (before lose/gain/aggressiveness tweaks). */
  palBaseCalories: number
  /** baseCalories − palBaseCalories (goal + aggressiveness stack). */
  goalAdjustmentKcal: number
  adjustedCalories: number
  rhythmScore: number | null
  /** Total hours attributed to current shifted-day window (07:00–07:00 local). */
  sleepHoursLast24h: number | null
  /** Primary (non-nap) sleep hours in that window */
  sleepPrimaryHours: number | null
  /** Nap sleep hours in that window */
  sleepNapHours: number | null
  shiftedDayKey: string | null
  shiftType: 'day' | 'night' | 'off' | 'early' | 'late' | 'other'
  rhythmFactor: number
  sleepFactor: number
  shiftFactor: number
  activityFactor: number
  shiftActivityFactor: number
  movementFactor: number
  /** Alias for `movementFactor` (steps / active minutes layer); kept for dashboard copy. */
  dailyActivityFactor: number
  stepsToday: number | null
  activeMinutesToday: number | null
  activityLevel: string | null
  meals: MealSlot[]
  macros: MacroTargets
  sex: 'male' | 'female' | 'other'
  hydrationIntake: {
    water_ml: number
    caffeine_mg: number
  }
  /** Product of rhythm × sleep × shift × shiftActivity × movement before daily cap */
  modifierProductRaw: number
  /** Same product after clamping to GUARD_RAIL_MIN..GUARD_RAIL_MAX */
  modifierProductCapped: number
  guardRailApplied: boolean
  modifierChain: ModifierChainItem[]
  /** Remainder so Σ(chain.deltaKcal) + this === adjustedCalories − baseCalories */
  modifierGuardDeltaKcal: number
  /** True when guard rail or non-trivial rounding remainder applies */
  calorieModifiersCapped: boolean
  goal: 'lose' | 'maintain' | 'gain'
  macroPreset: 'balanced' | 'high_protein' | 'custom'
  /** Resolved shift context: operational + meal planning bias toward current/next shift. */
  shiftContext: ShiftContextResult | null
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** Keep day-to-day target from swinging wildly from one rough input */
const GUARD_RAIL_MIN = 0.88
const GUARD_RAIL_MAX = 1.12

const SHIFT_START_HOUR = 7
const SHIFT_WINDOW_BUFFER_MS = 60 * 60 * 1000

function shiftedDayWindow(isoDate: string): { start: Date; end: Date } {
  const [y, m, d] = isoDate.split('-').map(Number)
  const start = new Date(y, m - 1, d, SHIFT_START_HOUR, 0, 0, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

function overlapMinutes(
  start: Date,
  end: Date,
  winStart: Date,
  winEnd: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  const w0 = winStart.getTime()
  const w1 = winEnd.getTime()
  const lo = Math.max(a, w0)
  const hi = Math.min(b, w1)
  return Math.max(0, Math.round((hi - lo) / 60000))
}

/** Naps count less toward “recovery sleep” for calorie factor */
const NAP_WEIGHT_FOR_SLEEP_FACTOR = 0.6

function movementFactorFromStepsAndActive(
  steps: number | null,
  activeMinutes: number | null,
  stepsGoal: number,
): number {
  let f = 1
  if (steps != null && stepsGoal > 0) {
    const ratio = clamp(steps / stepsGoal, 0, 2.5)
    // ~−4% at very low movement, neutral near goal, ~+4% well above goal
    f *= clamp(0.96 + 0.08 * ratio, 0.96, 1.08)
  }
  if (activeMinutes != null && activeMinutes > 0) {
    // Mild bump for sustained movement; capped so it does not dominate
    if (activeMinutes >= 45) f *= 1.03
    else if (activeMinutes >= 25) f *= 1.02
    else if (activeMinutes >= 10) f *= 1.01
  }
  return clamp(f, 0.96, 1.08)
}

function isNapType(type: unknown): boolean {
  const t = String(type ?? '').toLowerCase()
  return t === 'nap' || t === 'pre_shift_nap'
}

function shiftTypeForMeals(s: CalorieResult['shiftType']): 'day' | 'night' | 'off' {
  if (s === 'night') return 'night'
  if (s === 'off') return 'off'
  return 'day'
}

type ActivityAgg = {
  stepsToday: number | null
  activeMinutesToday: number | null
  shiftActivityLevel: string | null
}

/**
 * Match `/api/activity/today`: aggregate steps and active minutes across the current
 * shift window (with travel buffer), not calendar UTC midnight.
 */
async function loadShiftWindowActivity(supabase: any, userId: string, now: Date): Promise<ActivityAgg> {
  const today = now.toISOString().slice(0, 10)
  const startOfDay = new Date(today + 'T00:00:00Z')
  const nowPlusBufferAfterIso = new Date(now.getTime() + SHIFT_WINDOW_BUFFER_MS).toISOString()
  const nowMinusBufferBeforeIso = new Date(now.getTime() - SHIFT_WINDOW_BUFFER_MS).toISOString()

  let currentShift: { start_ts: string | null; end_ts: string | null } | null = null

  const { data: shiftInProgress } = await supabase
    .from('shifts')
    .select('start_ts, end_ts')
    .eq('user_id', userId)
    .lte('start_ts', nowPlusBufferAfterIso)
    .gt('end_ts', nowMinusBufferBeforeIso)
    .maybeSingle()

  if (shiftInProgress) {
    currentShift = shiftInProgress as { start_ts: string | null; end_ts: string | null }
  } else {
    const { data: lastStarted } = await supabase
      .from('shifts')
      .select('start_ts, end_ts')
      .eq('user_id', userId)
      .lte('start_ts', nowPlusBufferAfterIso)
      .gt('end_ts', nowMinusBufferBeforeIso)
      .order('start_ts', { ascending: false })
      .limit(1)
      .maybeSingle()
    currentShift = (lastStarted as { start_ts: string | null; end_ts: string | null } | null) ?? null
  }

  let windowStartDate =
    currentShift?.start_ts != null
      ? new Date(new Date(currentShift.start_ts).getTime() - SHIFT_WINDOW_BUFFER_MS)
      : startOfDay
  let windowEndDate =
    currentShift?.end_ts != null
      ? new Date(new Date(currentShift.end_ts).getTime() + SHIFT_WINDOW_BUFFER_MS)
      : now
  if (windowEndDate.getTime() > now.getTime()) windowEndDate = now
  if (windowEndDate.getTime() <= windowStartDate.getTime()) windowEndDate = now

  const windowStartISO = windowStartDate.toISOString()
  const windowEndISO = windowEndDate.toISOString()

  const reduceRows = (rows: any[]) => {
    if (!rows.length) {
      return { stepsToday: null as number | null, activeMinutesToday: null as number | null, shiftActivityLevel: null as string | null }
    }
    const totalSteps = rows.reduce((s: number, r: any) => s + (r.steps ?? 0), 0)
    const mostRecent = rows[0]
    const activeVals = rows.map((r: any) => r.active_minutes).filter((v: any) => typeof v === 'number')
    const totalActive = activeVals.length ? activeVals.reduce((a: number, b: number) => a + b, 0) : null
    return {
      stepsToday: totalSteps,
      activeMinutesToday: totalActive,
      shiftActivityLevel: mostRecent?.shift_activity_level != null ? String(mostRecent.shift_activity_level) : null,
    }
  }

  const tryTs = await supabase
    .from('activity_logs')
    .select('steps, active_minutes, ts, shift_activity_level')
    .eq('user_id', userId)
    .gte('ts', windowStartISO)
    .lt('ts', windowEndISO)
    .order('ts', { ascending: false })

  if (!tryTs.error && tryTs.data) {
    return reduceRows(tryTs.data)
  }

  if (tryTs.error && (tryTs.error.code === '42703' || String(tryTs.error.message).includes('ts'))) {
    const tryCreated = await supabase
      .from('activity_logs')
      .select('steps, active_minutes, created_at, shift_activity_level')
      .eq('user_id', userId)
      .gte('created_at', windowStartISO)
      .lt('created_at', windowEndISO)
      .order('created_at', { ascending: false })
    if (!tryCreated.error && tryCreated.data) {
      return reduceRows(tryCreated.data)
    }
  }

  if (tryTs.error && (tryTs.error.code === '42703' || String(tryTs.error.message).includes('active_minutes'))) {
    const noAm = await supabase
      .from('activity_logs')
      .select('steps, ts, shift_activity_level')
      .eq('user_id', userId)
      .gte('ts', windowStartISO)
      .lt('ts', windowEndISO)
      .order('ts', { ascending: false })
    if (!noAm.error && noAm.data) {
      return reduceRows(noAm.data.map((r: any) => ({ ...r, active_minutes: null })))
    }
    const noAmCa = await supabase
      .from('activity_logs')
      .select('steps, created_at, shift_activity_level')
      .eq('user_id', userId)
      .gte('created_at', windowStartISO)
      .lt('created_at', windowEndISO)
      .order('created_at', { ascending: false })
    if (!noAmCa.error && noAmCa.data) {
      return reduceRows(noAmCa.data.map((r: any) => ({ ...r, active_minutes: null })))
    }
  }

  return { stepsToday: null, activeMinutesToday: null, shiftActivityLevel: null }
}

export async function calculateAdjustedCalories(supabase: any, userId: string): Promise<CalorieResult> {
  const now = new Date()
  const shiftedDayKey = getShiftedDayKey(now, SHIFT_START_HOUR)
  const { start: winStart, end: winEnd } = shiftedDayWindow(shiftedDayKey)

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'weight_kg, height_cm, age, sex, goal, default_activity_level, calorie_adjustment_aggressiveness, macro_split_preset, daily_steps_goal',
    )
    .eq('user_id', userId)
    .maybeSingle()

  const weight = profile?.weight_kg ?? 75
  const height = profile?.height_cm ?? 175
  const age = profile?.age ?? 35
  const sex = (profile?.sex as 'male' | 'female' | 'other' | null) ?? 'male'
  const goal = (profile?.goal as 'lose' | 'maintain' | 'gain' | null) ?? 'maintain'
  const calorieAdjustment =
    (profile?.calorie_adjustment_aggressiveness as 'gentle' | 'balanced' | 'aggressive' | null) ?? 'balanced'
  const macroPreset =
    (profile?.macro_split_preset as 'balanced' | 'high_protein' | 'custom' | null) ?? 'balanced'

  const defaultActivity = (profile?.default_activity_level as 'low' | 'medium' | 'high' | null) ?? 'medium'
  let activity: 'light' | 'moderate' | 'high' = 'moderate'
  if (defaultActivity === 'low') activity = 'light'
  else if (defaultActivity === 'medium') activity = 'moderate'
  else if (defaultActivity === 'high') activity = 'high'

  // Mifflin–St Jeor: male +5, female −161; `other` uses the midpoint as a neutral estimate (not identical to either binary formula).
  const mifflinSexConstant = sex === 'female' ? -161 : sex === 'male' ? 5 : -78
  const bmr = 10 * weight + 6.25 * height - 5 * age + mifflinSexConstant
  const activityFactor = activity === 'high' ? 1.6 : activity === 'moderate' ? 1.4 : 1.3
  const palBaseCalories = Math.round(bmr * activityFactor)
  let baseCalories = bmr * activityFactor

  if (goal === 'lose') baseCalories *= 0.9
  if (goal === 'gain') baseCalories *= 1.1

  if (calorieAdjustment === 'gentle') {
    if (goal === 'lose') baseCalories *= 0.97
    if (goal === 'gain') baseCalories *= 1.02
  } else if (calorieAdjustment === 'aggressive') {
    if (goal === 'lose') baseCalories *= 0.9
    if (goal === 'gain') baseCalories *= 1.05
  }

  baseCalories = Math.round(baseCalories)
  const goalAdjustmentKcal = baseCalories - palBaseCalories

  const { data: rhythmRow } = await supabase
    .from('shift_rhythm_scores')
    .select('total_score, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const rhythmScoreRaw: number | null = rhythmRow?.total_score ?? null
  const rhythmScore =
    rhythmScoreRaw != null && rhythmScoreRaw <= 10 ? rhythmScoreRaw * 10 : rhythmScoreRaw
  // Conservative band: coaching can emphasize timing/macros; avoid large calorie cuts from rhythm alone.
  let rhythmFactor = 1
  if (rhythmScore != null) {
    if (rhythmScore >= 80) rhythmFactor = 1.0
    else if (rhythmScore >= 70) rhythmFactor = 0.99
    else if (rhythmScore >= 60) rhythmFactor = 0.98
    else if (rhythmScore >= 50) rhythmFactor = 0.97
    else if (rhythmScore >= 40) rhythmFactor = 0.96
    else rhythmFactor = 0.95
  }

  const rawQueryStart = new Date(winStart.getTime() - 36 * 60 * 60 * 1000).toISOString()
  const rawQueryEnd = new Date(winEnd.getTime() + 36 * 60 * 60 * 1000).toISOString()

  let sleepQuery = await supabase
    .from('sleep_logs')
    .select('start_at, end_at, type')
    .eq('user_id', userId)
    .lte('start_at', rawQueryEnd)
    .gte('end_at', rawQueryStart)

  if (
    sleepQuery.error &&
    (sleepQuery.error.message?.includes('start_at') ||
      sleepQuery.error.code === 'PGRST204' ||
      sleepQuery.error.code === '42703')
  ) {
    sleepQuery = await supabase
      .from('sleep_logs')
      .select('start_ts, end_ts, sleep_hours, type')
      .eq('user_id', userId)
      .lte('start_ts', rawQueryEnd)
      .gte('end_ts', rawQueryStart)
  }

  let primaryHours = 0
  let napHours = 0
  const sleepRows = sleepQuery.data ?? []
  for (const row of sleepRows) {
    const startS = (row as any).start_at || (row as any).start_ts
    let endS = (row as any).end_at || (row as any).end_ts
    if (!startS) continue
    const start = new Date(startS)
    let end = endS ? new Date(endS) : null
    if (!end || end <= start) {
      const sh = (row as any).sleep_hours
      if (typeof sh === 'number' && sh > 0) {
        end = new Date(start.getTime() + sh * 3600000)
      } else continue
    }
    const ovMin = overlapMinutes(start, end, winStart, winEnd)
    if (ovMin <= 0) continue
    const hoursInWindow = ovMin / 60
    if (isNapType((row as any).type)) napHours += hoursInWindow
    else primaryHours += hoursInWindow
  }

  const sleepHoursTotal = primaryHours + napHours > 0 ? primaryHours + napHours : null
  const sleepForFactorH =
    sleepHoursTotal != null
      ? primaryHours + napHours * NAP_WEIGHT_FOR_SLEEP_FACTOR
      : null

  let sleepFactor = 1
  if (sleepForFactorH != null) {
    if (sleepForFactorH >= 7) sleepFactor = 1.0
    else if (sleepForFactorH >= 6) sleepFactor = 0.97
    else if (sleepForFactorH >= 5) sleepFactor = 0.94
    else sleepFactor = 0.9
  }

  const shiftContext = await fetchShiftContext(supabase, userId, now)
  const mealGuide = mealGuidanceFromContext(shiftContext)
  const mealKind =
    mealGuide.anchorShift?.operationalKind ??
    shiftContext.mealPlanningShift?.operationalKind
  let shiftType: CalorieResult['shiftType'] =
    mealKind === 'day' ||
    mealKind === 'night' ||
    mealKind === 'off' ||
    mealKind === 'early' ||
    mealKind === 'late'
      ? mealKind
      : mealKind === 'other'
        ? 'other'
        : 'off'

  // Small schedule nudge only; meal layout and logged shift activity carry most shift-related variation.
  let shiftFactor = 1
  if (shiftType === 'off') shiftFactor = 0.98
  else if (shiftType === 'night') shiftFactor = 0.99
  else if (shiftType === 'early') shiftFactor = 0.99
  else if (shiftType === 'late') shiftFactor = 0.99
  else shiftFactor = 1.0

  const { getActivityFactor } = await import('@/lib/activity/activityLevels')
  let shiftActivityFactor = 1.0
  let activityLevel: string | null = null

  const actAgg = await loadShiftWindowActivity(supabase, userId, now)
  let stepsToday = actAgg.stepsToday
  let activeMinutesToday = actAgg.activeMinutesToday

  if (actAgg.shiftActivityLevel) {
    activityLevel = actAgg.shiftActivityLevel
    shiftActivityFactor = getActivityFactor(
      activityLevel as 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null,
    )
  }

  const stepsGoal = profile?.daily_steps_goal ?? 10000

  const movementFactor = movementFactorFromStepsAndActive(
    stepsToday,
    activeMinutesToday,
    Math.max(3000, stepsGoal),
  )

  const modifierProductRaw =
    rhythmFactor * sleepFactor * shiftFactor * shiftActivityFactor * movementFactor
  const modifierProductCapped = clamp(modifierProductRaw, GUARD_RAIL_MIN, GUARD_RAIL_MAX)
  const guardRailApplied = modifierProductCapped !== modifierProductRaw
  const adjustedCalories = Math.round(baseCalories * modifierProductCapped)

  const factorSteps: Array<[string, number]> = [
    ['rhythm', rhythmFactor],
    ['sleep', sleepFactor],
    ['shift', shiftFactor],
    ['shift_activity', shiftActivityFactor],
    ['daily_activity', movementFactor],
  ]
  let r = baseCalories
  const modifierChain: ModifierChainItem[] = factorSteps.map(([id, f]) => {
    const before = r
    r = before * f
    return {
      id,
      factor: f,
      deltaKcal: Math.round(r - before),
      runningKcal: Math.round(r),
    }
  })
  const chainSum = modifierChain.reduce((sum, c) => sum + c.deltaKcal, 0)
  const modifierGuardDeltaKcal = adjustedCalories - baseCalories - chainSum
  const calorieModifiersCapped = guardRailApplied || Math.abs(modifierGuardDeltaKcal) >= 1

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  console.log('[calculateAdjustedCalories] Calculation breakdown:', {
    userId,
    baseCalories,
    palBaseCalories,
    shiftedDayKey,
    primaryHours,
    napHours,
    rhythmScore: rhythmScoreRaw,
    rhythmFactor,
    sleepFactor,
    shiftFactor,
    shiftActivityFactor,
    movementFactor,
    stepsToday,
    activeMinutesToday,
    modifierProductRaw,
    modifierProductCapped,
    guardRailApplied,
    adjustedCalories,
  })

  function buildMealPlan(total: number, layout: 'day' | 'night' | 'off'): MealSlot[] {
    const cals = total
    if (layout === 'night') {
      return [
        { id: 'pre-shift', label: 'Pre-shift meal', suggestedTime: '18:00', calories: Math.round(cals * 0.4) },
        { id: 'during-shift', label: 'Light during-shift snack', suggestedTime: '23:00', calories: Math.round(cals * 0.15) },
        { id: 'post-shift', label: 'Recovery meal', suggestedTime: '08:00', calories: Math.round(cals * 0.3) },
        { id: 'optional-snack', label: 'Optional snack (flex)', suggestedTime: '03:00', calories: Math.round(cals * 0.15) },
      ]
    }
    if (layout === 'off') {
      return [
        { id: 'breakfast', label: 'Breakfast', suggestedTime: '08:00', calories: Math.round(cals * 0.25) },
        { id: 'lunch', label: 'Lunch', suggestedTime: '13:00', calories: Math.round(cals * 0.3) },
        { id: 'dinner', label: 'Dinner', suggestedTime: '19:00', calories: Math.round(cals * 0.3) },
        { id: 'snack', label: 'Flex snack', suggestedTime: '16:00', calories: Math.round(cals * 0.15) },
      ]
    }
    return [
      { id: 'breakfast', label: 'Breakfast', suggestedTime: '07:00', calories: Math.round(cals * 0.25) },
      { id: 'lunch', label: 'Lunch', suggestedTime: '12:30', calories: Math.round(cals * 0.3) },
      { id: 'pre-shift-snack', label: 'Pre-shift snack', suggestedTime: '16:00', calories: Math.round(cals * 0.15) },
      { id: 'dinner', label: 'Dinner', suggestedTime: '19:30', calories: Math.round(cals * 0.3) },
    ]
  }

  const meals = buildMealPlan(adjustedCalories, shiftTypeForMeals(shiftType))

  function calculateDailyMacros(
    totalKcal: number,
    weightKg: number,
    goalStr: string,
    sType: 'day' | 'night' | 'off',
    rScore: number | null,
    sleepH: number | null,
  ): MacroTargets {
    const w = weightKg || 75
    let proteinPerKg = 1.7
    if (goalStr === 'lose') proteinPerKg = 2.0
    else if (goalStr === 'gain') proteinPerKg = 1.8
    if (macroPreset === 'high_protein') proteinPerKg += 0.2
    let protein_g = w * proteinPerKg
    let fatPerKg = 0.7
    if (macroPreset === 'high_protein') fatPerKg = 0.6
    if (fatPerKg < 0.5) fatPerKg = 0.5
    let fat_g = w * fatPerKg
    let kcalFromProtein = protein_g * 4
    let kcalFromFat = fat_g * 9
    let remaining = totalKcal - (kcalFromProtein + kcalFromFat)
    if (remaining < 0) {
      const deficit = -remaining
      const fatKcal = fat_g * 9
      const maxFatReductionKcal = fatKcal * 0.3
      const reduction = Math.min(deficit, maxFatReductionKcal)
      fat_g = (fatKcal - reduction) / 9
      kcalFromFat = fat_g * 9
      remaining = totalKcal - (kcalFromProtein + kcalFromFat)
      if (remaining < 0) {
        const minProtein = 1.6 * w
        const possibleTrim = Math.max(0, protein_g - minProtein)
        const needKcal = -remaining
        const trimProteinKcal = Math.min(needKcal, possibleTrim * 4)
        protein_g = (kcalFromProtein - trimProteinKcal) / 4
        kcalFromProtein = protein_g * 4
        remaining = totalKcal - (kcalFromProtein + kcalFromFat)
      }
    }
    let carbs_g = remaining > 0 ? remaining / 4 : 0
    const poorRhythm = (rScore != null && rScore < 50) || (sleepH != null && sleepH < 6)
    if (sType === 'night' && poorRhythm) carbs_g *= 0.95
    const satFromKcal = (totalKcal * 0.1) / 9
    const satFromFat = fat_g * 0.25
    const sat_fat_g = Math.round(Math.min(satFromKcal, satFromFat))
    return {
      protein_g: Math.round(protein_g),
      carbs_g: Math.round(carbs_g),
      fat_g: Math.round(fat_g),
      sat_fat_g,
    }
  }

  const macros = calculateDailyMacros(
    adjustedCalories,
    weight,
    goal,
    shiftTypeForMeals(shiftType),
    rhythmScore,
    sleepForFactorH,
  )

  const { data: waterToday } = await supabase
    .from('water_logs')
    .select('ml,ts')
    .eq('user_id', userId)
    .gte('ts', twentyFourHoursAgo.toISOString())
  const totalWaterMl = (waterToday ?? []).reduce((sum: number, row: any) => sum + (row.ml ?? 0), 0)

  const { data: caffeineToday } = await supabase
    .from('caffeine_logs')
    .select('mg,ts')
    .eq('user_id', userId)
    .gte('ts', twentyFourHoursAgo.toISOString())
  const totalCaffeineMg = (caffeineToday ?? []).reduce((sum: number, row: any) => sum + (row.mg ?? 0), 0)

  return {
    baseCalories,
    palBaseCalories,
    goalAdjustmentKcal,
    adjustedCalories,
    rhythmScore,
    sleepHoursLast24h: sleepHoursTotal,
    sleepPrimaryHours: primaryHours > 0 ? primaryHours : null,
    sleepNapHours: napHours > 0 ? napHours : null,
    shiftedDayKey,
    shiftType,
    rhythmFactor,
    sleepFactor,
    shiftFactor,
    activityFactor,
    shiftActivityFactor,
    movementFactor,
    dailyActivityFactor: movementFactor,
    stepsToday,
    activeMinutesToday,
    activityLevel,
    meals,
    macros,
    sex,
    hydrationIntake: {
      water_ml: totalWaterMl,
      caffeine_mg: totalCaffeineMg,
    },
    modifierProductRaw,
    modifierProductCapped,
    guardRailApplied,
    modifierChain,
    modifierGuardDeltaKcal,
    calorieModifiersCapped,
    goal,
    macroPreset,
    shiftContext,
  }
}
