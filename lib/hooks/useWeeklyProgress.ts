"use client"

export type DayKey = string

export type WeeklyProgress = {
  days: DayKey[]
  bodyClockScores: number[]
  adjustedCalories: number[]
  caloriesConsumed: number[]
  proteinG: number[]
  carbsG: number[]
  fatsG: number[]
  hydrationTargetMl: number[]
  hydrationActualMl: number[]
  sleepHours: number[]
  sleepTimingScore: number[]
  moodScores: number[]
  focusScores: number[]
  mealsLoggedCount: number[]
  aiMealsPhotoCount: number[]
  aiMealsScanCount: number[]
  coachInteractions: number[]
}

export function useWeeklyProgress(weekOffset: number = 0): WeeklyProgress {
  // TODO: fetch real data from Supabase for week starting at weekOffset
  // Mock static values for now to keep UI deterministic
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const bodyClockScores = [82, 79, 80, 84, 86, 88, 83]
  const adjustedCalories = [2300, 2280, 2320, 2350, 2400, 2380, 2290]
  const caloriesConsumed = [2250, 2200, 2350, 2360, 2420, 2400, 2280]
  const proteinG = [150, 142, 158, 160, 165, 162, 149]
  const carbsG = [210, 205, 220, 230, 240, 235, 215]
  const fatsG = [70, 68, 72, 75, 78, 76, 71]
  const hydrationTargetMl = [2500,2500,2500,2500,2500,2500,2500]
  const hydrationActualMl = [2200,2400,2100,2600,2700,2500,2300]
  const sleepHours = [7.2, 6.9, 7.8, 8.0, 7.6, 7.1, 6.8]
  const sleepTimingScore = [78, 72, 75, 80, 82, 85, 76]
  const moodScores = [3, 3, 4, 4, 5, 4, 3]
  const focusScores = [3, 2, 4, 4, 5, 4, 3]
  const mealsLoggedCount = [3, 3, 4, 4, 4, 3, 3]
  const aiMealsPhotoCount = [1, 0, 1, 1, 1, 1, 0]
  const aiMealsScanCount = [0, 1, 0, 1, 1, 0, 1]
  const coachInteractions = [0, 1, 0, 1, 1, 0, 0]

  return {
    days,
    bodyClockScores,
    adjustedCalories,
    caloriesConsumed,
    proteinG,
    carbsG,
    fatsG,
    hydrationTargetMl,
    hydrationActualMl,
    sleepHours,
    sleepTimingScore,
    moodScores,
    focusScores,
    mealsLoggedCount,
    aiMealsPhotoCount,
    aiMealsScanCount,
    coachInteractions,
  }
}


