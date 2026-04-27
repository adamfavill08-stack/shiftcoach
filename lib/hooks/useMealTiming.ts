'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShiftState } from '@/components/providers/shift-state-provider'
import { applyUserShiftStateToMealTimingJson } from '@/lib/nutrition/applyUserShiftStateToMealTiming'

type CoachStatus = 'onTrack' | 'slightlyLate' | 'veryLate'

type MealTimingCoachSection = {
  recommendedWindows?: {
    id: string
    label: string
    timeRange: string
    focus?: string
  }[]
  meals?: {
    id: string
    label: string
    time: string
    position: number
    inWindow: boolean
  }[]
  tips?: { id: string; text: string }[]
  status?: CoachStatus
}

type MealTimingData = {
  nextMealLabel: string
  nextMealTime: string
  nextMealType: string
  nextMealMacros: { protein: number; carbs: number; fats: number }
  shiftLabel: string
  lastMeal: { time: string; description: string }
  sleepContext: string
  activityContext: string
  coach?: MealTimingCoachSection
}

export function useMealTiming() {
  const { userShiftState } = useShiftState()
  const [apiRaw, setApiRaw] = useState<MealTimingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!apiRaw) return null
    if (error) return apiRaw
    return applyUserShiftStateToMealTimingJson(
      apiRaw as unknown as Record<string, unknown>,
      userShiftState,
    ) as MealTimingData
  }, [apiRaw, userShiftState, error])

  const fetchMealTiming = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setIsLoading(true)
      }
      setError(null)

      const res = await fetch('/api/meal-timing/today', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errorData.error || `Failed to fetch meal timing (${res.status})`)
      }

      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      setApiRaw(json)
    } catch (err: any) {
      console.error('[useMealTiming] Error fetching meal timing:', err)
      setError(err.message || 'Failed to load meal timing')
      // Keep fallback payload so UI remains stable when fetch fails.
      setApiRaw({
        nextMealLabel: 'Next meal',
        nextMealTime: '—',
        nextMealType: 'Balanced meal',
        nextMealMacros: { protein: 0, carbs: 0, fats: 0 },
        shiftLabel: 'No shift data',
        lastMeal: { time: '—', description: 'Unable to load' },
        sleepContext: 'Unable to load sleep data',
        activityContext: 'Unable to load activity data',
        coach: {
          recommendedWindows: [],
          meals: [],
          tips: [],
          status: 'onTrack',
        },
      })
    } finally {
      if (showSpinner) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchMealTiming()

    // Keep next-meal time fresh while the page stays open (common in mobile webviews).
    const intervalId = window.setInterval(() => {
      fetchMealTiming(false)
    }, 60 * 1000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchMealTiming(false)
      }
    }

    const onFocus = () => fetchMealTiming(false)

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchMealTiming])

  return { data, isLoading, error }
}
