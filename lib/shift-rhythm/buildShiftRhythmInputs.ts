import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import type { ShiftContextResult } from '@/lib/shift-context/types'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'
import { getTodayHydrationIntake } from '@/lib/nutrition/getTodayHydrationIntake'
import {
  applyHolidayAsOffToShiftRows,
  fetchHolidayLocalDatesSet,
} from '@/lib/rota/holidayRotaPriority'
import { addCalendarDaysToYmd, rowCountsAsPrimarySleep } from '@/lib/sleep/utils'
import { fetchMergedPhoneHealthSleepSessionsOverlapping } from '@/lib/sleep/sleepRecordsSummaryFallback'
import { isoLocalDate } from '@/lib/shifts'
import { toShiftType as toStandardShiftType, toShiftRhythmType } from '@/lib/shifts/toShiftType'

const DEFAULT_SLEEP_TARGET = 7.5

/** Canonical `start_at` / legacy `start_ts` — same strategy as `/api/shift-rhythm` sleep deficit. */
async function fetchRecentSleepRows(
  supabase: { from: (t: string) => any },
  userId: string,
  rangeStartIso: string,
): Promise<Record<string, unknown>[]> {
  const baseSelect = 'start_at,end_at,start_ts,end_ts,sleep_hours,duration_min,quality,date,created_at'
  const rangeStartDate = rangeStartIso.slice(0, 10)
  const attempts: Array<{ name: string; run: () => Promise<any> }> = [
    {
      name: 'start_at+deleted_at',
      run: () =>
      supabase
        .from('sleep_logs')
        .select(baseSelect)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('start_at', rangeStartIso)
        .order('start_at', { ascending: false })
        .limit(40),
    },
    {
      name: 'start_at',
      run: () =>
      supabase
        .from('sleep_logs')
        .select(baseSelect)
        .eq('user_id', userId)
        .gte('start_at', rangeStartIso)
        .order('start_at', { ascending: false })
        .limit(40),
    },
    {
      name: 'date-window',
      run: () =>
      supabase
        .from('sleep_logs')
        .select(baseSelect)
        .eq('user_id', userId)
        .gte('date', rangeStartDate)
        .order('date', { ascending: false })
        .limit(40),
    },
    {
      name: 'start_ts-legacy',
      run: () =>
      supabase
        .from('sleep_logs')
        .select(baseSelect)
        .eq('user_id', userId)
        .gte('start_ts', rangeStartIso)
        .order('start_ts', { ascending: false })
        .limit(40),
    },
    {
      name: 'latest-by-date',
      run: () =>
      supabase
        .from('sleep_logs')
        .select(baseSelect)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(40),
    },
  ]

  let lastError: any = null
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]!
    const res = await attempt.run()
    if (res.error) {
      lastError = res.error
      // Keep production logs concise: only emit failures on fallback attempts.
      if (i > 0) {
        console.info('[buildShiftRhythmInputs] sleep fetch fallback attempt failed', {
          userId,
          attempt: attempt.name,
          code: res.error.code,
        })
      }
      continue
    }
    const rows = (res.data ?? []) as Record<string, unknown>[]
    // Primary attempt is expected and silent; log only when fallback path produced data.
    if (i > 0 && rows.length > 0) {
      console.info('[buildShiftRhythmInputs] sleep fetch recovered via fallback', {
        userId,
        attempt: attempt.name,
        rows: rows.length,
      })
    }
    if (rows.length > 0) return rows
  }

  if (lastError) {
    console.warn('[buildShiftRhythmInputs] sleep row fetch attempts exhausted', {
      code: lastError.code,
      message: lastError.message,
    })
  }
  return []
}

