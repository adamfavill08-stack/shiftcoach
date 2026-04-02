import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import type { ShiftContextResult } from '@/lib/shift-context/types'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'
import { getTodayHydrationIntake } from '@/lib/nutrition/getTodayHydrationIntake'
import { toShiftType as toStandardShiftType, toShiftRhythmType } from '@/lib/shifts/toShiftType'

const DEFAULT_SLEEP_TARGET = 7.5

export async function buildShiftRhythmInputs(supabase: any, userId: string) {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
  const todayIso = today.toISOString().slice(0, 10)

  const [sleepQuery, shiftQuery, hydrationTargets, hydrationIntake, adjustedCalories] =
    await Promise.all([
      supabase
        .from('sleep_logs')
        .select('start_ts,end_ts,sleep_hours,quality')
        .eq('user_id', userId)
        .gte('start_ts', sevenDaysAgo.toISOString())
        .order('start_ts', { ascending: false }),
      supabase
        .from('shifts')
        .select('date,label')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo.toISOString().slice(0, 10))
        .lte('date', todayIso),
      getHydrationAndCaffeineTargets(supabase, userId),
      getTodayHydrationIntake(supabase, userId),
      calculateAdjustedCalories(supabase, userId),
    ])

  const sleepLogs =
    (sleepQuery.data ?? []).map((row: any) => {
      const start = row.start_ts ?? row.start ?? row.created_at
      const end = row.end_ts ?? row.end ?? start
      const durationHours =
        row.sleep_hours ??
        Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3600000)
      return {
        date: (start ?? new Date().toISOString()).slice(0, 10),
        start,
        end,
        durationHours,
        quality: row.quality ?? null,
      }
    }) ?? []

  const shiftDays =
    (shiftQuery.data ?? []).map((row: any) => ({
      date: row.date,
      type: toShiftRhythmType(toStandardShiftType(row.label, row.start_ts)),
    })) ?? []

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
    .eq('date', todayIso)
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
        .eq('date', todayIso)
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
    shiftDays,
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

