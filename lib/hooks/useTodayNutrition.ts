import { useEffect, useState } from 'react'
import { useGoalChange } from './useGoalChange'

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
    sat_fat_g?: number
  }
  consumedMacros: {
    protein_g: number
    carbs_g: number
    fat_g: number
    sat_fat_g?: number
  }
  hydrationTargets?: {
    water_ml: number
    caffeine_mg: number
  }
  hydrationIntake?: {
    water_ml: number
    caffeine_mg: number
  }
}

export function useTodayNutrition() {
  const [data, setData] = useState<TodayNutrition | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = async (forceFresh = false) => {
    try {
      setLoading(true)
      const res = await fetch('/api/nutrition/today', 
        forceFresh
          ? { cache: 'no-store' } // used when something important just changed
          : { next: { revalidate: 30 } } // short-lived cache for normal loads
      )
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

  // Initial load can safely use short-lived caching for speed
  useEffect(() => { refetch(false) }, [])

  // Listen for goal changes and refetch
  useGoalChange(() => {
    // Goal changes should immediately recompute, bypassing cache
    refetch(true)
  })

  // Listen for weight and height changes - these affect BMR and all calculations
  useEffect(() => {
    const handleWeightChange = () => {
      console.log('[useTodayNutrition] Weight changed, refetching nutrition data...')
      refetch(true)
    }
    
    const handleHeightChange = () => {
      console.log('[useTodayNutrition] Height changed, refetching nutrition data...')
      refetch(true)
    }
    
    const handleProfileUpdate = () => {
      console.log('[useTodayNutrition] Profile updated, refetching nutrition data...')
      refetch(true)
    }

    window.addEventListener('weightChanged', handleWeightChange)
    window.addEventListener('heightChanged', handleHeightChange)
    window.addEventListener('profile-updated', handleProfileUpdate)

    return () => {
      window.removeEventListener('weightChanged', handleWeightChange)
      window.removeEventListener('heightChanged', handleHeightChange)
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [refetch])

  // Meal logging removed - no event listeners needed

  return { data, loading, refresh: refetch }
}


