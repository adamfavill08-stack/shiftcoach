'use client'

import { useState, useEffect } from 'react'

type NutritionSummary = {
  date: string
  totals: {
    kcal: number
    protein: number
    carbs: number
    fat: number
    fiber: number | null
    sugar: number | null
    salt: number | null
  }
  byMeal: Record<string, {
    kcal: number
    protein: number
    carbs: number
    fat: number
  }>
}

export function useDailyNutrition(date?: string) {
  const [data, setData] = useState<NutritionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const dateParam = date || new Date().toISOString().split('T')[0]

  const fetchSummary = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nutrition/summary?date=${dateParam}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`)
      }
      const summary = await res.json()
      setData(summary)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('[useDailyNutrition] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [dateParam])

  return {
    data,
    isLoading,
    error,
    refresh: fetchSummary,
  }
}

