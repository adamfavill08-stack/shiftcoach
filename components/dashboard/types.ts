export type SleepSummary = {
  lastNight?: {
    start: string
    end: string
    durationHours: number
  }
  average7d: number | null
  message: string
}

export type MacroStat = {
  target: number | null
  consumed: number | null
  label: string
}

export type NutritionSummary = {
  adjustedCalories: number
  consumedCalories: number
  macros: {
    protein: MacroStat
    carbs: MacroStat
    fat: MacroStat
    satFat: MacroStat
  }
  hydration: {
    water: { target: number | null; consumed: number | null }
    caffeine: { limit: number | null; consumed: number | null }
  }
}

export type RotaDay = {
  date: string
  label: string
  start_ts?: string | null
  end_ts?: string | null
}

export type ActivitySummary = {
  steps: number
  goal: number
  activeMinutes: number | null
  lastSyncedAt: string | null
  source: string | null
}

export type MealTimingSummary = {
  shiftType: string
  recommended: Array<{ id: string; label: string; suggestedTime: string }>
  actual: Array<{ slot: string; timestamp: string }>
}

export type ShiftSubScores = {
  sleep_score?: number | null
  regularity_score?: number | null
  shift_pattern_score?: number | null
  recovery_score?: number | null
  nutrition_score?: number | null
  activity_score?: number | null
  meal_timing_score?: number | null
}
