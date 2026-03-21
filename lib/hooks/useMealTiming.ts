'use client'

import { useEffect, useState } from 'react'

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
  const [data, setData] = useState<MealTimingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMealTiming = async () => {
      try {
        setIsLoading(true)
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

        setData(json)
      } catch (err: any) {
        console.error('[useMealTiming] Error fetching meal timing:', err)
        setError(err.message || 'Failed to load meal timing')
        // Set fallback data on error
        setData({
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
        setIsLoading(false)
      }
    }

    fetchMealTiming()
  }, [])

  return { data, isLoading, error }
}
