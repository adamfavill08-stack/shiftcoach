'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGoalChange } from '@/lib/hooks/useGoalChange'
import { useShiftState } from '@/components/providers/shift-state-provider'
import { applyUserShiftStateToMealTimingJson } from '@/lib/nutrition/applyUserShiftStateToMealTiming'
import { authedFetch } from '@/lib/supabase/authedFetch'

/** Payload from GET /api/meal-timing/today used by the home “Next meal window” card. */
export type MealTimingTodayCardData = {
  nextMealLabel: string
  nextMealTime: string
  nextMealAt?: string | null
  nextMealType: string
  nextMealSubtitle?: string | null
  nextMealMacros: { protein: number; carbs: number; fats: number }
  shiftLabel: string
  shiftBadgeBorderColor?: string
  dailyGuidance?: {
    fatigueRisk: 'low' | 'moderate' | 'high' | 'critical'
    dayType: string
    primaryRecommendation: string
  }
  shiftType: 'day' | 'night' | 'late' | 'off'
  scheduleTypeUsed?: 'off' | 'day' | 'night' | 'late'
  hasExactShiftTimes?: boolean
  usedFallbackTemplate?: boolean
  usedEstimatedShiftTimes?: boolean
  cardSubtitle?: string | null
  /** Schedule shaping context (off-day / transition / long shift), from meal planner meta. */
  scheduleContextSubtitle?: string | null
  totalCalories: number
  totalMacros: { protein_g: number; carbs_g: number; fat_g: number }
  meals: Array<{
    id: string
    label: string
    time: string
    dayTag?: 'today' | 'tomorrow'
    windowLabel: string
    calories: number
    hint: string
    subtitle?: string
    macros: { protein: number; carbs: number; fats: number }
    /** Template label (e.g. "Dinner") when `label` is a shift-coach reason. */
    categoryLabel?: string
  }>
  mealPlanInputs?: {
    shiftType: 'day' | 'night' | 'late' | 'off'
    shiftStartIso: string | null
    shiftEndIso: string | null
    wakeTimeIso: string | null
    expectedSleepHours?: number
    loggedWakeAfterShiftIso?: string | null
  }
  sleepContext: string
  activityContext: string
}

export function useMealTimingTodayCard() {
  const { userShiftState } = useShiftState()
  const [apiRaw, setApiRaw] = useState<MealTimingTodayCardData | null>(null)
  const [loading, setLoading] = useState(true)

  const data = useMemo(
    () =>
      apiRaw
        ? (applyUserShiftStateToMealTimingJson(
            apiRaw as unknown as Record<string, unknown>,
            userShiftState,
          ) as MealTimingTodayCardData)
        : null,
    [apiRaw, userShiftState],
  )

  const fetchMealTiming = useCallback(async () => {
    try {
      setLoading(true)
      const tz =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
      const res = await authedFetch(`/api/meal-timing/today?tz=${encodeURIComponent(tz)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setApiRaw(null)
        if (res.status === 401 || res.status === 403) {
          console.warn('[useMealTimingTodayCard] meal-timing auth not ready', res.status)
        } else {
          console.error('[useMealTimingTodayCard] meal-timing response:', res.status)
        }
        return
      }
      const json = await res.json()
      if (json.error) {
        setApiRaw(null)
        return
      }
      setApiRaw(json as MealTimingTodayCardData)
    } catch (err) {
      console.error('[useMealTimingTodayCard] Failed to fetch meal timing:', err)
      setApiRaw(null)
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
    const onSleepRefreshed = () => fetchMealTiming()
    window.addEventListener('sleep-refreshed', onSleepRefreshed)
    return () => window.removeEventListener('sleep-refreshed', onSleepRefreshed)
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
