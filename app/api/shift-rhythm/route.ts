import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { calculateShiftRhythm } from '@/lib/shift-rhythm/engine'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMacroIntake } from '@/lib/nutrition/getTodayMacroIntake'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'
import { getTodayHydrationIntake } from '@/lib/nutrition/getTodayHydrationIntake'

type SupabaseClient = Awaited<ReturnType<typeof getServerSupabaseAndUserId>>['supabase']

function toShiftType(label?: string | null): 'night' | 'day' | 'off' | 'morning' | 'afternoon' {
  if (!label) return 'off'
  const normalised = label.toLowerCase()
  if (normalised.includes('night')) return 'night'
  if (normalised.includes('morning')) return 'morning'
  if (normalised.includes('afternoon') || normalised.includes('late')) return 'afternoon'
  if (normalised.includes('day')) return 'day'
  return 'off'
}

async function buildShiftRhythmInputs(supabase: SupabaseClient, userId: string) {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
  const todayIso = today.toISOString().slice(0, 10)

  const [
    sleepQuery,
    shiftQuery,
    macroTargets,
    hydrationTargets,
    hydrationIntake,
    adjustedCalories,
  ] =
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
      getTodayMacroIntake(userId, supabase),
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
      type: toShiftType(row.label),
    })) ?? []

  const sevenDaysAgoStart = new Date(sevenDaysAgo)
  sevenDaysAgoStart.setHours(0, 0, 0, 0)

  let mealQuery: any = await supabase
    .from('meal_logs')
    .select('calories,slot_label,logged_at')
    .eq('user_id', userId)
    .gte('logged_at', sevenDaysAgoStart.toISOString())

  if (mealQuery.error) {
    const err = mealQuery.error
    if (err.code === '42703' || err.message?.includes('logged_at')) {
      console.warn('[/api/shift-rhythm] meal_logs.logged_at missing, falling back to created_at')
      mealQuery = await supabase
        .from('meal_logs')
        .select('calories,slot_label,created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoStart.toISOString())
    }
  }

  const mealRows = mealQuery.data ?? []

  const getMealDate = (row: any) => {
    const raw = row.logged_at ?? row.created_at ?? row.date ?? null
    if (!raw) return null
    return new Date(raw).toISOString().slice(0, 10)
  }

  const consumedCalories = mealRows
    .filter((row: any) => getMealDate(row) === todayIso)
    .reduce((sum: number, row: any) => sum + (row.calories ?? 0), 0)

  const mealTimingActual = mealRows
    .filter((row: any) => getMealDate(row) === todayIso)
    .map((row: any) => ({
      slot: row.slot_label ?? 'meal',
      timestamp: row.logged_at ?? row.created_at ?? `${todayIso}T12:00:00Z`,
    }))

  const nutritionSnapshot = {
    adjustedCalories: adjustedCalories.adjustedCalories,
    consumedCalories,
    calorieTarget: adjustedCalories.adjustedCalories,
    macros: {
      protein: { target: adjustedCalories.macros.protein_g, consumed: macroTargets.protein ?? null },
      carbs: { target: adjustedCalories.macros.carbs_g, consumed: macroTargets.carbs ?? null },
      fat: { target: adjustedCalories.macros.fat_g, consumed: macroTargets.fat ?? null },
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
    recommended: (adjustedCalories.meals ?? []).map((meal) => ({
      slot: meal.label,
      windowStart: meal.suggestedTime,
      windowEnd: meal.suggestedTime,
    })),
    actual: mealTimingActual,
  }

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
  }
}

