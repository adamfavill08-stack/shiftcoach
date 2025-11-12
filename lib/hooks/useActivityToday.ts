'use client'

import { useEffect, useState } from 'react'

export type ActivityToday = {
  source?: 'apple' | 'fitbit' | 'google' | 'manual' | 'unknown'
  steps?: number
  stepTarget?: number
  activeMinutes?: number
  intensity?: 'light' | 'moderate' | 'vigorous' | 'mixed'
  mostActiveWindow?: { start: string; end: string } | null
  sitLongest?: number
  standHits?: number
  floors?: number | null
  energyScore?: number | null
  shiftType?: 'day' | 'night' | 'late' | 'off' | null
  recoverySignal?: 'GREEN' | 'AMBER' | 'RED'
  timeline?: Array<{ hour: number; level: 0 | 1 | 2 | 3 }>
  nextCoachMessage?: string
}

const fallback: ActivityToday = {
  source: 'unknown',
  steps: 0,
  stepTarget: 9000,
  activeMinutes: 0,
  intensity: 'light',
  mostActiveWindow: null,
  sitLongest: 0,
  standHits: 0,
  floors: null,
  energyScore: null,
  shiftType: null,
  recoverySignal: 'AMBER',
  timeline: Array.from({ length: 16 }, (_, i) => ({ hour: i, level: 0 })),
  nextCoachMessage: 'Add a short walk before your shift to balance today better.',
}

export function useActivityToday() {
  const [data, setData] = useState<ActivityToday>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/activity/today', { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!cancelled) setData({ ...fallback, ...json })
      } catch {
        if (!cancelled) setData(fallback)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading }
}
