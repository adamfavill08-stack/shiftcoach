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

export type CalorieResult = {
  baseCalories: number
  adjustedCalories: number
  rhythmScore: number | null
  sleepHoursLast24h: number | null
  shiftType: 'day' | 'night' | 'off' | 'other'
  rhythmFactor: number
  sleepFactor: number
  shiftFactor: number
  meals: MealSlot[]
  macros: MacroTargets
  hydrationIntake: {
    water_ml: number
    caffeine_mg: number
  }
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

export async function calculateAdjustedCalories(supabase: any, userId: string): Promise<CalorieResult> {
  // 1) User settings (from profiles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('weight_kg, height_cm, age, sex, goal, activity_level')
    .eq('user_id', userId)
    .maybeSingle()

  const weight = profile?.weight_kg ?? 75
  const height = profile?.height_cm ?? 175
  const age = profile?.age ?? 35
  const sex = (profile?.sex as 'male' | 'female' | 'other' | null) ?? 'male'
  const goal = (profile?.goal as 'lose' | 'maintain' | 'gain' | null) ?? 'maintain'
  const activity = (profile?.activity_level as 'light' | 'moderate' | 'high' | null) ?? 'light'

  // Mifflin–St Jeor
  const s = sex === 'female' ? -161 : 5
  const bmr = 10 * weight + 6.25 * height - 5 * age + s
  const activityFactor = activity === 'high' ? 1.6 : activity === 'moderate' ? 1.4 : 1.3
  let baseCalories = bmr * activityFactor
  if (goal === 'lose') baseCalories *= 0.85
  if (goal === 'gain') baseCalories *= 1.1
  baseCalories = Math.round(baseCalories)

  // 2) Shift Rhythm (latest)
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
  let rhythmFactor = 1
  if (rhythmScore != null) {
    if (rhythmScore >= 80) rhythmFactor = 1.0
    else if (rhythmScore >= 70) rhythmFactor = 0.97
    else if (rhythmScore >= 60) rhythmFactor = 0.95
    else if (rhythmScore >= 50) rhythmFactor = 0.93
    else if (rhythmScore >= 40) rhythmFactor = 0.9
    else rhythmFactor = 0.88
  }

  // 3) Sleep last 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const { data: sleepLogs } = await supabase
    .from('sleep_logs')
    .select('start_ts, end_ts, sleep_hours')
    .eq('user_id', userId)
    .gte('start_ts', twentyFourHoursAgo.toISOString())

  let sleepHoursLast24h: number | null = null
  if (sleepLogs && sleepLogs.length > 0) {
    const sum = sleepLogs.reduce((acc: number, row: any) => acc + (row.sleep_hours ?? 0), 0)
    sleepHoursLast24h = sum
  }

  let sleepFactor = 1
  if (sleepHoursLast24h != null) {
    if (sleepHoursLast24h >= 7) sleepFactor = 1.0
    else if (sleepHoursLast24h >= 6) sleepFactor = 0.97
    else if (sleepHoursLast24h >= 5) sleepFactor = 0.94
    else sleepFactor = 0.9
  }

  // 4) Today’s shift (map from `shifts` table label)
  const today = new Date().toISOString().slice(0, 10)
  const { data: shift } = await supabase
    .from('shifts')
    .select('label, date')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  let shiftType: 'day' | 'night' | 'off' | 'other' = 'other'
  const label = (shift?.label as string | undefined) || undefined
  if (label === 'DAY') shiftType = 'day'
  else if (label === 'NIGHT') shiftType = 'night'
  else if (label === 'OFF') shiftType = 'off'

  let shiftFactor = 1
  if (shiftType === 'off') shiftFactor = 0.95
  else if (shiftType === 'night') shiftFactor = 0.92
  else shiftFactor = 1.0

  // 5) Final adjusted calories
  const adjustedCalories = Math.round(baseCalories * rhythmFactor * sleepFactor * shiftFactor)

  function buildMealPlan(
    total: number,
    sType: 'day' | 'night' | 'off' | 'other'
  ): MealSlot[] {
    const cals = total
    if (sType === 'night') {
      return [
        { id: 'pre-shift', label: 'Pre-shift meal', suggestedTime: '18:00', calories: Math.round(cals * 0.4) },
        { id: 'during-shift', label: 'Light during-shift snack', suggestedTime: '23:00', calories: Math.round(cals * 0.15) },
        { id: 'post-shift', label: 'Recovery meal', suggestedTime: '08:00', calories: Math.round(cals * 0.3) },
        { id: 'optional-snack', label: 'Optional snack (flex)', suggestedTime: '03:00', calories: Math.round(cals * 0.15) },
      ]
    }
    if (sType === 'off') {
      return [
        { id: 'breakfast', label: 'Breakfast', suggestedTime: '08:00', calories: Math.round(cals * 0.25) },
        { id: 'lunch', label: 'Lunch', suggestedTime: '13:00', calories: Math.round(cals * 0.3) },
        { id: 'dinner', label: 'Dinner', suggestedTime: '19:00', calories: Math.round(cals * 0.3) },
        { id: 'snack', label: 'Flex snack', suggestedTime: '16:00', calories: Math.round(cals * 0.15) },
      ]
    }
    // default day
    return [
      { id: 'breakfast', label: 'Breakfast', suggestedTime: '07:00', calories: Math.round(cals * 0.25) },
      { id: 'lunch', label: 'Lunch', suggestedTime: '12:30', calories: Math.round(cals * 0.3) },
      { id: 'pre-shift-snack', label: 'Pre-shift snack', suggestedTime: '16:00', calories: Math.round(cals * 0.15) },
      { id: 'dinner', label: 'Dinner', suggestedTime: '19:30', calories: Math.round(cals * 0.3) },
    ]
  }

  const meals = buildMealPlan(adjustedCalories, shiftType)

  function calculateDailyMacros(
    totalKcal: number,
    weightKg: number,
    goalStr: string,
    sType: 'day' | 'night' | 'off' | 'other',
    rScore: number | null,
    sleepH: number | null,
  ): MacroTargets {
    const w = weightKg || 75

    // Protein per kg by goal
    let proteinPerKg = 1.7
    if (goalStr === 'lose') proteinPerKg = 2.0
    else if (goalStr === 'gain') proteinPerKg = 1.8
    let protein_g = w * proteinPerKg

    // Fat per kg (~0.7 g/kg, min ~0.5 g/kg)
    let fatPerKg = 0.7
    if (fatPerKg < 0.5) fatPerKg = 0.5
    let fat_g = w * fatPerKg

    // Calories from protein & fat
    let kcalFromProtein = protein_g * 4
    let kcalFromFat = fat_g * 9
    let remaining = totalKcal - (kcalFromProtein + kcalFromFat)

    // If remaining negative, trim fat up to 30% before touching protein
    if (remaining < 0) {
      const deficit = -remaining
      const fatKcal = fat_g * 9
      const maxFatReductionKcal = fatKcal * 0.3
      const reduction = Math.min(deficit, maxFatReductionKcal)
      fat_g = (fatKcal - reduction) / 9
      kcalFromFat = fat_g * 9
      remaining = totalKcal - (kcalFromProtein + kcalFromFat)
      if (remaining < 0) {
        // as a last resort, trim protein slightly but keep >= 1.6 g/kg
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

    // Small tweak for night shift + low rhythm/sleep
    const poorRhythm = (rScore != null && rScore < 50) || (sleepH != null && sleepH < 6)
    if (sType === 'night' && poorRhythm) {
      carbs_g *= 0.95
    }

    // Saturated fat target ~ min(10% of kcal, 25% of fat grams)
    const satFromKcal = (totalKcal * 0.10) / 9
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
    shiftType,
    rhythmScore,
    sleepHoursLast24h,
  )

  const { data: waterToday } = await supabase
    .from('water_logs')
    .select('ml,ts')
    .eq('user_id', userId)
    .gte('ts', twentyFourHoursAgo.toISOString())
  const totalWaterMl = (waterToday ?? []).reduce(
    (sum: number, row: any) => sum + (row.ml ?? 0),
    0,
  )

  const { data: caffeineToday } = await supabase
    .from('caffeine_logs')
    .select('mg,ts')
    .eq('user_id', userId)
    .gte('ts', twentyFourHoursAgo.toISOString())
  const totalCaffeineMg = (caffeineToday ?? []).reduce(
    (sum: number, row: any) => sum + (row.mg ?? 0),
    0,
  )

  return {
    baseCalories,
    adjustedCalories,
    rhythmScore,
    sleepHoursLast24h,
    shiftType,
    rhythmFactor,
    sleepFactor,
    shiftFactor,
    meals,
    macros,
    hydrationIntake: {
      water_ml: totalWaterMl,
      caffeine_mg: totalCaffeineMg,
    },
  }
}