function mapSleepRowToLog(row: Record<string, unknown>) {
  const start = (row.start_at ?? row.start_ts ?? row.created_at) as string | undefined
  const end = (row.end_at ?? row.end_ts ?? start) as string | undefined
  let durationHours: number | null =
    typeof row.sleep_hours === 'number' && Number.isFinite(row.sleep_hours) ? row.sleep_hours : null
  if (
    durationHours == null &&
    typeof row.duration_min === 'number' &&
    Number.isFinite(row.duration_min) &&
    row.duration_min > 0
  ) {
    durationHours = row.duration_min / 60
  }
  if (durationHours == null && start && end) {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    durationHours = ms > 0 ? ms / 3600000 : null
  }
  const endAnchor = (row.end_at ?? row.end_ts ?? end ?? start) as string | undefined
  return {
    date: (typeof row.date === 'string' ? row.date.slice(0, 10) : null) ??
      (start ? start.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    start: start ?? new Date().toISOString(),
    end: end ?? start ?? new Date().toISOString(),
    durationHours: durationHours ?? 0,
    quality: (typeof row.quality === 'number' ? row.quality : null) as number | null,
    endMs: endAnchor ? new Date(endAnchor).getTime() : 0,
  }
}

type ShiftRow = {
  date: string
  label: string | null
  start_ts: string | null
}

/**
 * Seven local calendar days ending today, merged with DB shifts, holidays forced OFF,
 * and missing dates treated as OFF so fatigue/binge see the same rota story as shift-context APIs.
 * Sorted newest-first (matches fatigue/binge expectations for shifts[0] ≈ latest day).
 */
function buildShiftDaysForRollingWeek(
  dbRows: { date: string; label?: string | null; start_ts?: string | null }[],
  holidayDates: Set<string>,
  startYmd: string,
  todayYmd: string,
): { date: string; type: ReturnType<typeof toShiftRhythmType> }[] {
  const holidayAdjusted = applyHolidayAsOffToShiftRows(dbRows, holidayDates)
  const byDate = new Map<string, ShiftRow>()
  for (const r of holidayAdjusted) {
    byDate.set(r.date, {
      date: r.date,
      label: r.label ?? null,
      start_ts: r.start_ts ?? null,
    })
  }

  const weekDates: string[] = []
  let y = startYmd
  for (let i = 0; i < 7; i++) {
    weekDates.push(y)
    y = addCalendarDaysToYmd(y, 1)
  }
  if (weekDates[weekDates.length - 1] !== todayYmd) {
    console.warn('[buildShiftRhythmInputs] week end mismatch', { startYmd, todayYmd, last: weekDates[weekDates.length - 1] })
  }

  return weekDates
    .map((date) => {
      const row = byDate.get(date) ?? { date, label: 'OFF', start_ts: null }
      const final: ShiftRow = holidayDates.has(date)
        ? { date, label: 'OFF', start_ts: null }
        : row
      return {
        date: final.date,
        type: toShiftRhythmType(toStandardShiftType(final.label, final.start_ts)),
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export async function buildShiftRhythmInputs(supabase: any, userId: string) {
  const now = new Date()
  const todayYmd = isoLocalDate(now)
  const startYmd = addCalendarDaysToYmd(todayYmd, -6)
  const sleepFromBoundary = new Date(`${startYmd}T00:00:00`)

  const sleepFetch = fetchRecentSleepRows(supabase, userId, sleepFromBoundary.toISOString())

  const [sleepRows, shiftQuery, hydrationTargets, hydrationIntake, adjustedCalories, holidayDates] =
    await Promise.all([
      sleepFetch,
      supabase
        .from('shifts')
        .select('date,label,start_ts')
        .eq('user_id', userId)
        .gte('date', startYmd)
        .lte('date', todayYmd)
        .order('date', { ascending: true }),
      getHydrationAndCaffeineTargets(supabase, userId),
      getTodayHydrationIntake(supabase, userId),
      calculateAdjustedCalories(supabase, userId),
      fetchHolidayLocalDatesSet(supabase as SupabaseClient, userId, startYmd, todayYmd),
    ])

  const shifts = (shiftQuery.data ?? []) as { date: string; label?: string | null; start_ts?: string | null }[]
  const recentSleepRows = (sleepRows as any[]).filter((row) =>
    rowCountsAsPrimarySleep({ type: row?.type ?? null, naps: row?.naps ?? null }),
  )
  const shiftByDate = new Map(shifts.map((s: any) => [s.date, s.label]))

  let sleepLogsWithContext = recentSleepRows.map((row: any) => {
    const sleepDate = (row.start_at ?? row.start_ts ?? '').slice(0, 10)
    return {
      start:      row.start_at ?? row.start_ts,
      shiftLabel: shiftByDate.get(sleepDate) ?? null,
    }
  })

  let sleepLogs = sleepRows
    .map((row) => mapSleepRowToLog(row))
    .sort(
      (a, b) =>
        (Number.isFinite(b.endMs) ? b.endMs : -1) - (Number.isFinite(a.endMs) ? a.endMs : -1),
    )
    .map(({ endMs: _e, ...rest }) => rest)

  if (!sleepLogs.some((s) => typeof s.durationHours === 'number' && s.durationHours > 0)) {
    const mergedWearable = await fetchMergedPhoneHealthSleepSessionsOverlapping(
      supabase as SupabaseClient,
      userId,
      sleepFromBoundary.toISOString(),
      now.toISOString(),
    )

    if (mergedWearable.length > 0) {
      sleepLogs = mergedWearable
        .map((s) => {
          const start = s.start_at
          const end = s.end_at
          const ms = new Date(end).getTime() - new Date(start).getTime()
          return {
            date: end.slice(0, 10),
            start,
            end,
            durationHours: ms > 0 ? ms / 3600000 : 0,
            quality: null as number | null,
          }
        })
        .filter((s) => s.durationHours > 0)
        .sort((a, b) => +new Date(b.end) - +new Date(a.end))

      sleepLogsWithContext = sleepLogs.map((s) => ({
        start: s.start,
        shiftLabel: shiftByDate.get(s.start.slice(0, 10)) ?? null,
      }))
    }
  }

  const shiftDays = buildShiftDaysForRollingWeek(
    shifts,
    holidayDates,
    startYmd,
    todayYmd,
  )

  const { data: prevScore } = await supabase
    .from('shift_rhythm_scores')
    .select('circadian_debt')
    .eq('user_id', userId)
    .order('score_date', { ascending: false })
    .limit(1)
    .single()

  const previousCircadianDebt = prevScore?.circadian_debt ?? 0

  const consumedCalories = 0
  const mealTimingActual: any[] = []

  const nutritionSnapshot = {
    adjustedCalories: adjustedCalories.adjustedCalories,
    consumedCalories,
    calorieTarget: adjustedCalories.adjustedCalories,
    macros: {
      protein: { target: adjustedCalories.macros.protein_g, consumed: null },
      carbs: { target: adjustedCalories.macros.carbs_g, consumed: null },
      fat: { target: adjustedCalories.macros.fat_g, consumed: null },
      satFat: { limit: adjustedCalories.macros.sat_fat_g, consumed: null },
    },
    hydration: {
      water: {
        targetMl: hydrationTargets.water_ml,
        consumedMl: hydrationIntake.water_ml,
      },
      caffeine: {
        limitMg: hydrationTargets.caffeine_mg,
        consumedMg: hydrationIntake.caffeine_mg,
      },
    },
  }

  const { data: stepGoalRow } = await supabase
    .from('profiles')
    .select('daily_steps_goal, sleep_goal_h')
    .eq('user_id', userId)
    .maybeSingle()

  let activityResponse = await supabase
    .from('activity_logs')
    .select('steps,active_minutes,date')
    .eq('user_id', userId)
    .eq('date', todayYmd)
    .maybeSingle()

  let activeMinutes: number | null = activityResponse.data?.active_minutes ?? null

  if (activityResponse.error) {
    const err = activityResponse.error
    if (err.code === '42703' || err.message?.includes('active_minutes')) {
      console.warn('[/api/shift-rhythm] activity_logs.active_minutes missing, falling back without it')
      activityResponse = await supabase
        .from('activity_logs')
        .select('steps,date')
        .eq('user_id', userId)
        .eq('date', todayYmd)
        .maybeSingle()
      activeMinutes = null
    }
  }

  const activityRow = activityResponse?.data ?? null

  const activitySnapshot = {
    steps: activityRow?.steps ?? null,
    stepsGoal: stepGoalRow?.daily_steps_goal ?? 10000,
    activeMinutes,
    activeMinutesGoal: 30,
  }

  const mealTimingSnapshot = {
    recommended: (adjustedCalories.meals ?? []).map((meal: any) => ({
      slot: meal.label,
      windowStart: meal.suggestedTime,
      windowEnd: meal.suggestedTime,
    })),
    actual: mealTimingActual,
  }

  const shiftContext: ShiftContextResult | null = adjustedCalories.shiftContext ?? null

  return {
    sleepLogs,
    sleepLogsWithContext,
    shiftDays,
    shifts,
    previousCircadianDebt,
    midpointOffsets: [] as number[],
    nutrition: nutritionSnapshot,
    activity: activitySnapshot,
    mealTiming: mealTimingSnapshot,
    targets: {
      sleepHours:
        stepGoalRow?.sleep_goal_h ?? adjustedCalories.sleepHoursLast24h ?? DEFAULT_SLEEP_TARGET,
    },
    shiftContext,
  }
}

