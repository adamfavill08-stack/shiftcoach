import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMealSchedule, type MealSlot } from '@/lib/nutrition/getTodayMealSchedule'
import {
  expectedSleepHoursFromProfileAndLogs,
  isMorningNightShiftEndLocal,
  pickLoggedWakeAfterMorningShiftEnd,
} from '@/lib/nutrition/nightShiftMorningEndMeals'
import {
  resolveDefaultWakeNoSleep,
  resolveDiurnalWakeAnchor,
} from '@/lib/nutrition/resolveDiurnalWakeAnchor'
import { isoLocalDate } from '@/lib/shifts'
import {
  fetchShiftContext,
  mealGuidanceFromContext,
  shiftBoundsFromSnapshot,
} from '@/lib/shift-context'
import {
  generateDailyShiftGuidance,
  type ShiftGuidanceShiftType,
} from '@/lib/shift-guidance/generateDailyShiftGuidance'
import type { GuidanceMode, TransitionState } from '@/lib/shift-context/types'

const DAY_MS = 24 * 60 * 60 * 1000

function formatTime24(value: Date): string {
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function toGuidanceShiftType(
  shiftType: 'day' | 'night' | 'late' | 'off',
  guidanceMode?: GuidanceMode,
): ShiftGuidanceShiftType {
  if (guidanceMode === 'transition_day_to_night') return 'transition'
  if (shiftType === 'night') return 'night'
  if (shiftType === 'late') return 'evening'
  if (shiftType === 'off') return 'off'
  return 'day'
}

function mealTimingCardSubtitle(
  templateUsed: 'off' | 'day' | 'night' | 'late',
  requestedShift: 'off' | 'day' | 'night' | 'late',
  usedEstimatedShiftTimes: boolean,
  guidanceMode?: GuidanceMode,
  transitionState?: TransitionState,
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
  let s = base[templateUsed]
  if (
    guidanceMode === 'transition_day_to_night' ||
    transitionState === 'day_to_night'
  ) {
    s = `${s} Transition day: fueling pattern follows your upcoming night shift, not yesterday’s day shift.`
  } else if (
    guidanceMode === 'transition_night_to_day' ||
    transitionState === 'night_to_day'
  ) {
    s = `${s} Transition day: rhythm is shifting back toward days — keep meals lighter late if you’re still on nights’ timing.`
  } else if (guidanceMode === 'pre_night_shift' && templateUsed === 'night') {
    s = `${s} Pre-night focus: anchor a solid pre-shift meal before you head in.`
  }
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
    const now = new Date()
    const today = isoLocalDate(now)

    const shiftCtx = adjusted.shiftContext ?? (await fetchShiftContext(supabase, userId, now))
    const mealGuide = mealGuidanceFromContext(shiftCtx)
    const bounds0 = shiftBoundsFromSnapshot(mealGuide.anchorShift)

    let shiftType: 'day' | 'night' | 'late' | 'off' = mealGuide.template
    let shiftStart: Date | undefined = bounds0?.start
    let shiftEnd: Date | undefined = bounds0?.end
    let usedEstimatedShiftTimes = mealGuide.anchorShift?.usedEstimatedTimes ?? false

    const hasExactShiftTimes = Boolean(
      mealGuide.anchorShift &&
        mealGuide.anchorShift.startTs &&
        mealGuide.anchorShift.endTs &&
        !mealGuide.anchorShift.usedEstimatedTimes,
    )

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

    if ((!shiftStart || !shiftEnd || Number.isNaN(shiftStart.getTime())) && shiftType === 'night') {
      usedEstimatedShiftTimes = true
      const base = new Date(now)
      shiftStart = new Date(base)
      shiftStart.setHours(22, 0, 0, 0)
      shiftEnd = new Date(base)
      shiftEnd.setDate(shiftEnd.getDate() + 1)
      shiftEnd.setHours(7, 0, 0, 0)
    } else if ((!shiftStart || !shiftEnd || Number.isNaN(shiftStart.getTime())) && shiftType === 'late') {
      usedEstimatedShiftTimes = true
      const base = new Date(now)
      shiftStart = new Date(base)
      shiftStart.setHours(15, 0, 0, 0)
      shiftEnd = new Date(base)
      shiftEnd.setHours(23, 0, 0, 0)
    } else if ((!shiftStart || !shiftEnd || Number.isNaN(shiftStart.getTime())) && shiftType === 'day') {
      usedEstimatedShiftTimes = true
      const base = new Date(now)
      shiftStart = new Date(base)
      shiftStart.setHours(9, 0, 0, 0)
      shiftEnd = new Date(base)
      shiftEnd.setHours(17, 0, 0, 0)
    }

    const rawWakeEnd = latestSleep?.end_ts ? new Date(latestSleep.end_ts as string) : null
    const usesNightBoundsForMeals =
      shiftType === 'night' && shiftStart != null && shiftEnd != null && !Number.isNaN(shiftStart.getTime()) && !Number.isNaN(shiftEnd.getTime())

    const [{ data: profileForSleepH }, avgSleepRowsResult, { data: activePattern }, { data: upcomingShift }, { count: breakfastCount }] = await Promise.all([
      supabase.from('profiles').select('sleep_goal_h,shift_times').eq('user_id', userId).maybeSingle(),
      supabase
        .from('sleep_logs')
        .select('sleep_hours, duration_min')
        .eq('user_id', userId)
        .order('end_ts', { ascending: false })
        .limit(14),
      supabase
        .from('user_shift_patterns')
        .select('color_config')
        .eq('user_id', userId)
        .maybeSingle(),
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
        .gte('logged_at', new Date(today + 'T00:00:00').toISOString())
        .lt('logged_at', new Date(today + 'T23:59:59.999').toISOString()),
    ])

    type SleepAvgRow = { sleep_hours: number | null; duration_min: number | null }
    let recentSleepAvgRows: SleepAvgRow[] = []
    if (!avgSleepRowsResult.error) {
      recentSleepAvgRows = (avgSleepRowsResult.data ?? []) as SleepAvgRow[]
    } else if (
      avgSleepRowsResult.error.code === 'PGRST204' ||
      avgSleepRowsResult.error.message?.includes('end_ts')
    ) {
      const fb = await supabase
        .from('sleep_logs')
        .select('sleep_hours, duration_min')
        .eq('user_id', userId)
        .order('end_at', { ascending: false })
        .limit(14)
      recentSleepAvgRows = (fb.data ?? []) as SleepAvgRow[]
    }

    const recentHoursForAvg = (recentSleepAvgRows ?? [])
      .map((r) => {
        if (r.sleep_hours != null && Number.isFinite(r.sleep_hours)) return r.sleep_hours
        if (r.duration_min != null && Number.isFinite(r.duration_min)) return r.duration_min / 60
        return null
      })
      .filter((h): h is number => h != null && h > 0)

    const expectedSleepHours = expectedSleepHoursFromProfileAndLogs(
      profileForSleepH?.sleep_goal_h,
      recentHoursForAvg,
    )

    const loggedWakeForMeals =
      shiftType === 'night' &&
      shiftEnd != null &&
      !Number.isNaN(shiftEnd.getTime()) &&
      isMorningNightShiftEndLocal(shiftEnd)
        ? pickLoggedWakeAfterMorningShiftEnd(shiftEnd, rawWakeEnd)
        : null

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
      expectedSleepHours,
      loggedWakeAfterShift: loggedWakeForMeals,
    })

    const usedFallbackTemplate = usedEstimatedShiftTimes || scheduleTypeUsed !== shiftType
    const baseCardSubtitle = mealTimingCardSubtitle(
      scheduleTypeUsed,
      shiftType,
      usedEstimatedShiftTimes,
      mealGuide.guidanceMode,
      mealGuide.transitionState,
    )

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

    // Format shift label for display.
    // Prefer explicit shift-time settings from rota setup/profile. If unavailable, fall back to
    // exact shift bounds from the resolved anchor (never estimated defaults).
    const anchor = mealGuide.anchorShift
    const shiftTimesFromProfile = (profileForSleepH as any)?.shift_times as
      | Record<string, { start?: string; end?: string } | undefined>
      | undefined
    const shiftTimeKey =
      shiftType === 'late' ? 'afternoon' : shiftType === 'day' || shiftType === 'night' ? shiftType : null
    const configuredShiftTime =
      shiftTimeKey && shiftTimesFromProfile ? shiftTimesFromProfile[shiftTimeKey] : undefined
    const hasConfiguredShiftTime = Boolean(configuredShiftTime?.start && configuredShiftTime?.end)

    const showRotaTimes = hasConfiguredShiftTime || (hasExactShiftTimes && !usedEstimatedShiftTimes)
    const shiftStartTime =
      hasConfiguredShiftTime
        ? String(configuredShiftTime!.start)
        : showRotaTimes && shiftStart && !Number.isNaN(shiftStart.getTime())
          ? formatTime24(shiftStart)
        : ''
    const shiftEndTime =
      hasConfiguredShiftTime
        ? String(configuredShiftTime!.end)
        : showRotaTimes && shiftEnd && !Number.isNaN(shiftEnd.getTime())
          ? formatTime24(shiftEnd)
        : ''

    const rawShiftLabel = anchor?.label ?? (shiftType ? String(shiftType) : null)
    const shiftLabel =
      rawShiftLabel
        ? rawShiftLabel.charAt(0).toUpperCase() + rawShiftLabel.slice(1).toLowerCase()
        : 'Off'

    const shiftTimeSuffix =
      shiftStartTime && shiftEndTime ? ` · ${shiftStartTime}–${shiftEndTime}` : ''
    const shiftLabelFormatted = anchor
      ? shiftType === 'off'
        ? `Day off${shiftTimeSuffix}`
        : `${shiftLabel} shift${shiftTimeSuffix}`
      : 'Day off'

    const lastSleepEnd = rawWakeEnd && !Number.isNaN(rawWakeEnd.getTime()) ? rawWakeEnd : null
    const nextShiftStart = upcomingShift?.start_ts ? new Date(upcomingShift.start_ts) : null
    const nextShiftEnd = upcomingShift?.end_ts ? new Date(upcomingShift.end_ts) : null
    let nextPlannedSleepStart: Date | null = null
    if (shiftType === 'night' || mealGuide.guidanceMode === 'transition_day_to_night') {
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
      shiftType: toGuidanceShiftType(shiftType, mealGuide.guidanceMode),
      sleepDurationHours: recentHoursForAvg[0] ?? null,
      sleepDebtHours: Math.max(0, (profileForSleepH?.sleep_goal_h ?? 7.5) - (recentHoursForAvg[0] ?? 0)),
      mealsLogged: {
        breakfast: (breakfastCount ?? 0) > 0,
      },
      caffeineLogged: 0,
      userPreferences: {},
    })

    const cardSubtitle = dailyGuidance.primaryRecommendation || baseCardSubtitle

    const anchorDateForBadge = anchor?.rotaDate ?? today
    const { data: eventOnAnchorDate } = await supabase
      .from('rota_events')
      .select('type,color,date,start_at')
      .eq('user_id', userId)
      .or(`date.eq.${anchorDateForBadge},start_at.gte.${anchorDateForBadge}T00:00:00.000Z,start_at.lt.${anchorDateForBadge}T23:59:59.999Z`)
      .order('start_at', { ascending: true })
      .limit(20)

    const patternColors = ((activePattern as any)?.color_config ?? {}) as Record<string, string | null>
    const dayColor = patternColors.day ?? patternColors.morning ?? '#3B82F6'
    const nightColor = patternColors.night ?? '#EF4444'
    const afternoonColor = patternColors.afternoon ?? patternColors.day ?? '#A855F7'
    const eventsForAnchorDate = (eventOnAnchorDate ?? []) as Array<{ type?: string | null; color?: string | null }>
    const preferredEvent =
      eventsForAnchorDate.find((e) => (e.type ?? '').toLowerCase() === 'holiday') ?? eventsForAnchorDate[0]

    const shiftBadgeBorderColor =
      shiftType === 'off'
        ? '#FFFFFF'
        : preferredEvent?.color
          ? String(preferredEvent.color)
          : shiftType === 'night'
        ? nightColor
        : shiftType === 'day'
          ? dayColor
          : shiftType === 'late'
            ? afternoonColor
            : '#CBD5E1'

    const nextPick = pickNextMealOccurrence(mealSchedule, now)
    const nextMealSlot = nextPick?.slot ?? null
    const nextMealAt = nextPick?.at ?? null

    // Build recommended windows
    const recommendedWindows = mealSchedule.map((meal) => ({
      id: meal.id,
      label: meal.label,
      timeRange: meal.windowLabel,
      focus: [meal.hint, meal.subtitle].filter(Boolean).join(' · ') || meal.hint,
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
        time: formatTime24(mealTime),
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
      const mealDate = meal.time
      const nowDay = new Date(now)
      nowDay.setHours(0, 0, 0, 0)
      const tomorrowDay = new Date(nowDay)
      tomorrowDay.setDate(tomorrowDay.getDate() + 1)
      const mealDay = new Date(mealDate)
      mealDay.setHours(0, 0, 0, 0)
      const dayTag: 'today' | 'tomorrow' =
        mealDay.getTime() >= tomorrowDay.getTime() ? 'tomorrow' : 'today'

      // Calculate macros proportionally based on meal calories
      const mealCalorieRatio = meal.caloriesTarget / totalCalories
      return {
        id: meal.id,
        label: meal.label,
        time: formatTime24(meal.time),
        dayTag,
        windowLabel: meal.windowLabel,
        calories: meal.caloriesTarget,
        hint: meal.hint,
        subtitle: meal.subtitle,
        macros: {
          protein: Math.round(totalMacros.protein_g * mealCalorieRatio),
          carbs: Math.round(totalMacros.carbs_g * mealCalorieRatio),
          fats: Math.round(totalMacros.fat_g * mealCalorieRatio),
        },
      }
    })
    .sort((a, b) => {
      const aSlot = mealSchedule.find((slot) => slot.id === a.id)
      const bSlot = mealSchedule.find((slot) => slot.id === b.id)
      const aTime = aSlot?.time?.getTime() ?? 0
      const bTime = bSlot?.time?.getTime() ?? 0
      return aTime - bTime
    })

    const nextMealWithMacros =
      nextMealSlot != null
        ? mealsWithMacros.find((m) => m.id === nextMealSlot.id) ?? mealsWithMacros[0]
        : mealsWithMacros[0]

    const nextMealTimeStr = nextMealAt ? formatTime24(nextMealAt) : '—'

    // Build response
    const response = {
      nextMealLabel: nextMealSlot?.label || 'Next meal',
      nextMealTime: nextMealTimeStr,
      nextMealAt: nextMealAt ? nextMealAt.toISOString() : null,
      nextMealType: nextMealSlot?.hint || 'Balanced meal',
      nextMealSubtitle: nextMealWithMacros?.subtitle ?? null,
      nextMealMacros: nextMealWithMacros?.macros || {
        protein: Math.round(totalMacros.protein_g / mealSchedule.length),
        carbs: Math.round(totalMacros.carbs_g / mealSchedule.length),
        fats: Math.round(totalMacros.fat_g / mealSchedule.length),
      },
      shiftLabel: shiftLabelFormatted,
      shiftBadgeBorderColor,
      dailyGuidance,
      shiftType,
      scheduleTypeUsed,
      hasExactShiftTimes,
      usedFallbackTemplate,
      usedEstimatedShiftTimes,
      cardSubtitle,
      totalCalories: adjusted.adjustedCalories,
      totalMacros,
      meals: mealsWithMacros,
      /** Lets the client re-run getTodayMealSchedule with shift-agent wake anchor. */
      mealPlanInputs: {
        shiftType,
        shiftStartIso: shiftStart && !Number.isNaN(shiftStart.getTime()) ? shiftStart.toISOString() : null,
        shiftEndIso: shiftEnd && !Number.isNaN(shiftEnd.getTime()) ? shiftEnd.toISOString() : null,
        wakeTimeIso: wakeTime.toISOString(),
        expectedSleepHours,
        loggedWakeAfterShiftIso: loggedWakeForMeals ? loggedWakeForMeals.toISOString() : null,
      },
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
      shiftContext: {
        guidanceMode: mealGuide.guidanceMode,
        transitionState: mealGuide.transitionState,
        primaryLabel: shiftCtx.primaryOperationalShift?.label ?? null,
        anchorLabel: anchor?.label ?? null,
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


