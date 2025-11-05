import { useEffect, useState } from 'react'

type MealSlot = {
  id: string
  label: string
  suggestedTime: string
  calories: number
}

type TodayNutrition = {
  baseCalories: number
  adjustedCalories: number
  rhythmScore: number | null
  sleepHoursLast24h: number | null
  shiftType: 'day' | 'night' | 'off' | 'other'
  rhythmFactor: number
  sleepFactor: number
  shiftFactor: number
  meals: MealSlot[]
  macros: {
    protein_g: number
    carbs_g: number
    fat_g: number
  }
  consumedMacros: {
    protein_g: number
    carbs_g: number
    fat_g: number
  }
  hydrationTargets?: {
    water_ml: number
    caffeine_mg: number
  }
}

export function useTodayNutrition() {
  const [data, setData] = useState<TodayNutrition | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/nutrition/today')
      if (!res.ok) {
        console.error('[useTodayNutrition] failed:', res.status)
        setData(null)
        return
      }
      const json = await res.json()
      setData(json.nutrition ?? null)
    } catch (err) {
      console.error('[useTodayNutrition] error:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refetch() }, [])

  return { data, loading, refresh: refetch }
}


