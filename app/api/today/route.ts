import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'
import { getTodayHydrationIntake } from '@/lib/nutrition/getTodayHydrationIntake'
import { calculateBingeRisk } from '@/lib/binge/calculateBingeRisk'
import { isoLocalDate } from '@/lib/shifts'
import { toShiftType, toActivityShiftType } from '@/lib/shifts/toShiftType'
import { generateDailyShiftGuidance, type ShiftGuidanceShiftType } from '@/lib/shift-guidance/generateDailyShiftGuidance'
import {
  applyHolidayAsOffToShiftRows,
  fetchHolidayLocalDatesSet,
} from '@/lib/rota/holidayRotaPriority'

function shiftTypeForGuidance(
  shiftLabel: string | null | undefined,
  startTs: string | null | undefined,
  nextShiftLabel: string | null | undefined,
): ShiftGuidanceShiftType {
  const standard = toShiftType(shiftLabel, startTs ?? null)
  if (standard === 'night') return 'night'
  if (standard === 'morning') return 'early'
  if (standard === 'evening') return 'evening'
  if (standard === 'off') {
    const nextStandard = toShiftType(nextShiftLabel, null)
    if (nextStandard === 'night') return 'transition'
    return 'off'
  }
  return 'day'
}

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  try {
    const now = new Date()
    const today = isoLocalDate(now)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const [{ data: mood }, calorieResult, hydrationIntake, { data: profile }, { data: todayShift }, { data: rhythmRow }, { data: recentShifts }, { data: upcomingShift }, { count: breakfastCount }] = await Promise.all([
      supabase
        .from('mood_logs')
        .select('mood,focus,ts')
        .gte('ts', startISO)
        .lt('ts', endISO)
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(1),
      calculateAdjustedCalories(supabase, userId),
      getTodayHydrationIntake(supabase, userId),
      supabase.from('profiles').select('sleep_goal_h,chronotype,shift_times').eq('user_id', userId).maybeSingle(),
      supabase.from('shifts').select('label,start_ts,end_ts').eq('user_id', userId).eq('date', today).maybeSingle(),
      supabase
        .from('shift_rhythm_scores')
        .select('total_score,recovery_score,date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('shifts')
        .select('date,label,start_ts')
        .eq('user_id', userId)
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(7),
      supabase
        .from('shifts')
        .select('date,label,start_ts,end_ts')
        .eq('user_id', userId)
        .gt('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('nutrition_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('meal_type', 'breakfast')
        .gte('logged_at', startISO)
        .lt('logged_at', endISO),
    ])

    // Support both legacy (start_ts/end_ts) and newer (start_at/end_at) sleep schemas.
    let recentSleepRows: any[] = []
    let sleepResult = await supabase
      .from('sleep_logs')
      .select('start_ts,end_ts,sleep_hours,quality')
      .eq('user_id', userId)
      .order('start_ts', { ascending: false })
      .limit(7)

    if (sleepResult.error && (sleepResult.error.code === 'PGRST204' || sleepResult.error.message?.includes('start_ts'))) {
      const fallback = await supabase
        .from('sleep_logs')
        .select('start_at,end_at,sleep_hours,quality')
        .eq('user_id', userId)
        .order('start_at', { ascending: false })
        .limit(7)

      recentSleepRows = (fallback.data ?? []).map((s: any) => ({
        start_ts: s.start_at,
        end_ts: s.end_at,
        sleep_hours: s.sleep_hours,
        quality: s.quality,
      }))
    } else {
      recentSleepRows = sleepResult.data ?? []
    }

    const pastWeek = new Date(now)
    pastWeek.setDate(pastWeek.getDate() - 7)
    const holidayFrom = isoLocalDate(pastWeek)
    const holidayDates = await fetchHolidayLocalDatesSet(supabase, userId, holidayFrom, today)

    const effectiveTodayShift = holidayDates.has(today)
      ? { ...(todayShift ?? {}), label: 'OFF', start_ts: null, end_ts: null }
      : todayShift
    const effectiveRecentShifts = applyHolidayAsOffToShiftRows(
      (recentShifts ?? []) as { date: string; label?: string | null; start_ts?: string | null }[],
      holidayDates,
    )

    const standardShift = toShiftType(effectiveTodayShift?.label, effectiveTodayShift?.start_ts)
    let shiftTypeForMeals: 'day' | 'night' | 'late' | 'off' = toActivityShiftType(standardShift)
    if (standardShift === 'evening') {
      shiftTypeForMeals = 'late'
    }
    const wakeTime = new Date()

    const { slots: mealSlots } = getTodayMealSchedule({
      adjustedCalories: calorieResult.adjustedCalories,
      shiftType: shiftTypeForMeals,
      shiftStart: effectiveTodayShift?.start_ts ? new Date(effectiveTodayShift.start_ts) : undefined,
      shiftEnd: effectiveTodayShift?.end_ts ? new Date(effectiveTodayShift.end_ts) : undefined,
      wakeTime,
    })

    const plan = mealSlots.map((meal) => ({
      time: meal.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      icon: '🍽️',
      label: meal.label,
    }))

    const bingeInputs = {
      sleepLogs: (recentSleepRows ?? []).map((s: any) => ({
        date: String(s.start_ts || '').slice(0, 10),
        start: s.start_ts,
        end: s.end_ts,
        durationHours: s.sleep_hours ?? 0,
        quality: typeof s.quality === 'number' ? s.quality : null,
      })),
      shifts: effectiveRecentShifts.map((s: any) => ({
        date: s.date,
        type: toActivityShiftType(toShiftType(s.label, s.start_ts)) === 'late' ? 'afternoon' : (toActivityShiftType(toShiftType(s.label, s.start_ts)) as 'night' | 'day' | 'off' | 'morning' | 'afternoon'),
      })),
      meals: [] as Array<{ logged_at: string; calories: number }>,
      now,
      sleepDebtHours: calorieResult.sleepHoursLast24h != null ? Math.max(0, 7.5 - calorieResult.sleepHoursLast24h) : undefined,
      shiftLagScore: typeof rhythmRow?.total_score === 'number' ? Math.max(0, 100 - rhythmRow.total_score) : undefined,
      activityLevel: calorieResult.activityLevel as 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null,
    }
    const bingeRiskResult = calculateBingeRisk(bingeInputs)

    const shiftStart = effectiveTodayShift?.start_ts
      ? new Date(effectiveTodayShift.start_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null
    const shiftEnd = effectiveTodayShift?.end_ts
      ? new Date(effectiveTodayShift.end_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null

    const lastSleepEndIso = recentSleepRows?.[0]?.end_ts ?? null
    const lastSleepStartIso = recentSleepRows?.[0]?.start_ts ?? null
    const lastSleepEnd = lastSleepEndIso ? new Date(lastSleepEndIso) : null
    const lastSleepStart = lastSleepStartIso ? new Date(lastSleepStartIso) : null
    const previousSleepDurationHours =
      lastSleepStart && lastSleepEnd && !Number.isNaN(lastSleepStart.getTime()) && !Number.isNaN(lastSleepEnd.getTime())
        ? Math.max(0, (lastSleepEnd.getTime() - lastSleepStart.getTime()) / (1000 * 60 * 60))
        : null

    const nextShiftStart = upcomingShift?.start_ts ? new Date(upcomingShift.start_ts) : null
    const nextShiftEnd = upcomingShift?.end_ts ? new Date(upcomingShift.end_ts) : null
    const guidanceShiftType = shiftTypeForGuidance(
      effectiveTodayShift?.label,
      effectiveTodayShift?.start_ts,
      upcomingShift?.label,
    )

    // Estimate next planned sleep:
    // - If a night shift is upcoming, plan sleep after shift end (or next morning fallback).
    // - Otherwise, use tonight default window.
    let nextPlannedSleepStart: Date | null = null
    if (guidanceShiftType === 'night' || guidanceShiftType === 'transition') {
      if (nextShiftEnd && !Number.isNaN(nextShiftEnd.getTime())) {
        nextPlannedSleepStart = new Date(nextShiftEnd.getTime() + 30 * 60 * 1000)
      } else {
        nextPlannedSleepStart = new Date(now)
        nextPlannedSleepStart.setDate(nextPlannedSleepStart.getDate() + 1)
        nextPlannedSleepStart.setHours(7, 0, 0, 0)
      }
    } else {
      nextPlannedSleepStart = new Date(now)
      nextPlannedSleepStart.setHours(22, 30, 0, 0)
      if (nextPlannedSleepStart.getTime() <= now.getTime()) {
        nextPlannedSleepStart.setDate(nextPlannedSleepStart.getDate() + 1)
      }
    }

    const dailyGuidance = generateDailyShiftGuidance({
      now,
      lastSleepEnd,
      nextPlannedSleepStart,
      nextShiftStart,
      nextShiftEnd,
      shiftType: guidanceShiftType,
      sleepDurationHours: previousSleepDurationHours,
      sleepDebtHours: Math.max(0, (profile?.sleep_goal_h ?? 7.5) - (calorieResult.sleepHoursLast24h ?? 0)),
      mealsLogged: {
        breakfast: (breakfastCount ?? 0) > 0,
      },
      caffeineLogged: hydrationIntake.caffeine_mg ?? 0,
      userPreferences: {
        chronotype: (profile as any)?.chronotype ?? null,
      },
    })

    return Response.json({
      shift: {
        label: effectiveTodayShift?.label ?? 'OFF',
        start: shiftStart,
        end: shiftEnd,
        sleep_goal_h: profile?.sleep_goal_h ?? 7.5,
      },
      adjusted_kcal: calorieResult.adjustedCalories,
      sleep_hours: calorieResult.sleepHoursLast24h ?? 0,
      recovery_score: rhythmRow?.recovery_score ?? null,
      binge_risk: bingeRiskResult.level.charAt(0).toUpperCase() + bingeRiskResult.level.slice(1),
      rhythm_score: rhythmRow?.total_score ?? calorieResult.rhythmScore ?? null,
      macros: {
        protein_g: calorieResult.macros.protein_g,
        carbs_g: calorieResult.macros.carbs_g,
        fats_g: calorieResult.macros.fat_g,
      },
      water_ml: hydrationIntake.water_ml,
      caffeine_mg: hydrationIntake.caffeine_mg,
      mood: mood?.[0]?.mood ?? 3,
      focus: mood?.[0]?.focus ?? 3,
      plan,
      daily_guidance: {
        ...dailyGuidance,
        metadata: {
          now: now.toISOString(),
          lastSleepEnd: lastSleepEnd?.toISOString() ?? null,
          nextPlannedSleepStart: nextPlannedSleepStart?.toISOString() ?? null,
          nextShiftStart: nextShiftStart?.toISOString() ?? null,
          nextShiftEnd: nextShiftEnd?.toISOString() ?? null,
          shiftType: guidanceShiftType,
        },
      },
      data_quality: {
        mode: 'mixed_logged_and_modeled',
        note: 'Mood/hydration/shift data are logged; some coaching outputs are model-derived from available recent data.',
      },
    })
  } catch (err: any) {
    console.error('[/api/today] error:', err)
    return Response.json({ error: err?.message || 'Failed to build today summary' }, { status: 500 })
  }
}

