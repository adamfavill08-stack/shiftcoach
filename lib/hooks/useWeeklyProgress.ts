"use client"

import { useEffect, useMemo, useState } from 'react'
import { getRollingWeekStartThroughUtcToday } from '@/lib/date/utcCalendar'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/supabase/authedFetch'

export type DayKey = string

export type WeeklyProgress = {
  /** UTC YYYY-MM-DD of first series day; use for matching “today” to bar index */
  weekStartYmd: string | null
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

function coerceWeekStartYmd(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1]! : null
  }
  return null
}

/**
 * Accepts PostgREST jsonb arrays or JSON strings.
 * Missing, null, or empty `[]` (common DB default for new jsonb columns) becomes seven zeros
 * so the body-clock chart can render instead of staying on “Waiting…”.
 */
function coerceSevenNumberArray(raw: unknown): number[] | null {
  let arr: unknown[] | null = null
  if (raw == null) {
    arr = []
  } else if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      if (p == null) arr = []
      else if (Array.isArray(p)) arr = p
      else return null
    } catch {
      return null
    }
  } else {
    return null
  }

  let a = [...arr]
  if (a.length === 0) {
    a = new Array(7).fill(0)
  }
  if (a.length > 7) a = a.slice(0, 7)
  while (a.length < 7) a.push(0)
  const out: number[] = []
  for (const x of a) {
    const n = typeof x === 'number' && !Number.isNaN(x) ? x : Number(x)
    if (!Number.isFinite(n)) return null
    out.push(n)
  }
  return out
}

