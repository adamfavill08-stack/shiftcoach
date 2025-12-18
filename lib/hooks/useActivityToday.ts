'use client'

import { useEffect, useState } from 'react'
import type { IntensityBreakdown } from '@/lib/activity/calculateIntensityBreakdown'
import type { ShiftMovementPlan } from '@/lib/activity/generateShiftMovementPlan'
import type { MovementConsistencyResult } from '@/lib/activity/calculateMovementConsistency'

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
  
  // New activity level fields
  shiftActivityLevel?: 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null
  activityLabel?: string | null
  activityDescription?: string | null
  estimatedCaloriesBurned?: number
  activityImpact?: string
  activityFactor?: number
  recoverySuggestion?: string
  
  // Intensity breakdown
  intensityBreakdown?: IntensityBreakdown
  
  // Shift movement plan
  movementPlan?: ShiftMovementPlan
  shiftStart?: string | null
  shiftEnd?: string | null
  
  // Recovery and Activity scores
  recoveryScore?: number
  recoveryLevel?: 'Low' | 'Moderate' | 'High'
  recoveryDescription?: string
  activityScore?: number
  activityLevel?: 'Low' | 'Low-Moderate' | 'Moderate' | 'High'
  activityScoreDescription?: string
  
  // Movement consistency
  movementConsistency?: number
  movementConsistencyData?: MovementConsistencyResult
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
    const fetchData = async () => {
      try {
        const res = await fetch('/api/activity/today', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!cancelled) {
          setData({ 
            ...fallback, 
            ...json.activity,
            // Map new fields from API response
            shiftActivityLevel: json.activity?.shiftActivityLevel ?? null,
            activityLabel: json.activity?.activityLabel ?? null,
            activityDescription: json.activity?.activityDescription ?? null,
            estimatedCaloriesBurned: json.activity?.estimatedCaloriesBurned ?? 0,
            activityImpact: json.activity?.activityImpact ?? 'Not set',
            activityFactor: json.activity?.activityFactor ?? 1.0,
            recoverySuggestion: json.activity?.recoverySuggestion ?? null,
            // Intensity breakdown
            intensityBreakdown: json.activity?.intensityBreakdown ?? undefined,
            // Movement plan
            movementPlan: json.activity?.movementPlan ?? undefined,
            shiftStart: json.activity?.shiftStart ?? null,
            shiftEnd: json.activity?.shiftEnd ?? null,
            // Recovery and Activity scores
            recoveryScore: json.activity?.recoveryScore ?? 50,
            recoveryLevel: json.activity?.recoveryLevel ?? 'Moderate',
            recoveryDescription: json.activity?.recoveryDescription ?? 'Recovery data not available.',
            activityScore: json.activity?.activityScore ?? 0,
            activityLevel: json.activity?.activityLevel ?? 'Low',
            activityScoreDescription: json.activity?.activityScoreDescription ?? 'Activity data not available.',
            // Movement consistency
            movementConsistency: json.activity?.movementConsistency ?? 0,
            movementConsistencyData: json.activity?.movementConsistencyData ?? undefined,
          })
        }
      } catch {
        if (!cancelled) setData(fallback)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    fetchData()
    
    // Listen for activity level updates
    const handleUpdate = () => {
      if (!cancelled) fetchData()
    }
    window.addEventListener('activity-level-updated', handleUpdate)
    
    return () => {
      cancelled = true
      window.removeEventListener('activity-level-updated', handleUpdate)
    }
  }, [])

  return { data, loading }
}
