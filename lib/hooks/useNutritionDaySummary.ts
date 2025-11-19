'use client'

import { useEffect, useState } from 'react'
import type { DaySummary } from '@/lib/nutrition/types'

export function useNutritionDaySummary(date: string) {
  const [data, setData] = useState<DaySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nutrition/summary?date=${date}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Request failed with ${res.status}`)
      }

      const json = (await res.json()) as DaySummary
      setData(json)
    } catch (err: any) {
      console.error('[useNutritionDaySummary] error', err)
      setError(err?.message || 'Failed to load nutrition summary')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [date])

  return { data, isLoading, error, refetch }
}

