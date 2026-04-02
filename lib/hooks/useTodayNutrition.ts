import { useCallback, useEffect, useState } from 'react'
import { useGoalChange } from './useGoalChange'
import { authedFetch } from '@/lib/supabase/authedFetch'

type MealSlot = {
  id: string
  label: string
  suggestedTime: string
  calories: number
}

type TodayNutrition = {
  palBaseCalories?: number
  goalAdjustmentKcal?: number
  baseCalories: number
  adjustedCalories: number
  rhythmScore: number | null
  sleepHoursLast24h: number | null
  sleepPrimaryHours?: number | null
  sleepNapHours?: number | null
  shiftType: 'day' | 'night' | 'off' | 'early' | 'late' | 'other'
  rhythmFactor: number
  sleepFactor: number
  shiftFactor: number
  shiftActivityFactor?: number
  dailyActivityFactor?: number
  activityLevel?: string | null
  stepsToday?: number | null
  activeMinutesToday?: number | null
  modifierProductRaw?: number
  modifierProductApplied?: number
  guardRailApplied?: boolean
  calorieModifiersCapped?: boolean
  modifierGuardDeltaKcal?: number
  modifierChain?: Array<{
    id: string
    factor: number
    deltaKcal: number
    runningKcal: number
  }>
  sex: 'male' | 'female' | 'other'
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
  dataQuality?: {
    caloriesModel?: string
    consumedMacrosSource?: string
    hydrationSource?: string
  }
  /** Shift day key (07:00 boundary); aligns shift + sleep with rota `date`. */
  shiftedDayKey?: string | null
  goal?: 'lose' | 'maintain' | 'gain'
  macroPreset?: 'balanced' | 'high_protein' | 'custom'
}

export function useTodayNutrition() {
  const [data, setData] = useState<TodayNutrition | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async (forceFresh = false) => {
    try {
      setLoading(true)

      const res = await authedFetch(
        '/api/nutrition/today',
        (forceFresh
          ? { cache: 'no-store' }
          : { next: { revalidate: 30 } }) as RequestInit,
      )

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.warn('[useTodayNutrition] auth not ready', res.status)
        } else {
          console.error('[useTodayNutrition] failed:', res.status)
        }
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
  }, [])

  // Initial load can safely use short-lived caching for speed
  useEffect(() => {
    void refetch(false)
  }, [refetch])

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

  useEffect(() => {
    const onWaterLogged = () => {
      void refetch(true)
    }
    window.addEventListener('water-logged', onWaterLogged)
    return () => window.removeEventListener('water-logged', onWaterLogged)
  }, [refetch])

  return { data, loading, refresh: refetch }
}


