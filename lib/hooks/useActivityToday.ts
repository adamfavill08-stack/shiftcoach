'use client'

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/supabase/authedFetch'
import type { IntensityBreakdown } from '@/lib/activity/calculateIntensityBreakdown'
import type { ShiftMovementPlan } from '@/lib/activity/generateShiftMovementPlan'
import type { MovementConsistencyResult } from '@/lib/activity/calculateMovementConsistency'
import type { ShiftStepsDuringShiftDay } from '@/lib/activity/computeShiftStepsDuringShifts'
import type { ActivityIntelligence } from '@/lib/activity/activityIntelligence'
import type { ActivityPersonalizationPayload } from '@/lib/activity/personalizedActivityTargets'
import type { ActivityPersonalizationAgentPayload } from '@/lib/activity/computeAdaptedStepGoalAgent'
import type { ActivityTotalsBreakdown } from '@/lib/activity/activityLogStepSum'

/** API may return legacy personalization (intensity multiplier) or adapted-step agent audit payload. */
export type ActivityPersonalizationFromApi =
  | ActivityPersonalizationPayload
  | ActivityPersonalizationAgentPayload

export function isLegacyActivityPersonalization(
  p: ActivityPersonalizationFromApi | undefined,
): p is ActivityPersonalizationPayload {
  return p != null && 'effectiveStepGoal' in p && 'intensityTargetMultiplier' in p
}

export function isAgentActivityPersonalization(
  p: ActivityPersonalizationFromApi | undefined,
): p is ActivityPersonalizationAgentPayload {
  return p != null && 'computedAt' in p && 'explanation' in p && 'factors' in p
}

export type ActivityToday = {
  stepSamples?: Array<{ timestamp: string; steps: number; endTimestamp?: string | null }>
  source?: 'apple' | 'fitbit' | 'google' | 'manual' | 'unknown'
  steps?: number
  stepTarget?: number
  /** Daily steps goal from profile (same as API `goal`). */
  goal?: number
  /** Personalized step target (sleep, shift, recovery, learned rhythm). */
  adaptedStepGoal?: number
  activityPersonalization?: ActivityPersonalizationFromApi
  activeMinutes?: number
  intensity?: 'light' | 'moderate' | 'vigorous' | 'mixed'
  mostActiveWindow?: { start: string; end: string } | null
  sitLongest?: number
  standHits?: number
  floors?: number | null
  energyScore?: number | null
  shiftType?: 'day' | 'night' | 'late' | 'off' | 'other' | null
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
  /** When set, “after shift” movement counts only until this instant (inferred main sleep start). */
  movementAfterShiftSleepWindowStartIso?: string | null

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

  /** Rota calendar day (YYYY-MM-DD) aligned with /api/activity/today window; use when saving shift demand. */
  date?: string

  activityIntelligence?: ActivityIntelligence | null

  /** 24 local-hour buckets (0–23) for chart; from sync history or estimated from daily total. */
  stepsByHour?: number[]
  /** Start instant for hour index 0 when buckets are shift-window–anchored (see /api/activity/today). */
  stepsByHourAnchorStart?: string | null

  /** Steps attributed to each rota shift window, last 7 civil days (oldest → newest). */
  shiftStepsLast7Days?: ShiftStepsDuringShiftDay[]

  /** Civil local calendar day (from client `tz`); Activity page hero steps / kcal / active time only. */
  heroCivilCalendarDay?: {
    ymd: string
    steps: number
    activeMinutes: number
    intensityBreakdown: IntensityBreakdown
    estimatedCaloriesBurned: number
    source: string
  }

  /** Civil-day step total policy (wearable vs manual); from `/api/activity/today`. */
  activityTotalsBreakdown?: ActivityTotalsBreakdown
}

/**
 * Shift-aware steps for charts, coherence fallbacks, and “Your shift movement” — not the civil-midnight hero.
 * Prefer `activityIntelligence.activityDaySteps` over top-level `steps`.
 */
