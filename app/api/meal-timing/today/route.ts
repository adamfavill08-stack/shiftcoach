import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'
import { isoLocalDate } from '@/lib/shifts'

export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

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
    const standardType = toShiftType(todayShift?.label, todayShift?.start_ts)
    const shiftType = toActivityShiftType(standardType)

    // Get wake time from latest sleep or estimate
    const { data: latestSleep } = await supabase
      .from('sleep_logs')
      .select('end_ts')
      .eq('user_id', userId)
      .order('end_ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    const wakeTime = latestSleep?.end_ts ? new Date(latestSleep.end_ts) : new Date()
    // If no sleep logged, estimate wake time based on shift
    if (!latestSleep) {
      if (shiftType === 'night') {
        wakeTime.setHours(8, 30, 0, 0) // Typical post-night-shift wake
      } else {
        wakeTime.setHours(7, 0, 0, 0) // Typical morning wake
      }
    }

    // Get meal schedule
    const mealSchedule = getTodayMealSchedule({
      adjustedCalories: adjusted.adjustedCalories,
      shiftType,
      shiftStart: todayShift?.start_ts ? new Date(todayShift.start_ts) : undefined,
      shiftEnd: todayShift?.end_ts ? new Date(todayShift.end_ts) : undefined,
      wakeTime,
    })

    // Get sleep hours last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { data: sleepLogs } = await supabase
      .from('sleep_logs')
      .select('sleep_hours')
      .eq('user_id', userId)
      .gte('start_ts', twentyFourHoursAgo.toISOString())

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
      : 'Off day'

    // Find next meal
    const now = new Date()
    const upcomingMeals = mealSchedule.filter(m => m.time > now).sort((a, b) => a.time.getTime() - b.time.getTime())
    const nextMeal = upcomingMeals[0] || mealSchedule[0]

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

    // Determine status
    let status: 'onTrack' | 'slightlyLate' | 'veryLate' = 'onTrack'
    if (nextMeal) {
      const minutesUntilNext = (nextMeal.time.getTime() - now.getTime()) / (1000 * 60)
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

    // Find next meal with macros
    const nextMealWithMacros = mealsWithMacros.find(m => {
      const mealTime = mealSchedule.find(ms => ms.id === m.id)?.time
      return mealTime && mealTime > now
    }) || mealsWithMacros[0]

    // Build response
    const response = {
      nextMealLabel: nextMeal?.label || 'Next meal',
      nextMealTime: nextMeal?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '—',
      nextMealType: nextMeal?.hint || 'Balanced meal',
      nextMealMacros: nextMealWithMacros?.macros || {
        protein: Math.round(totalMacros.protein_g / mealSchedule.length),
        carbs: Math.round(totalMacros.carbs_g / mealSchedule.length),
        fats: Math.round(totalMacros.fat_g / mealSchedule.length),
      },
      shiftLabel: shiftLabelFormatted,
      shiftType,
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


