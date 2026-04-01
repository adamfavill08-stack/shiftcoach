import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMealSchedule, type MealSlot } from '@/lib/nutrition/getTodayMealSchedule'
import {
  resolveDefaultWakeNoSleep,
  resolveDiurnalWakeAnchor,
} from '@/lib/nutrition/resolveDiurnalWakeAnchor'
import { isoLocalDate } from '@/lib/shifts'
import type { StandardShiftType } from '@/lib/shifts/toShiftType'

const DAY_MS = 24 * 60 * 60 * 1000

function mealTimingCardSubtitle(
  templateUsed: 'off' | 'day' | 'night' | 'late',
  requestedShift: 'off' | 'day' | 'night' | 'late',
  usedEstimatedShiftTimes: boolean,
): string {
  if (templateUsed === 'off' && requestedShift !== 'off') {
    const est = usedEstimatedShiftTimes ? ' Typical shift hours estimated where needed.' : ''
    return `Add start and end times to your rota for a tailored plan — using a simple daytime pattern today.${est}`
  }
  const base: Record<'off' | 'day' | 'night' | 'late', string> = {
    off: 'Keep meals steady on your day off.',
    day: 'Keep meals in rhythm with your day shift.',
    late: 'Keep meals in rhythm with your late shift.',
    night: 'Aligned to your night shift',
  }
  const s = base[templateUsed]
  return usedEstimatedShiftTimes ? `${s} Shift times estimated from a typical pattern.` : s
}

/**
 * Next wall-clock occurrence for daily meal slots (rolls to tomorrow when today's time has passed).
 */