export function getActivityDayStepsFromTodayApi(data: ActivityToday | null | undefined): number {
  if (!data) return 0
  return data.activityIntelligence?.activityDaySteps ?? data.steps ?? 0
}

const SHIFT_TYPES = new Set(['day', 'night', 'off', 'other'])

function parseShiftStepsLast7Days(raw: unknown): ShiftStepsDuringShiftDay[] | undefined {
  if (!Array.isArray(raw) || raw.length !== 7) return undefined
  const out: ShiftStepsDuringShiftDay[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return undefined
    const o = item as Record<string, unknown>
    if (typeof o.date !== 'string') return undefined
    const st = o.shiftType
    const shiftType =
      st === null || st === undefined
        ? null
        : typeof st === 'string' && SHIFT_TYPES.has(st)
          ? (st as ShiftStepsDuringShiftDay['shiftType'])
          : null
    out.push({
      date: o.date,
      dayLabel: typeof o.dayLabel === 'string' ? o.dayLabel : '?',
      steps: typeof o.steps === 'number' && Number.isFinite(o.steps) ? Math.max(0, Math.round(o.steps)) : 0,
      hasData: o.hasData === true,
      hasWorkShift: o.hasWorkShift === true,
      shiftType,
    })
  }
  return out
}

function parseActivityTotalsBreakdown(raw: unknown): ActivityTotalsBreakdown | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const st = o.sourceOfTruth
  if (st !== 'wearable' && st !== 'manual' && st !== 'none') return undefined
  const n = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0
  return {
    totalSteps: n(o.totalSteps),
    wearableSteps: n(o.wearableSteps),
    manualStepsCounted: n(o.manualStepsCounted),
    manualStepsNotCounted: n(o.manualStepsNotCounted),
    manualStepsSuperseded: n(o.manualStepsSuperseded),
    sourceOfTruth: st,
    contributingRowIds: Array.isArray(o.contributingRowIds)
      ? o.contributingRowIds.filter((x): x is string => typeof x === 'string')
      : undefined,
  }
}

function parseFactors(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

function parseActivityPersonalization(raw: unknown): ActivityPersonalizationFromApi | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>

  // Adapted-step agent payload (/api/activity/today success path)
  if (
    typeof o.computedAt === 'string' &&
    typeof o.explanation === 'string' &&
    o.factors != null &&
    typeof o.factors === 'object' &&
    Array.isArray(o.reasons)
  ) {
    return {
      reasons: o.reasons.filter((x): x is string => typeof x === 'string'),
      factors: parseFactors(o.factors),
      computedAt: o.computedAt,
      explanation: o.explanation,
    }
  }

  // Legacy payload (error stub or older API)
  if (
    typeof o.profileStepGoal === 'number' &&
    typeof o.effectiveStepGoal === 'number' &&
    typeof o.intensityTargetMultiplier === 'number'
  ) {
    const reasons = Array.isArray(o.reasons)
      ? o.reasons.filter((x): x is string => typeof x === 'string')
      : []
    return {
      profileStepGoal: Math.round(o.profileStepGoal),
      effectiveStepGoal: Math.round(o.effectiveStepGoal),
      intensityTargetMultiplier: o.intensityTargetMultiplier,
      reasons,
    }
  }

  return undefined
}