const DEFAULT_SLEEP_TARGET = 7.5

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    
    // Check for force recalculation parameter
    const searchParams = req.nextUrl.searchParams
    const forceRecalculate = searchParams.get('force') === 'true'

    // Try to get today's score and yesterday's score for comparison
    const [{ data: existing, error: fetchErr }, { data: yesterdayScore }] = await Promise.all([
      supabase
        .from('shift_rhythm_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('shift_rhythm_scores')
        .select('total_score')
        .eq('user_id', userId)
        .eq('date', yesterday)
        .maybeSingle(),
    ])

    if (fetchErr) {
      console.error('[/api/shift-rhythm] fetch error:', fetchErr)
      
      // If table doesn't exist, return null instead of error
      if (fetchErr.message?.includes('relation') || fetchErr.message?.includes('does not exist')) {
        console.warn('[/api/shift-rhythm] Table does not exist yet:', fetchErr.message)
        return NextResponse.json({ score: null }, { status: 200 })
      }
    }

    let score = existing && !forceRecalculate
      ? {
          date: existing.date,
          sleep_score: existing.sleep_score ?? 0,
          regularity_score: existing.regularity_score ?? 0,
          shift_pattern_score: existing.shift_pattern_score ?? 0,
          recovery_score: existing.recovery_score ?? 0,
          nutrition_score: existing.nutrition_score ?? null,
          activity_score: existing.activity_score ?? null,
          meal_timing_score: existing.meal_timing_score ?? null,
          total_score: existing.total_score ?? 0,
        }
      : null

    // If no score or force recalculation, calculate and store it
    if (!score || forceRecalculate) {
      console.log('[/api/shift-rhythm] No score for today, calculating…')

      try {
        const inputs = await buildShiftRhythmInputs(supabase, userId)
        const result = calculateShiftRhythm(inputs)

        const upsertPayload = {
          user_id: userId,
          date: today,
          sleep_score: result.sleep_score,
          regularity_score: result.regularity_score,
          shift_pattern_score: result.shift_pattern_score,
          recovery_score: result.recovery_score,
          total_score: result.total_score,
        }

        const { data: inserted, error: upsertErr } = await supabase
          .from('shift_rhythm_scores')
          .upsert(upsertPayload, { onConflict: 'user_id,date' })
          .select()
          .maybeSingle()

        if (upsertErr) {
          console.error('[/api/shift-rhythm] upsert error:', upsertErr)
          
          // If table doesn't exist, return null
          if (upsertErr.message?.includes('relation') || upsertErr.message?.includes('does not exist')) {
            console.warn('[/api/shift-rhythm] Table does not exist yet:', upsertErr.message)
            return NextResponse.json({ score: null }, { status: 200 })
          }
          
          return NextResponse.json(
            { error: 'Failed to save shift rhythm score', details: upsertErr.message },
            { status: 500 }
          )
        }

        score = {
          date: inserted?.date ?? today,
          sleep_score: result.sleep_score,
          regularity_score: result.regularity_score,
          shift_pattern_score: result.shift_pattern_score,
          recovery_score: result.recovery_score,
          nutrition_score: result.nutrition_score,
          activity_score: result.activity_score,
          meal_timing_score: result.meal_timing_score,
          total_score: result.total_score,
        }
      } catch (calcErr: any) {
        console.error('[/api/shift-rhythm] Calculation error:', calcErr)
        // Return null if calculation fails, don't crash
        return NextResponse.json({ score: null }, { status: 200 })
      }
    }

    // Include yesterday's score for comparison
    const response: any = { score }
    if (yesterdayScore?.total_score !== undefined) {
      response.yesterdayScore = yesterdayScore.total_score
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err: any) {
    console.error('[/api/shift-rhythm] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  try {
    const inputs = await buildShiftRhythmInputs(supabase, userId)
    const resultScores = calculateShiftRhythm(inputs)

    const upsertPayload = {
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      sleep_score: resultScores.sleep_score,
      regularity_score: resultScores.regularity_score,
      shift_pattern_score: resultScores.shift_pattern_score,
      recovery_score: resultScores.recovery_score,
      total_score: resultScores.total_score,
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from('shift_rhythm_scores')
      .upsert(upsertPayload, { onConflict: 'user_id,date' })
      .select()
      .maybeSingle()

    if (upsertErr) {
      console.error('[/api/shift-rhythm:POST] upsert error:', upsertErr)
      
      // If table doesn't exist, return helpful error
      if (upsertErr.message?.includes('relation') || upsertErr.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Table not found',
            message: 'Please run the SQL migration: supabase-shift-rhythm-scores.sql',
            details: upsertErr.message,
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to save shift rhythm score', details: upsertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        score: {
          date: upserted?.date ?? new Date().toISOString().slice(0, 10),
          ...resultScores,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[/api/shift-rhythm:POST] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