const MOCK: WeeklyProgress = {
  weekStartYmd: null,
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
    weekStartYmd: null,
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
        const res = await authedFetch('/api/weekly-summary/latest', { cache: 'no-store' })
        const httpStatus = res.status
        let json: unknown = null
        try {
          json = await res.json()
        } catch (parseErr) {
          console.log('[useWeeklyProgress] authedFetch resolved', {
            httpStatus,
            json: null,
            parseError: String(parseErr),
          })
          throw parseErr
        }
        console.log('[useWeeklyProgress] authedFetch resolved', {
          httpStatus,
          json: JSON.stringify(json),
        })

        if (!res.ok) {
          console.log(
            '[useWeeklyProgress] hasRealData -> false, why: HTTP not OK after parse (unexpected if body is JSON)',
          )
          throw new Error(String(res.status))
        }

        const summary = (json as { summary?: unknown })?.summary

        if (cancelled || !summary) {
          console.log('[useWeeklyProgress] hasRealData -> false, why:', !summary ? 'summary is null/undefined in JSON' : 'cancelled before setState')
          setState({
            ...MOCK,
            weekStartYmd: null,
            loading: false,
            hasNewInsights: false,
            hasRealData: false,
          })
          return
        }

        const s = summary as Record<string, unknown>

        const toArray = (v: number[] | null | undefined, fallback: number[]): number[] =>
          Array.isArray(v) && v.length === 7 ? v : fallback

        const bodyParsed = coerceSevenNumberArray(s.body_clock_scores)
        console.log(
          '[useWeeklyProgress] coerceSevenNumberArray(body_clock_scores) result:',
          bodyParsed,
          'raw:',
          s.body_clock_scores,
        )

        let sleepParsed = coerceSevenNumberArray(s.sleep_hours)
        console.log(
          '[useWeeklyProgress] coerceSevenNumberArray(sleep_hours) result (before zero-fill):',
          sleepParsed,
          'raw:',
          s.sleep_hours,
        )
        if (bodyParsed && !sleepParsed) sleepParsed = new Array(7).fill(0)
        console.log(
          '[useWeeklyProgress] sleep_hours final array used for useReal:',
          sleepParsed,
        )

        const timingParsed = coerceSevenNumberArray(s.sleep_timing_scores)

        const useReal = bodyParsed != null && sleepParsed != null

        const weekStartFromSummary = coerceWeekStartYmd(s.week_start)
        const weekStartYmd =
          weekStartFromSummary ?? (useReal ? getRollingWeekStartThroughUtcToday() : null)

        // Week labels: UTC calendar days (aligned with series + shift_rhythm_scores.date)
        const days: DayKey[] = []
        if (weekStartYmd) {
          const [sy, sm, sd] = weekStartYmd.split('-').map(Number)
          for (let i = 0; i < 7; i++) {
            const t = Date.UTC(sy, sm - 1, sd + i)
            const label = new Date(t).toLocaleDateString('en-GB', {
              weekday: 'short',
              timeZone: 'UTC',
            })
            days.push(label)
          }
        }

        const bodyClockScores = useReal ? bodyParsed! : MOCK.bodyClockScores
        const sleepHours = useReal ? sleepParsed! : MOCK.sleepHours
        const sleepTimingScore: number[] = useReal
          ? timingParsed ?? new Array(7).fill(0)
          : toArray(s.sleep_timing_scores as number[] | null | undefined, MOCK.sleepTimingScore)
        const moodScores = toArray(s.mood_scores as number[] | null | undefined, MOCK.moodScores)
        const focusScores = toArray(s.focus_scores as number[] | null | undefined, MOCK.focusScores)

        const adjustedCalories = toArray(
          s.adjusted_calories as number[] | null | undefined,
          MOCK.adjustedCalories,
        )
        const caloriesConsumed = toArray(
          s.calories_consumed as number[] | null | undefined,
          MOCK.caloriesConsumed,
        )
        const proteinG = toArray(s.protein_g as number[] | null | undefined, MOCK.proteinG)
        const carbsG = toArray(s.carbs_g as number[] | null | undefined, MOCK.carbsG)
        const fatsG = toArray(s.fats_g as number[] | null | undefined, MOCK.fatsG)

        const hydrationTargetMl = toArray(
          s.hydration_target_ml as number[] | null | undefined,
          MOCK.hydrationTargetMl,
        )
        const hydrationActualMl = toArray(
          s.hydration_actual_ml as number[] | null | undefined,
          MOCK.hydrationActualMl,
        )

        const mealsLoggedCount = toArray(
          s.meals_logged_count as number[] | null | undefined,
          MOCK.mealsLoggedCount,
        )
        const aiMealsPhotoCount = toArray(
          s.ai_meals_photo_count as number[] | null | undefined,
          MOCK.aiMealsPhotoCount,
        )
        const aiMealsScanCount = toArray(
          s.ai_meals_scan_count as number[] | null | undefined,
          MOCK.aiMealsScanCount,
        )
        const coachInteractions = toArray(
          s.coach_interactions as number[] | null | undefined,
          MOCK.coachInteractions,
        )

        const storedWeekId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('weeklySummaryWeekStart')
            : null

        const hasNewInsights =
          useReal &&
          weekStartYmd != null &&
          weekStartYmd !== storedWeekId

        if (!cancelled) {
          console.log('[useWeeklyProgress] hasRealData ->', useReal, {
            why: useReal
              ? 'bodyParsed and sleepParsed are both non-null (7 numbers each; sleep may be zero-filled)'
              : bodyParsed == null
                ? 'body_clock_scores coerceSevenNumberArray returned null'
                : 'sleep_hours still null after coercion/zero-fill (unexpected)',
          })

          if (typeof window !== 'undefined' && hasNewInsights && weekStartYmd) {
            window.localStorage.setItem('weeklySummaryWeekStart', weekStartYmd)
          }

          setState({
            weekStartYmd,
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
      } catch (err) {
        console.log('[useWeeklyProgress] hasRealData -> false, why: load() threw or early error', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setState({
            ...MOCK,
            weekStartYmd: null,
            loading: false,
            hasNewInsights: false,
            hasRealData: false,
          })
        }
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (
        session?.access_token != null &&
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION')
      ) {
        void load()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [weekOffset])

  return useMemo(() => state, [state])
}

