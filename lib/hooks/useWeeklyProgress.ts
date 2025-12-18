"use client"

import { useEffect, useMemo, useState } from 'react'

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
  /** true when data is still loading */
  loading?: boolean
  /** set when a new weekly summary has been generated */
  hasNewInsights?: boolean
  /** true when values come from a real weekly_summaries row, not mock data */
  hasRealData?: boolean
}

const MOCK: WeeklyProgress = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  bodyClockScores: [82, 79, 80, 84, 86, 88, 83],
  adjustedCalories: [2300, 2280, 2320, 2350, 2400, 2380, 2290],
  caloriesConsumed: [2250, 2200, 2350, 2360, 2420, 2400, 2280],
  proteinG: [150, 142, 158, 160, 165, 162, 149],
  carbsG: [210, 205, 220, 230, 240, 235, 215],
  fatsG: [70, 68, 72, 75, 78, 76, 71],
  hydrationTargetMl: [2500, 2500, 2500, 2500, 2500, 2500, 2500],
  hydrationActualMl: [2200, 2400, 2100, 2600, 2700, 2500, 2300],
  sleepHours: [7.2, 6.9, 7.8, 8.0, 7.6, 7.1, 6.8],
  sleepTimingScore: [78, 72, 75, 80, 82, 85, 76],
  moodScores: [3, 3, 4, 4, 5, 4, 3],
  focusScores: [3, 2, 4, 4, 5, 4, 3],
  mealsLoggedCount: [3, 3, 4, 4, 4, 3, 3],
  aiMealsPhotoCount: [1, 0, 1, 1, 1, 1, 0],
  aiMealsScanCount: [0, 1, 0, 1, 1, 0, 1],
  coachInteractions: [0, 1, 0, 1, 1, 0, 0],
}

export function useWeeklyProgress(weekOffset: number = 0): WeeklyProgress {
  const [state, setState] = useState<WeeklyProgress>({
    ...MOCK,
    loading: true,
    hasNewInsights: false,
    hasRealData: false,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setState((prev) => ({ ...prev, loading: true }))

        // For now we use the latest weekly summary as "real" data source.
        // Later this can be swapped to a dedicated /api/weekly-metrics route.
        const res = await fetch('/api/weekly-summary/latest', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(String(res.status))
        }
        const json = await res.json()
        const summary = json?.summary

        if (cancelled || !summary) {
          setState({
            ...MOCK,
            loading: false,
            hasNewInsights: false,
            hasRealData: false,
          })
          return
        }

        // Map week_start..week_end into 7 labels
        const startDate = new Date(summary.week_start)
        const days: DayKey[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate)
          d.setDate(startDate.getDate() + i)
          const label = d.toLocaleDateString('en-GB', { weekday: 'short' })
          days.push(label)
        }

        const toArray = (v: number[] | null | undefined, fallback: number[]): number[] =>
          Array.isArray(v) && v.length === 7 ? v : fallback

        // We treat data as "real" only if key circadian arrays have a full 7-day window
        const hasSevenBodyClock =
          Array.isArray(summary.body_clock_scores) && summary.body_clock_scores.length === 7
        const hasSevenSleep =
          Array.isArray(summary.sleep_hours) && summary.sleep_hours.length === 7

        const useReal = hasSevenBodyClock && hasSevenSleep

        const bodyClockScores = toArray(
          useReal ? summary.body_clock_scores : null,
          MOCK.bodyClockScores,
        )
        const sleepHours = toArray(useReal ? summary.sleep_hours : null, MOCK.sleepHours)
        const sleepTimingScore = toArray(
          useReal ? summary.sleep_timing_scores : null,
          MOCK.sleepTimingScore,
        )
        const moodScores = toArray(summary.mood_scores, MOCK.moodScores)
        const focusScores = toArray(summary.focus_scores, MOCK.focusScores)

        const adjustedCalories = toArray(summary.adjusted_calories, MOCK.adjustedCalories)
        const caloriesConsumed = toArray(summary.calories_consumed, MOCK.caloriesConsumed)
        const proteinG = toArray(summary.protein_g, MOCK.proteinG)
        const carbsG = toArray(summary.carbs_g, MOCK.carbsG)
        const fatsG = toArray(summary.fats_g, MOCK.fatsG)

        const hydrationTargetMl = toArray(
          summary.hydration_target_ml,
          MOCK.hydrationTargetMl,
        )
        const hydrationActualMl = toArray(
          summary.hydration_actual_ml,
          MOCK.hydrationActualMl,
        )

        const mealsLoggedCount = toArray(summary.meals_logged_count, MOCK.mealsLoggedCount)
        const aiMealsPhotoCount = toArray(summary.ai_meals_photo_count, MOCK.aiMealsPhotoCount)
        const aiMealsScanCount = toArray(summary.ai_meals_scan_count, MOCK.aiMealsScanCount)
        const coachInteractions = toArray(summary.coach_interactions, MOCK.coachInteractions)

        const storedWeekId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('weeklySummaryWeekStart')
            : null

        const hasNewInsights =
          useReal &&
          typeof summary.week_start === 'string' &&
          summary.week_start !== storedWeekId

        if (!cancelled) {
          if (typeof window !== 'undefined' && hasNewInsights) {
            window.localStorage.setItem('weeklySummaryWeekStart', summary.week_start)
          }

          setState({
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
            loading: false,
            hasNewInsights,
            hasRealData: useReal,
          })
        }
      } catch {
        if (!cancelled) {
          setState({
            ...MOCK,
            loading: false,
            hasNewInsights: false,
            hasRealData: false,
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [weekOffset])

  return useMemo(() => state, [state])
}

