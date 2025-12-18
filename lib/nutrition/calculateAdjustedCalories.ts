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
  activityFactor: number // Base BMR activity factor (from profile)
  shiftActivityFactor: number // Shift-specific activity factor
  activityLevel: string | null
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
    .select('weight_kg, height_cm, age, sex, goal, default_activity_level, calorie_adjustment_aggressiveness, macro_split_preset')
    .eq('user_id', userId)
    .maybeSingle()

  const weight = profile?.weight_kg ?? 75
  const height = profile?.height_cm ?? 175
  const age = profile?.age ?? 35
  const sex = (profile?.sex as 'male' | 'female' | 'other' | null) ?? 'male'
  const goal = (profile?.goal as 'lose' | 'maintain' | 'gain' | null) ?? 'maintain'
  const calorieAdjustment = (profile?.calorie_adjustment_aggressiveness as 'gentle' | 'balanced' | 'aggressive' | null) ?? 'balanced'
  const macroPreset = (profile?.macro_split_preset as 'balanced' | 'high_protein' | 'custom' | null) ?? 'balanced'
  
  // Activity level: prioritize wearable data, fall back to default_activity_level from profile
  // 
  // TODO: When wearable devices are integrated:
  // 1. Check for real-time activity data from wearable devices (e.g., daily_active_energy_burned, steps, heart rate)
  // 2. Calculate activity level from wearable metrics (e.g., active minutes, METs, calories burned)
  // 3. Use wearable-derived activity level if available and recent (within last 24-48 hours)
  // 4. Fall back to default_activity_level from profile if no wearable data available
  // 
  // For now, use default_activity_level from profile (set during onboarding)
  const defaultActivity = (profile?.default_activity_level as 'low' | 'medium' | 'high' | null) ?? 'medium'
  
  // Map profile activity levels to calculation levels
  // Profile uses: 'low' | 'medium' | 'high'
  // Calculation uses: 'light' | 'moderate' | 'high'
  let activity: 'light' | 'moderate' | 'high' = 'moderate'
  if (defaultActivity === 'low') activity = 'light'
  else if (defaultActivity === 'medium') activity = 'moderate'
  else if (defaultActivity === 'high') activity = 'high'
  
  // Note: This is the BASE activity level for BMR calculation.
  // Shift-specific activity adjustments are applied later via shift_activity_level from activity_logs

  // Mifflin–St Jeor
  const s = sex === 'female' ? -161 : 5
  const bmr = 10 * weight + 6.25 * height - 5 * age + s
  const activityFactor = activity === 'high' ? 1.6 : activity === 'moderate' ? 1.4 : 1.3
  let baseCalories = bmr * activityFactor

  // 1a) Apply goal (lose / maintain / gain)
  if (goal === 'lose') baseCalories *= 0.9
  if (goal === 'gain') baseCalories *= 1.1

  // 1b) Apply user preference for calorie adjustment aggressiveness.
  // Gentle = smaller deviation from maintenance, Aggressive = larger.
  // This is applied as a bounded extra multiplier on top of goal.
  if (calorieAdjustment === 'gentle') {
    if (goal === 'lose') baseCalories *= 0.97
    if (goal === 'gain') baseCalories *= 1.02
  } else if (calorieAdjustment === 'aggressive') {
    if (goal === 'lose') baseCalories *= 0.9
    if (goal === 'gain') baseCalories *= 1.05
  }

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

  // 5) Today's activity level (shift-specific physical demand)
  // Note: This is separate from the base BMR activityFactor (line 55)
  const { getActivityFactor } = await import('@/lib/activity/activityLevels')
  let shiftActivityFactor = 1.0
  let activityLevel: string | null = null

  // Fetch today's activity level from activity_logs
  const startOfDay = new Date(today + 'T00:00:00Z')
  const endOfDay = new Date(today + 'T23:59:59Z')
  
  let activityQuery = await supabase
    .from('activity_logs')
    .select('shift_activity_level,ts')
    .eq('user_id', userId)
    .gte('ts', startOfDay.toISOString())
    .lt('ts', endOfDay.toISOString())
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fallback to created_at if ts doesn't exist
  if (activityQuery.error && (activityQuery.error.code === '42703' || activityQuery.error.message?.includes('ts'))) {
    activityQuery = await supabase
      .from('activity_logs')
      .select('shift_activity_level,created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  }

  if (!activityQuery.error && activityQuery.data?.shift_activity_level) {
    activityLevel = activityQuery.data.shift_activity_level
    // Get shift-specific activity factor (separate from base BMR activityFactor on line 55)
    // This uses shiftActivityFactor, NOT activityFactor, to avoid naming conflict
    shiftActivityFactor = getActivityFactor(activityLevel as 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null)
  } else if (shift && shiftType !== 'off' && shiftType !== 'other') {
    // If shift exists but no activity level is set, default to 'moderate' for better calorie accuracy
    // This ensures shift activity is always considered when a shift exists
    activityLevel = 'moderate'
    shiftActivityFactor = getActivityFactor('moderate')
  }

  // 6) Final adjusted calories (now includes shift activity factor)
  const adjustedCalories = Math.round(baseCalories * rhythmFactor * sleepFactor * shiftFactor * shiftActivityFactor)
  
  // Debug logging for verification
  console.log('[calculateAdjustedCalories] Calculation breakdown:', {
    userId,
    baseCalories,
    rhythmScore: rhythmScoreRaw,
    rhythmFactor,
    sleepHoursLast24h,
    sleepFactor,
    shiftType,
    shiftFactor,
    activityLevel,
    shiftActivityFactor,
    adjustedCalories,
    totalAdjustment: `${Math.round(((adjustedCalories - baseCalories) / baseCalories) * 100)}%`,
    rhythmAdjustment: `${Math.round((rhythmFactor - 1) * 100)}%`,
    sleepAdjustment: `${Math.round((sleepFactor - 1) * 100)}%`,
    shiftAdjustment: `${Math.round((shiftFactor - 1) * 100)}%`,
    shiftActivityAdjustment: `${Math.round((shiftActivityFactor - 1) * 100)}%`,
  })

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

    // Protein per kg by goal / macro preset
    let proteinPerKg = 1.7
    if (goalStr === 'lose') proteinPerKg = 2.0
    else if (goalStr === 'gain') proteinPerKg = 1.8

    if (macroPreset === 'high_protein') {
      proteinPerKg += 0.2
    }
    let protein_g = w * proteinPerKg

    // Fat per kg (~0.7 g/kg, min ~0.5 g/kg)
    let fatPerKg = 0.7
    if (macroPreset === 'high_protein') {
      fatPerKg = 0.6
    }
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
    activityFactor, // Base BMR activity factor (from profile)
    shiftActivityFactor, // Shift-specific activity factor
    activityLevel,
    meals,
    macros,
    hydrationIntake: {
      water_ml: totalWaterMl,
      caffeine_mg: totalCaffeineMg,
    },
  }
}


