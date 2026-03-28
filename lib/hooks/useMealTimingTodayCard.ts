'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGoalChange } from '@/lib/hooks/useGoalChange'

/** Payload from GET /api/meal-timing/today used by the home “Next meal window” card. */
export type MealTimingTodayCardData = {
  nextMealLabel: string
  nextMealTime: string
  nextMealAt?: string | null
  nextMealType: string
  nextMealMacros: { protein: number; carbs: number; fats: number }
  shiftLabel: string
  shiftType: 'day' | 'night' | 'late' | 'off'
  scheduleTypeUsed?: 'off' | 'day' | 'night' | 'late'
  hasExactShiftTimes?: boolean
  usedFallbackTemplate?: boolean
  usedEstimatedShiftTimes?: boolean
  cardSubtitle?: string | null
  totalCalories: number
  totalMacros: { protein_g: number; carbs_g: number; fat_g: number }
  meals: Array<{
    id: string
    label: string
    time: string
    windowLabel: string
    calories: number
    hint: string
    macros: { protein: number; carbs: number; fats: number }
  }>
  sleepContext: string
  activityContext: string
}

export function useMealTimingTodayCard() {
  const [data, setData] = useState<MealTimingTodayCardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMealTiming = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/meal-timing/today', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        setData(null)
        console.error('[useMealTimingTodayCard] meal-timing response:', res.status)
        return
      }
      const json = await res.json()
      if (json.error) {
        setData(null)
        return
      }
      setData(json)
    } catch (err) {
      console.error('[useMealTimingTodayCard] Failed to fetch meal timing:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMealTiming()
  }, [fetchMealTiming])

  useGoalChange(() => {
    fetchMealTiming()
  })

  useEffect(() => {
    const handleProfileUpdate = () => fetchMealTiming()
    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [fetchMealTiming])

  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchMealTiming()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchMealTiming])

  return { data, loading, refetch: fetchMealTiming }
}