const fallback: ActivityToday = {
  source: 'unknown',
  steps: 0,
  stepTarget: 9000,
  goal: 10000,
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
        const tz =
          typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
        const qs = tz ? `?tz=${encodeURIComponent(tz)}` : ''
        const res = await authedFetch(`/api/activity/today${qs}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        const rawPersonalization = json.activity?.activityPersonalization
        const parsedPersonalization = parseActivityPersonalization(rawPersonalization)
        if (!cancelled) {
          setData({ 
            ...fallback, 
            ...json.activity,
            shiftType: json.activity?.shiftType ?? fallback.shiftType,
            date: typeof json.activity?.date === 'string' ? json.activity.date : undefined,
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
            movementAfterShiftSleepWindowStartIso:
              typeof json.activity?.movementAfterShiftSleepWindowStartIso === 'string' &&
              json.activity.movementAfterShiftSleepWindowStartIso.trim()
                ? json.activity.movementAfterShiftSleepWindowStartIso.trim()
                : null,
            // Recovery and Activity scores
            recoveryScore: json.activity?.recoveryScore ?? 50,
            recoveryLevel: json.activity?.recoveryLevel ?? 'Moderate',
            recoveryDescription: json.activity?.recoveryDescription ?? 'Recovery data not available.',
            activityScore: json.activity?.activityScore ?? 0,
            activityLevel: json.activity?.activityLevel ?? 'Low',
            activityScoreDescription:
              json.activity?.activityScoreDescription ?? 'Activity data not available.',
            // Movement consistency
            movementConsistency: json.activity?.movementConsistency ?? 0,
            movementConsistencyData: json.activity?.movementConsistencyData ?? undefined,
            activityIntelligence: json.activity?.activityIntelligence ?? undefined,
            stepsByHour:
              Array.isArray(json.activity?.stepsByHour) && json.activity.stepsByHour.length === 24
                ? json.activity.stepsByHour.map((n: unknown) =>
                    typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0,
                  )
                : undefined,
            stepSamples:
              Array.isArray(json.activity?.stepSamples)
                ? json.activity.stepSamples
                    .map((s: unknown) => {
                      if (!s || typeof s !== 'object') return null
                      const o = s as Record<string, unknown>
                      if (typeof o.timestamp !== 'string') return null
                      const steps = typeof o.steps === 'number' && Number.isFinite(o.steps) ? Math.max(0, o.steps) : 0
                      const endTimestamp =
                        typeof o.endTimestamp === 'string' && o.endTimestamp.trim()
                          ? o.endTimestamp
                          : null
                      return { timestamp: o.timestamp, steps, endTimestamp }
                    })
                    .filter(
                      (
                        s: { timestamp: string; steps: number; endTimestamp: string | null } | null,
                      ): s is { timestamp: string; steps: number; endTimestamp: string | null } =>
                        s != null,
                    )
                : undefined,
            stepsByHourAnchorStart:
              json.activity && 'stepsByHourAnchorStart' in json.activity
                ? (json.activity as { stepsByHourAnchorStart: string | null }).stepsByHourAnchorStart
                : undefined,
            shiftStepsLast7Days: parseShiftStepsLast7Days(json.activity?.shiftStepsLast7Days),
            activityTotalsBreakdown: parseActivityTotalsBreakdown(json.activity?.activityTotalsBreakdown),
            adaptedStepGoal:
              typeof json.activity?.adaptedStepGoal === 'number' &&
              Number.isFinite(json.activity.adaptedStepGoal)
                ? Math.round(json.activity.adaptedStepGoal)
                : undefined,
            activityPersonalization:
              parsedPersonalization ??
              (rawPersonalization && typeof rawPersonalization === 'object'
                ? (rawPersonalization as ActivityPersonalizationFromApi)
                : undefined),
          })
        }
      } catch {
        if (!cancelled) setData(fallback)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    fetchData()

    let debounce: ReturnType<typeof setTimeout> | null = null
    const handleUpdate = () => {
      if (debounce != null) clearTimeout(debounce)
      debounce = setTimeout(() => {
        debounce = null
        if (!cancelled) void fetchData()
      }, 300)
    }
    window.addEventListener('activity-level-updated', handleUpdate)
    window.addEventListener('wearables-synced', handleUpdate)
    window.addEventListener('sleep-refreshed', handleUpdate)
    window.addEventListener('activity-manual-logged', handleUpdate)

    return () => {
      cancelled = true
      if (debounce != null) clearTimeout(debounce)
      window.removeEventListener('activity-level-updated', handleUpdate)
      window.removeEventListener('wearables-synced', handleUpdate)
      window.removeEventListener('sleep-refreshed', handleUpdate)
      window.removeEventListener('activity-manual-logged', handleUpdate)
    }
  }, [])

  return { data, loading }
}