function pickNextMealOccurrence(mealSchedule: MealSlot[], now: Date): { slot: MealSlot; at: Date } | null {
  if (!mealSchedule.length) return null
  let best: { slot: MealSlot; at: Date } | null = null
  for (const m of mealSchedule) {
    let atMs = m.time.getTime()
    if (atMs <= now.getTime()) {
      atMs += DAY_MS
    }
    const at = new Date(atMs)
    if (!best || at.getTime() < best.at.getTime()) {
      best = { slot: m, at }
    }
  }
  return best
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Get adjusted calories and meal plan
    const adjusted = await calculateAdjustedCalories(supabase, userId)

    // Get today's shift
    const today = isoLocalDate(new Date())
    const { data: todayShift } = await supabase
      .from('shifts')
      .select('label, start_ts, end_ts')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    // Determine shift type using shared utility
    const { toShiftType, toActivityShiftType } = await import('@/lib/shifts/toShiftType')
    const standardType: StandardShiftType = toShiftType(todayShift?.label, todayShift?.start_ts)
    /** Meal-planning shift kind: evening (from rota) maps to late template for this route only. */
    let shiftType: 'day' | 'night' | 'late' | 'off' = toActivityShiftType(standardType)
    if (standardType === 'evening') {
      shiftType = 'late'
    }

    // Get wake time from latest sleep or estimate
    let latestSleepResult = await supabase
      .from('sleep_logs')
      .select('end_ts')
      .eq('user_id', userId)
      .order('end_ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestSleepResult.error && (latestSleepResult.error.code === 'PGRST204' || latestSleepResult.error.message?.includes('end_ts'))) {
      const fallback = await supabase
        .from('sleep_logs')
        .select('end_at')
        .eq('user_id', userId)
        .order('end_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      latestSleepResult = {
        data: fallback.data ? { end_ts: fallback.data.end_at } : null,
        error: fallback.error,
      } as any
    }
    const latestSleep = latestSleepResult.data

    const now = new Date()
    const hasExactShiftTimes = Boolean(todayShift?.start_ts && todayShift?.end_ts)
    let shiftStart: Date | undefined = todayShift?.start_ts ? new Date(todayShift.start_ts) : undefined
    let shiftEnd: Date | undefined = todayShift?.end_ts ? new Date(todayShift.end_ts) : undefined
    let usedEstimatedShiftTimes = false

    if (!hasExactShiftTimes && shiftType === 'night') {
      usedEstimatedShiftTimes = true
      const base = new Date(now)
      shiftStart = new Date(base)
      shiftStart.setHours(22, 0, 0, 0)
      shiftEnd = new Date(base)
      shiftEnd.setDate(shiftEnd.getDate() + 1)
      shiftEnd.setHours(7, 0, 0, 0)
    } else if (!hasExactShiftTimes && shiftType === 'late') {
      usedEstimatedShiftTimes = true
      const base = new Date(now)
      shiftStart = new Date(base)
      shiftStart.setHours(15, 0, 0, 0)
      shiftEnd = new Date(base)
      shiftEnd.setHours(23, 0, 0, 0)
    }

    const rawWakeEnd = latestSleep?.end_ts ? new Date(latestSleep.end_ts as string) : null
    const usesNightBoundsForMeals =
      shiftType === 'night' && shiftStart != null && shiftEnd != null && !Number.isNaN(shiftStart.getTime()) && !Number.isNaN(shiftEnd.getTime())

    let wakeTime: Date
    if (usesNightBoundsForMeals) {
      wakeTime = resolveDefaultWakeNoSleep(now, 'night')
    } else if (rawWakeEnd && !Number.isNaN(rawWakeEnd.getTime())) {
      wakeTime = resolveDiurnalWakeAnchor(rawWakeEnd, now)
    } else {
      wakeTime = resolveDefaultWakeNoSleep(now, shiftType)
    }

    const { slots: mealSchedule, templateUsed: scheduleTypeUsed } = getTodayMealSchedule({
      adjustedCalories: adjusted.adjustedCalories,
      shiftType,
      shiftStart,
      shiftEnd,
      wakeTime,
    })

    const usedFallbackTemplate = usedEstimatedShiftTimes || scheduleTypeUsed !== shiftType
    const cardSubtitle = mealTimingCardSubtitle(scheduleTypeUsed, shiftType, usedEstimatedShiftTimes)

    // Get sleep hours last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let sleepLogsResult = await supabase
      .from('sleep_logs')
      .select('sleep_hours')
      .eq('user_id', userId)
      .gte('start_ts', twentyFourHoursAgo.toISOString())

    if (sleepLogsResult.error && (sleepLogsResult.error.code === 'PGRST204' || sleepLogsResult.error.message?.includes('start_ts'))) {
      sleepLogsResult = await supabase
        .from('sleep_logs')
        .select('sleep_hours')
        .eq('user_id', userId)
        .gte('start_at', twentyFourHoursAgo.toISOString())
    }
    const sleepLogs = sleepLogsResult.data

    const sleepHoursLast24h = sleepLogs?.reduce((sum, s) => sum + (s.sleep_hours ?? 0), 0) ?? 0
    const sleepContext = `${Math.round(sleepHoursLast24h * 10) / 10}h sleep in last 24h`

    // Get steps (from activity_logs or daily_metrics)
    const { data: activityLog } = await supabase
      .from('activity_logs')
      .select('steps')
      .eq('user_id', userId)
      .gte('ts', new Date(today + 'T00:00:00').toISOString())
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    const steps = activityLog?.steps ?? 0
    const activityContext = `${steps.toLocaleString()} steps so far today`

    // Format shift label for display
    const shiftStartTime = todayShift?.start_ts
      ? new Date(todayShift.start_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
    const shiftEndTime = todayShift?.end_ts
      ? new Date(todayShift.end_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''

    const rawShiftLabel = todayShift?.label ?? (shiftType ? String(shiftType) : null)
    const shiftLabel =
      rawShiftLabel
        ? rawShiftLabel.charAt(0).toUpperCase() + rawShiftLabel.slice(1).toLowerCase()
        : 'Off'

    const shiftLabelFormatted = todayShift
      ? `${shiftLabel} shift${shiftStartTime && shiftEndTime ? ` · ${shiftStartTime}–${shiftEndTime}` : ''}`
      : 'Day Off'

    const nextPick = pickNextMealOccurrence(mealSchedule, now)
    const nextMealSlot = nextPick?.slot ?? null
    const nextMealAt = nextPick?.at ?? null

    // Build recommended windows
    const recommendedWindows = mealSchedule.map((meal, index) => ({
      id: meal.id,
      label: meal.label,
      timeRange: meal.windowLabel,
      focus: meal.hint,
    }))

    // Build meals array (for visualization)
    const meals = mealSchedule.map((meal, index) => {
      const mealTime = meal.time
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      
      // Position on 24h timeline (0-1)
      const position = ((mealTime.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) % 1
      
      // Check if meal is in its recommended window (simplified - always true for recommended meals)
      const inWindow = true

      return {
        id: meal.id,
        label: meal.label,
        time: mealTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        position: Math.max(0, Math.min(1, position)),
        inWindow,
      }
    })

    // Determine status (minutes until next occurrence, including rolled-forward slots)
    let status: 'onTrack' | 'slightlyLate' | 'veryLate' = 'onTrack'
    if (nextMealAt) {
      const minutesUntilNext = (nextMealAt.getTime() - now.getTime()) / (1000 * 60)
      if (minutesUntilNext < -60) status = 'veryLate'
      else if (minutesUntilNext < -15) status = 'slightlyLate'
    }

    // Calculate macros for each meal (proportional to calories)
    const totalMacros = adjusted.macros
    const totalCalories = adjusted.adjustedCalories
    const mealsWithMacros = mealSchedule.map((meal) => {
      // Calculate macros proportionally based on meal calories
      const mealCalorieRatio = meal.caloriesTarget / totalCalories
      return {
        id: meal.id,
        label: meal.label,
        time: meal.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        windowLabel: meal.windowLabel,
        calories: meal.caloriesTarget,
        hint: meal.hint,
        macros: {
          protein: Math.round(totalMacros.protein_g * mealCalorieRatio),
          carbs: Math.round(totalMacros.carbs_g * mealCalorieRatio),
          fats: Math.round(totalMacros.fat_g * mealCalorieRatio),
        },
      }
    })

    const nextMealWithMacros =
      nextMealSlot != null
        ? mealsWithMacros.find((m) => m.id === nextMealSlot.id) ?? mealsWithMacros[0]
        : mealsWithMacros[0]

    const nextMealTimeStr = nextMealAt
      ? nextMealAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—'

    // Build response
    const response = {
      nextMealLabel: nextMealSlot?.label || 'Next meal',
      nextMealTime: nextMealTimeStr,
      nextMealAt: nextMealAt ? nextMealAt.toISOString() : null,
      nextMealType: nextMealSlot?.hint || 'Balanced meal',
      nextMealMacros: nextMealWithMacros?.macros || {
        protein: Math.round(totalMacros.protein_g / mealSchedule.length),
        carbs: Math.round(totalMacros.carbs_g / mealSchedule.length),
        fats: Math.round(totalMacros.fat_g / mealSchedule.length),
      },
      shiftLabel: shiftLabelFormatted,
      shiftType,
      scheduleTypeUsed,
      hasExactShiftTimes,
      usedFallbackTemplate,
      usedEstimatedShiftTimes,
      cardSubtitle,
      totalCalories: adjusted.adjustedCalories,
      totalMacros,
      meals: mealsWithMacros,
      lastMeal: {
        time: '—',
        description: 'No meals logged yet',
      },
      sleepContext,
      activityContext,
      coach: {
        recommendedWindows,
        meals,
        tips: [],
        status,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err: any) {
    console.error('[/api/meal-timing/today] error:', err)
    return NextResponse.json(
      {
        error: err?.message || 'Failed to fetch meal timing',
      },
      { status: 500 },
    )
  }
}


