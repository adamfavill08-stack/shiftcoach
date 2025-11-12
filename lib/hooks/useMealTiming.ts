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

  useEffect(() => {
    setData({
      nextMealLabel: 'Next meal',
      nextMealTime: '14:30',
      nextMealType: 'Light, high-protein meal',
      nextMealMacros: { protein: 30, carbs: 45, fats: 15 },
      shiftLabel: 'Night shift · 19:00–07:00',
      lastMeal: { time: '10:45', description: 'Overnight snack' },
      sleepContext: '4h 50m sleep in last 24h',
      activityContext: '3,200 steps so far today',
      coach: {
        recommendedWindows: [
          { id: 'breakfast', label: 'Early window', timeRange: '06:30–09:00', focus: 'Gentle breakfast' },
          { id: 'main', label: 'Main window', timeRange: '11:30–14:30', focus: 'Main meal' },
          { id: 'late', label: 'Late window', timeRange: '17:30–20:00', focus: 'Lighter evening meal' },
        ],
        meals: [
          { id: 'm1', label: 'Breakfast', time: '07:40', position: 0.18, inWindow: true },
          { id: 'm2', label: 'Lunch', time: '13:25', position: 0.52, inWindow: true },
          { id: 'm3', label: 'Snack', time: '22:40', position: 0.85, inWindow: false },
        ],
        tips: [],
        status: 'slightlyLate',
      },
    })
    setIsLoading(false)
  }, [])

  return { data, isLoading }
}
