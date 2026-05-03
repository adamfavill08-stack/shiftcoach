import { NextRequest, NextResponse } from 'next/server'
import {
  activityDayKeyFromCivilActivityDate,
  activityDayKeyFromTimestamp,
} from '@/lib/activity/shiftedActivityDay'
import {
  buildExplicitWearableShiftedKeysByFamily,
  filterActivityLogRowsForWearableDedupe,
  shouldSkipLegacyWearableActivityLogRow,
} from '@/lib/activity/activityLogWearableDedupe'
import { effectiveActivityLogSteps, sumStepsFromActivityLogRows } from '@/lib/activity/activityLogStepSum'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import {
  getActivityLevelDetails,
  getEstimatedCaloriesBurned,
  getActivityImpactLabel,
  getRecoverySuggestion,
  type ShiftActivityLevel,
} from '@/lib/activity/activityLevels'
import { calculateIntensityBreakdown, type ShiftType } from '@/lib/activity/calculateIntensityBreakdown'
import { generateShiftMovementPlan } from '@/lib/activity/generateShiftMovementPlan'
import { calculateRecoveryScore } from '@/lib/activity/calculateRecoveryScore'
import { calculateActivityScore } from '@/lib/activity/calculateActivityScore'
import { calculateMovementConsistency, type DailyActivityData } from '@/lib/activity/calculateMovementConsistency'
import { computeActivityIntelligence } from '@/lib/activity/activityIntelligence'
import { stepsByHourFromCumulativeLogs } from '@/lib/activity/buildStepsByHour'
import {
  computeShiftStepsDuringShiftsLast7Days,
  stubShiftStepsLast7Days,
  type RotaShiftRow,
} from '@/lib/activity/computeShiftStepsDuringShifts'
import { toShiftType, toActivityShiftType } from '@/lib/shifts/toShiftType'
import { addCalendarDaysToYmd, formatYmdInTimeZone } from '@/lib/sleep/utils'
import { fetchHolidayLocalDatesSet } from '@/lib/rota/holidayRotaPriority'
import { getSleepDeficitForCircadian } from '@/lib/circadian/sleep'
import { computePersonalizedActivityTargets } from '@/lib/activity/personalizedActivityTargets'
import { computeAdaptedStepGoalAgent, type AdaptedStepShift } from '@/lib/activity/computeAdaptedStepGoalAgent'
import { persistAdaptedStepGoalAgent } from '@/lib/activity/persistAdaptedStepGoalAgent'

function toAgentShift(
  shiftType: string | null | undefined,
  shiftPattern: string | null | undefined,
): AdaptedStepShift {
  if (shiftPattern === 'rotating') return 'rotating'
  if (shiftType === 'night') return 'night'
  if (shiftType === 'late') return 'evening'
  if (shiftType === 'day') return 'day'
  return null
}

function deriveSleepMinutes(recentSleepLogs: Array<{ sleep_hours: number | null; end_ts: string }> | null): {
  sleepLastNightMinutes: number | null
  avgSleepLast3NightsMinutes: number | null
} {
  if (!recentSleepLogs || recentSleepLogs.length === 0) {
    return { sleepLastNightMinutes: null, avgSleepLast3NightsMinutes: null }
  }
  const sorted = [...recentSleepLogs]
    .filter((l) => l.sleep_hours != null)
    .sort((a, b) => Date.parse(b.end_ts) - Date.parse(a.end_ts))
  const toMin = (h: number) => Math.round(h * 60)
  const last = sorted[0]
  const sleepLastNightMinutes = last ? toMin(last.sleep_hours!) : null
  const avg3 =
    sorted.length >= 2
      ? sorted.slice(0, 3).reduce((s, l) => s + toMin(l.sleep_hours!), 0) / Math.min(sorted.length, 3)
      : null
  return { sleepLastNightMinutes, avgSleepLast3NightsMinutes: avg3 != null ? Math.round(avg3) : null }
}

/** User-specific; must not be cached stale after manual save / sync. */
export const dynamic = 'force-dynamic'

const ACTIVITY_TODAY_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
} as const

function resolveActivityIntelTimeZone(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get('tz') ?? req.nextUrl.searchParams.get('timeZone') ?? ''
  const decoded = raw ? decodeURIComponent(raw.trim()) : ''
  const zone = decoded.slice(0, 120)
  if (!zone) return 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}

/** Merge two activity_log row lists without double-counting the same row (Health Connect daily upserts use `ts` = sync time, which may fall outside the shift window). */
function mergeActivityLogRowsDedupe(a: readonly any[], b: readonly any[]): any[] {
  const map = new Map<string, any>()
  const rowKey = (r: any) =>
    r?.id != null
      ? `id:${String(r.id)}`
      : `x:${String(r.ts ?? r.created_at ?? '')}|${String(r.steps ?? '')}|${String(r.source ?? '')}|${String(r.activity_date ?? '')}`
  for (const r of a) map.set(rowKey(r), r)
  for (const r of b) {
    const k = rowKey(r)
    if (!map.has(k)) map.set(k, r)
  }
  return [...map.values()]
}

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const now = new Date()
  const activityIntelTimeZone = resolveActivityIntelTimeZone(req)
  // Client passes `tz` on /api/activity/today; use it for "today" so Vercel UTC ≠ user's calendar day.
  const localToday = formatYmdInTimeZone(now, activityIntelTimeZone)
  const today = localToday
  const nowIso = now.toISOString()
  const startOfDay = new Date(today + 'T00:00:00Z')
  const endOfDay = new Date(today + 'T23:59:59Z')

  try {
    // Calculate date ranges once for reuse
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const activityIntelFetchFrom = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)

    // For shift workers, do NOT treat "today" as calendar midnight.
    // Instead, compute the "activity window" from the current shift start -> now.
    // Also include a travel buffer: start 1h before the rota shift start.
    const SHIFT_WINDOW_BUFFER_MS = 60 * 60 * 1000
    const nowPlusBufferAfterIso = new Date(now.getTime() + SHIFT_WINDOW_BUFFER_MS).toISOString()
    const nowMinusBufferBeforeIso = new Date(now.getTime() - SHIFT_WINDOW_BUFFER_MS).toISOString()

    let currentShift:
      | { label: string | null; date: string | null; start_ts: string | null; end_ts: string | null }
      | null = null

    // Prefer an actual "current" shift (now is within start_ts/end_ts)
    const { data: shiftInProgress } = await supabase
      .from('shifts')
      .select('label, date, start_ts, end_ts')
      .eq('user_id', userId)
      // Include shifts whose start is up to 1 hour in the future (travel buffer).
      .lte('start_ts', nowPlusBufferAfterIso)
      // And still consider it "active" for 1 hour after the shift ends.
      .gt('end_ts', nowMinusBufferBeforeIso)
      .maybeSingle()

    if (shiftInProgress) {
      currentShift = shiftInProgress as any
    } else {
      // Fallback: last shift that has started (covers cases where end_ts may be missing)
      const { data: lastStartedShift } = await supabase
        .from('shifts')
        .select('label, date, start_ts, end_ts')
        .eq('user_id', userId)
        .lte('start_ts', nowPlusBufferAfterIso)
        .gt('end_ts', nowMinusBufferBeforeIso)
        .order('start_ts', { ascending: false })
        .limit(1)
        .maybeSingle()

      currentShift = (lastStartedShift as any) ?? null
    }

    const holidayToday = await fetchHolidayLocalDatesSet(supabase, userId, localToday, localToday)
    if (holidayToday.has(localToday)) {
      currentShift = null
    }

    const windowStartDate =
      currentShift?.start_ts != null
        ? new Date(new Date(currentShift.start_ts).getTime() - SHIFT_WINDOW_BUFFER_MS)
        : startOfDay

    let windowEndDate =
      currentShift?.end_ts != null
        ? new Date(new Date(currentShift.end_ts).getTime() + SHIFT_WINDOW_BUFFER_MS)
        : now
    // For "see activity throughout the night", cap the window end at `now`.
    if (windowEndDate.getTime() > now.getTime()) windowEndDate = now
    // Safety: if something is off and end <= start, fall back to "start of day -> now"
    if (windowEndDate.getTime() <= windowStartDate.getTime()) windowEndDate = now

    const windowStartISO = windowStartDate.toISOString()
    const windowEndISO = windowEndDate.toISOString()
    
    // Try to get today's activity - use timestamp filtering since 'date' column may not exist
    let activityResponse: any = { data: null, error: null }
    let activeMinutes: number | null = null

    // Strategy 1: Try with all columns using timestamp filter
    let activityQueryTs: any = await supabase
      .from('activity_logs')
      .select('id,steps,active_minutes,source,merge_status,ts,shift_activity_level,activity_date')
      .eq('user_id', userId)
      .gte('ts', windowStartISO)
      .lt('ts', windowEndISO)
      .order('ts', { ascending: false })

    if (
      activityQueryTs.error &&
      (activityQueryTs.error.code === '42703' ||
        String(activityQueryTs.error.message ?? '').includes('activity_date'))
    ) {
      activityQueryTs = await supabase
        .from('activity_logs')
        .select('id,steps,active_minutes,source,merge_status,ts,shift_activity_level')
        .eq('user_id', userId)
        .gte('ts', windowStartISO)
        .lt('ts', windowEndISO)
        .order('ts', { ascending: false })
    }

    if (activityQueryTs.error) {
      activityResponse = activityQueryTs
    } else {
      let rows = activityQueryTs.data ?? []
      // Health Connect / Apple daily totals: one row with device `activity_date` but `ts` = last sync (often outside shift window).
      const byDateRes = await supabase
        .from('activity_logs')
        .select('id,steps,active_minutes,source,merge_status,ts,shift_activity_level,activity_date')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .order('ts', { ascending: false })
      if (!byDateRes.error && byDateRes.data?.length) {
        rows = mergeActivityLogRowsDedupe(rows, byDateRes.data)
        rows.sort(
          (a: any, b: any) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime(),
        )
      }
      const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
      const totalSteps = sumStepsFromActivityLogRows(kept)
      const mostRecentRow = rows[0]
      const activeMinutesVals = kept.map((r: any) => r.active_minutes).filter((v: any) => typeof v === 'number')
      const totalActiveMinutes = activeMinutesVals.length
        ? activeMinutesVals.reduce((sum: number, v: number) => sum + v, 0)
        : null
      activityResponse = {
        data: {
          steps: totalSteps,
          active_minutes: totalActiveMinutes,
          source: mostRecentRow?.source ?? null,
          shift_activity_level: mostRecentRow?.shift_activity_level ?? null,
        },
        error: null,
      }
    }

    // Strategy 2: If ts doesn't exist, try created_at
    if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('ts'))) {
      let activityQueryCreatedAt: any = await supabase
        .from('activity_logs')
        .select('id,steps,active_minutes,source,merge_status,created_at,shift_activity_level,activity_date')
        .eq('user_id', userId)
        .gte('created_at', windowStartISO)
        .lt('created_at', windowEndISO)
        .order('created_at', { ascending: false })

      if (
        activityQueryCreatedAt.error &&
        (activityQueryCreatedAt.error.code === '42703' ||
          String(activityQueryCreatedAt.error.message ?? '').includes('activity_date'))
      ) {
        activityQueryCreatedAt = await supabase
          .from('activity_logs')
          .select('id,steps,active_minutes,source,merge_status,created_at,shift_activity_level')
          .eq('user_id', userId)
          .gte('created_at', windowStartISO)
          .lt('created_at', windowEndISO)
          .order('created_at', { ascending: false })
      }

      if (activityQueryCreatedAt.error) {
        activityResponse = activityQueryCreatedAt
      } else {
        let rows = activityQueryCreatedAt.data ?? []
        const byDateRes2 = await supabase
          .from('activity_logs')
          .select('id,steps,active_minutes,source,merge_status,ts,created_at,shift_activity_level,activity_date')
          .eq('user_id', userId)
          .eq('activity_date', today)
          .order('created_at', { ascending: false })
        if (!byDateRes2.error && byDateRes2.data?.length) {
          rows = mergeActivityLogRowsDedupe(rows, byDateRes2.data)
          rows.sort(
            (a: any, b: any) =>
              new Date(b.created_at ?? b.ts ?? 0).getTime() -
              new Date(a.created_at ?? a.ts ?? 0).getTime(),
          )
        }
        const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
        const totalSteps = sumStepsFromActivityLogRows(kept)
        const mostRecentRow = rows[0]
        const activeMinutesVals = kept.map((r: any) => r.active_minutes).filter((v: any) => typeof v === 'number')
        const totalActiveMinutes = activeMinutesVals.length
          ? activeMinutesVals.reduce((sum: number, v: number) => sum + v, 0)
          : null
        activityResponse = {
          data: {
            steps: totalSteps,
            active_minutes: totalActiveMinutes,
            source: mostRecentRow?.source ?? null,
            shift_activity_level: mostRecentRow?.shift_activity_level ?? null,
          },
          error: null,
        }
      }
    }

    // Strategy 3: If active_minutes doesn't exist, remove it
    if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('active_minutes'))) {
      console.warn('[/api/activity/today] active_minutes column missing, falling back without it')
      let activityQueryNoActiveMinutes: any = await supabase
        .from('activity_logs')
        .select('steps,source,merge_status,ts,shift_activity_level,activity_date')
        .eq('user_id', userId)
        .gte('ts', windowStartISO)
        .lt('ts', windowEndISO)
        .order('ts', { ascending: false })

      if (
        activityQueryNoActiveMinutes.error &&
        (activityQueryNoActiveMinutes.error.code === '42703' ||
          String(activityQueryNoActiveMinutes.error.message ?? '').includes('activity_date'))
      ) {
        activityQueryNoActiveMinutes = await supabase
          .from('activity_logs')
          .select('steps,source,merge_status,ts,shift_activity_level')
          .eq('user_id', userId)
          .gte('ts', windowStartISO)
          .lt('ts', windowEndISO)
          .order('ts', { ascending: false })
      }
      
      if (activityQueryNoActiveMinutes.error) {
        activityResponse = activityQueryNoActiveMinutes
      } else {
        const rows = activityQueryNoActiveMinutes.data ?? []
        const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
        const totalSteps = sumStepsFromActivityLogRows(kept)
        const mostRecentRow = rows[0]
        activityResponse = {
          data: {
            steps: totalSteps,
            active_minutes: null,
            source: mostRecentRow?.source ?? null,
            shift_activity_level: mostRecentRow?.shift_activity_level ?? null,
          },
          error: null,
        }
      }
      
      if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('ts'))) {
        let activityQueryNoActiveMinutesNoTs: any = await supabase
          .from('activity_logs')
          .select('steps,source,merge_status,created_at,shift_activity_level,activity_date')
          .eq('user_id', userId)
          .gte('created_at', windowStartISO)
          .lt('created_at', windowEndISO)
          .order('created_at', { ascending: false })

        if (
          activityQueryNoActiveMinutesNoTs.error &&
          (activityQueryNoActiveMinutesNoTs.error.code === '42703' ||
            String(activityQueryNoActiveMinutesNoTs.error.message ?? '').includes('activity_date'))
        ) {
          activityQueryNoActiveMinutesNoTs = await supabase
            .from('activity_logs')
            .select('steps,source,merge_status,created_at,shift_activity_level')
            .eq('user_id', userId)
            .gte('created_at', windowStartISO)
            .lt('created_at', windowEndISO)
            .order('created_at', { ascending: false })
        }
        
        if (activityQueryNoActiveMinutesNoTs.error) {
          activityResponse = activityQueryNoActiveMinutesNoTs
        } else {
          const rows = activityQueryNoActiveMinutesNoTs.data ?? []
          const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
          const totalSteps = sumStepsFromActivityLogRows(kept)
          const mostRecentRow = rows[0]
          activityResponse = {
            data: {
              steps: totalSteps,
              active_minutes: null,
              source: mostRecentRow?.source ?? null,
              shift_activity_level: mostRecentRow?.shift_activity_level ?? null,
            },
            error: null,
          }
        }
      }
    }

    // Strategy 4: If source doesn't exist, remove it
    if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('source'))) {
      console.warn('[/api/activity/today] source column missing, falling back without it')
      let activityQueryNoSource: any = await supabase
        .from('activity_logs')
        .select('steps,merge_status,ts,shift_activity_level,activity_date')
        .eq('user_id', userId)
        .gte('ts', windowStartISO)
        .lt('ts', windowEndISO)
        .order('ts', { ascending: false })

      if (
        activityQueryNoSource.error &&
        (activityQueryNoSource.error.code === '42703' ||
          String(activityQueryNoSource.error.message ?? '').includes('activity_date'))
      ) {
        activityQueryNoSource = await supabase
          .from('activity_logs')
          .select('steps,ts,shift_activity_level')
          .eq('user_id', userId)
          .gte('ts', windowStartISO)
          .lt('ts', windowEndISO)
          .order('ts', { ascending: false })
      }
      
      if (activityQueryNoSource.error) {
        activityResponse = activityQueryNoSource
      } else {
        const rows = activityQueryNoSource.data ?? []
        const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
        const totalSteps = sumStepsFromActivityLogRows(kept)
        const mostRecentRow = rows[0]
        activityResponse = {
          data: {
            steps: totalSteps,
            active_minutes: null,
            source: null,
            shift_activity_level: mostRecentRow?.shift_activity_level ?? null,
          },
          error: null,
        }
      }
      
      if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('ts'))) {
        let activityQueryNoSourceNoTs: any = await supabase
          .from('activity_logs')
          .select('steps,created_at,shift_activity_level,activity_date')
          .eq('user_id', userId)
          .gte('created_at', windowStartISO)
          .lt('created_at', windowEndISO)
          .order('created_at', { ascending: false })

        if (
          activityQueryNoSourceNoTs.error &&
          (activityQueryNoSourceNoTs.error.code === '42703' ||
            String(activityQueryNoSourceNoTs.error.message ?? '').includes('activity_date'))
        ) {
          activityQueryNoSourceNoTs = await supabase
            .from('activity_logs')
            .select('steps,created_at,shift_activity_level')
            .eq('user_id', userId)
            .gte('created_at', windowStartISO)
            .lt('created_at', windowEndISO)
            .order('created_at', { ascending: false })
        }
        
        if (activityQueryNoSourceNoTs.error) {
          activityResponse = activityQueryNoSourceNoTs
        } else {
          const rows = activityQueryNoSourceNoTs.data ?? []
          const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
          const totalSteps = sumStepsFromActivityLogRows(kept)
          const mostRecentRow = rows[0]
          activityResponse = {
            data: {
              steps: totalSteps,
              active_minutes: null,
              source: null,
              shift_activity_level: mostRecentRow?.shift_activity_level ?? null,
            },
            error: null,
          }
        }
      }
    }

    // If still error and it's not a relation error, handle it
    if (activityResponse.error && !activityResponse.error.message?.includes('relation')) {
      const { logSupabaseError } = await import('@/lib/supabase/error-handler')
      logSupabaseError('api/activity/today', activityResponse.error, { level: 'warn' })
      // Continue with null data - will return stub
    } else if (!activityResponse.error) {
      activeMinutes = activityResponse.data?.active_minutes ?? null
    }

    const profileResponse = await supabase
      .from('profiles')
      .select(
        'daily_steps_goal, weight_kg, height_cm, goal, sleep_goal_h, shift_pattern, sex, date_of_birth, adapted_daily_steps_goal, adapted_daily_steps_goal_at, activity_adaptation_agent_meta, preferences',
      )
      .eq('user_id', userId)
      .maybeSingle()

    const profileSleepGoalH = Math.min(
      12,
      Math.max(5, profileResponse.data?.sleep_goal_h ?? 7.5),
    )

    // Determine shift type using shared utility
    const standardType = toShiftType(currentShift?.label, currentShift?.start_ts)
    const shiftType = toActivityShiftType(standardType) as ShiftType

    // Parse shift times
    const shiftStart = currentShift?.start_ts ? new Date(currentShift.start_ts) : null
    const shiftEnd = currentShift?.end_ts ? new Date(currentShift.end_ts) : null

    // Get activity level and calculate impacts
    const shiftActivityLevel = activityResponse.data?.shift_activity_level as ShiftActivityLevel | null | undefined
    const weightKg = profileResponse.data?.weight_kg ?? 75
    const steps = activityResponse.data?.steps ?? 0
    const activityDetails = getActivityLevelDetails(shiftActivityLevel)
    const estimatedCaloriesBurned = getEstimatedCaloriesBurned(shiftActivityLevel, weightKg)
    const activityImpact = getActivityImpactLabel(shiftActivityLevel)
    const recoverySuggestion = getRecoverySuggestion(shiftActivityLevel)

    // Calculate intensity breakdown
    const intensityBreakdown = calculateIntensityBreakdown(
      shiftActivityLevel ?? null,
      steps,
      activeMinutes,
      shiftType
    )

    // Generate shift movement plan
    const movementPlan = generateShiftMovementPlan(
      shiftType,
      shiftActivityLevel ?? null,
      shiftStart,
      shiftEnd,
      new Date()
    )

    // Fetch sleep data for recovery score
    const { data: recentSleepLogs } = await supabase
      .from('sleep_logs')
      .select('start_ts, end_ts, sleep_hours, quality, type')
      .eq('user_id', userId)
      .gte('end_ts', sevenDaysAgo.toISOString())
      .order('end_ts', { ascending: false })
      .limit(7)

    // Get previous shift for recovery calculation
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const yesterdayIso = yesterday.toISOString().slice(0, 10)
    const { data: previousShift } = await supabase
      .from('shifts')
      .select('label')
      .eq('user_id', userId)
      .eq('date', yesterdayIso)
      .maybeSingle()

    // Get sleep deficit for recovery calculation
    const { data: sleepDeficitData } = await supabase
      .from('shift_rhythm_scores')
      .select('total_score')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Process sleep data
    const mainSleepLogs = (recentSleepLogs || []).filter((log: any) => 
      !log.type || log.type === 'sleep' || log.type === 'main'
    )
    const lastSleep = mainSleepLogs[0]
    const lastSleepHours = lastSleep?.sleep_hours ?? null
    const lastSleepQuality = lastSleep?.quality ?? null
    const recentSleepHours = mainSleepLogs.slice(0, 7).map((log: any) => log.sleep_hours ?? 0)
    const recentSleepQuality = mainSleepLogs.slice(0, 7).map((log: any) => log.quality ?? null)

    // Determine previous shift type
    let previousShiftType: 'day' | 'night' | 'off' | 'other' = 'other'
    if (previousShift?.label) {
      const prevLabel = previousShift.label.toUpperCase()
      if (prevLabel === 'NIGHT') previousShiftType = 'night'
      else if (prevLabel === 'DAY' || prevLabel === 'MORNING' || prevLabel === 'AFTERNOON' || prevLabel === 'LATE') previousShiftType = 'day'
      else if (prevLabel === 'OFF') previousShiftType = 'off'
    }

    const hasSleepData = mainSleepLogs.length > 0 && recentSleepHours.some((h) => h > 0)
    const hasMovementData = steps > 0 || (activeMinutes ?? 0) > 0

    // Calculate recovery score
    const recoveryScoreResult = hasSleepData
      ? calculateRecoveryScore({
          lastSleepHours,
          lastSleepQuality,
          recentSleepHours,
          recentSleepQuality,
          shiftType,
          previousShiftType,
          sleepDebtHours: sleepDeficitData ? (100 - (sleepDeficitData.total_score ?? 50)) / 10 : 0, // Rough estimate
        })
      : {
          score: 0,
          level: 'Low',
          description: 'Log a few nights of sleep to unlock your personalised recovery score.',
        }

    // Fetch activity logs for movement consistency (7d) + baseline (14d) in one range
    const sevenDaysAgoISO = sevenDaysAgo.toISOString().slice(0, 10)
    const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().slice(0, 10)

    const activityIntelFromIso = activityIntelFetchFrom.toISOString()
    let weeklyActivityQuery: any = await supabase
      .from('activity_logs')
      .select('steps, active_minutes, source, merge_status, ts, shift_activity_level, activity_date')
      .eq('user_id', userId)
      .gte('ts', activityIntelFromIso)
      .order('ts', { ascending: true })

    if (
      weeklyActivityQuery.error &&
      (weeklyActivityQuery.error.code === '42703' ||
        String(weeklyActivityQuery.error.message ?? '').includes('activity_date'))
    ) {
      weeklyActivityQuery = await supabase
        .from('activity_logs')
        .select('steps, active_minutes, source, merge_status, ts, shift_activity_level')
        .eq('user_id', userId)
        .gte('ts', activityIntelFromIso)
        .order('ts', { ascending: true })
    }

    if (weeklyActivityQuery.error && (weeklyActivityQuery.error.code === '42703' || weeklyActivityQuery.error.message?.includes('ts'))) {
      weeklyActivityQuery = await supabase
        .from('activity_logs')
        .select('steps, active_minutes, source, merge_status, created_at, shift_activity_level, activity_date')
        .eq('user_id', userId)
        .gte('created_at', activityIntelFromIso)
        .order('created_at', { ascending: true })
    }

    if (
      weeklyActivityQuery.error &&
      (weeklyActivityQuery.error.code === '42703' ||
        String(weeklyActivityQuery.error.message ?? '').includes('activity_date'))
    ) {
      weeklyActivityQuery = await supabase
        .from('activity_logs')
        .select('steps, active_minutes, source, merge_status, created_at, shift_activity_level')
        .eq('user_id', userId)
        .gte('created_at', activityIntelFromIso)
        .order('created_at', { ascending: true })
    }

    // Get shifts for the last 7 days to determine shift types
    const { data: weeklyShifts } = await supabase
      .from('shifts')
      .select('date, label, start_ts, end_ts')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgoISO)
      .lte('date', today)
      .order('date', { ascending: true })

    // Build shift type map + rota rows for shift-window step attribution
    const shiftTypeMap = new Map<string, 'day' | 'night' | 'off' | 'other'>()
    const shiftsByDateMap = new Map<string, RotaShiftRow>()
    if (weeklyShifts) {
      weeklyShifts.forEach((shift: { date: string; label: string | null; start_ts: string | null; end_ts: string | null }) => {
        const standardType = toShiftType(shift.label, shift.start_ts)
        const type = toActivityShiftType(standardType) as 'day' | 'night' | 'off' | 'other'
        shiftTypeMap.set(shift.date, type)
        shiftsByDateMap.set(shift.date, {
          date: shift.date,
          label: shift.label ?? null,
          start_ts: shift.start_ts ?? null,
          end_ts: shift.end_ts ?? null,
        })
      })
    }

    // Process weekly activity data
    const weeklyActivityData: DailyActivityData[] = []
    const activityByDate = new Map<string, { steps: number; activeMinutes: number | null; source?: string }>()

    const weeklyLogs = (weeklyActivityQuery.data ?? []) as any[]
    // Rollout: legacy wearable rows (no activity_date) can duplicate new rows keyed by activity_date.
    const explicitWearableShiftedKeysByFamily = buildExplicitWearableShiftedKeysByFamily(
      weeklyLogs,
      activityIntelTimeZone,
    )

    // Group activity by date
    if (weeklyLogs.length > 0) {
      weeklyLogs.forEach((log: any) => {
        if (
          shouldSkipLegacyWearableActivityLogRow(log, activityIntelTimeZone, explicitWearableShiftedKeysByFamily)
        ) {
          return
        }
        const rawAd = typeof log.activity_date === 'string' ? log.activity_date.trim().slice(0, 10) : ''
        const logDate =
          /^\d{4}-\d{2}-\d{2}$/.test(rawAd)
            ? rawAd
            : log.ts
              ? new Date(log.ts).toISOString().slice(0, 10)
              : log.created_at
                ? new Date(log.created_at).toISOString().slice(0, 10)
                : null

        if (logDate && logDate >= fourteenDaysAgoISO && logDate <= today) {
          const existing = activityByDate.get(logDate)
          if (existing) {
            // Sum steps and take max active minutes for the day
            existing.steps += effectiveActivityLogSteps(log)
            if (log.active_minutes !== null && (existing.activeMinutes === null || log.active_minutes > existing.activeMinutes)) {
              existing.activeMinutes = log.active_minutes
            }
            // Prefer wearable source if available
            if (log.source && log.source !== 'Manual entry' && existing.source === 'Manual entry') {
              existing.source = log.source
            }
          } else {
            activityByDate.set(logDate, {
              steps: effectiveActivityLogSteps(log),
              activeMinutes: log.active_minutes ?? null,
              source: log.source ?? 'Manual entry',
            })
          }
        }
      })
    }

    const stepsByActivityDay: Record<string, number> = {}
    if (weeklyLogs.length > 0) {
      const ymdRe = /^\d{4}-\d{2}-\d{2}$/
      for (const log of weeklyLogs) {
        if (
          shouldSkipLegacyWearableActivityLogRow(log, activityIntelTimeZone, explicitWearableShiftedKeysByFamily)
        ) {
          continue
        }
        const rawAd = typeof log.activity_date === 'string' ? log.activity_date.trim().slice(0, 10) : ''
        let dayKey: string | null = null
        if (ymdRe.test(rawAd)) {
          dayKey = activityDayKeyFromCivilActivityDate(rawAd, activityIntelTimeZone)
        } else {
          const t = log.ts ?? log.created_at
          if (t) dayKey = activityDayKeyFromTimestamp(t, activityIntelTimeZone)
        }
        if (!dayKey) continue
        const s = effectiveActivityLogSteps(log)
        stepsByActivityDay[dayKey] = (stepsByActivityDay[dayKey] ?? 0) + s
      }
    }

    const currentActivityDayKey = activityDayKeyFromTimestamp(now, activityIntelTimeZone)
    const sleepDeficitForIntel = await getSleepDeficitForCircadian(
      supabase,
      userId,
      profileSleepGoalH,
    )
    const activityIntelligence = computeActivityIntelligence({
      currentActivityDayKey,
      stepsByActivityDay,
      weeklyDeficitHours: sleepDeficitForIntel?.weeklyDeficit ?? null,
      activityTimeZone: activityIntelTimeZone,
    })

    // Build daily data array for last 7 days
    for (let i = 6; i >= 0; i--) {
      const dateStr = addCalendarDaysToYmd(today, -i)
      
      const activity = activityByDate.get(dateStr) ?? { steps: 0, activeMinutes: null, source: 'Manual entry' }
      const shiftType = shiftTypeMap.get(dateStr) ?? 'other'

      weeklyActivityData.push({
        date: dateStr,
        steps: activity.steps,
        activeMinutes: activity.activeMinutes,
        source: activity.source as any,
        shiftType,
      })
    }

    // ── Adapted step goal agent ──────────────────────────────────────────────
    const profile = profileResponse.data
    const { sleepLastNightMinutes, avgSleepLast3NightsMinutes } = deriveSleepMinutes(
      recentSleepLogs ?? null,
    )

    const agentShift = toAgentShift(shiftType, profile?.shift_pattern)

    // UTC calendar dates — matches weeklyActivityData keys (toISOString slice). If we ever key shiftTypeMap with isoLocalDate instead, align these lookups the same way.
    const todayStr = new Date().toISOString().slice(0, 10)
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const todayShiftRaw = shiftTypeMap.get(todayStr) ?? null
    const yesterdayShiftRaw = shiftTypeMap.get(yesterdayStr) ?? null
    const shiftTransitionDetected =
      todayShiftRaw != null && yesterdayShiftRaw != null && todayShiftRaw !== yesterdayShiftRaw

    const ageYears = profile?.date_of_birth
      ? Math.floor((Date.now() - Date.parse(profile.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const prefs = profile?.preferences as
      | { hardGoalMin?: number | null; hardGoalMax?: number | null; optOutAdaptive?: boolean }
      | null
      | undefined

    const agentResult = computeAdaptedStepGoalAgent({
      userId,
      baselineGoal: profile?.daily_steps_goal ?? null,
      heightCm: profile?.height_cm ?? null,
      weightKg: profile?.weight_kg ?? null,
      sex: (profile?.sex as 'male' | 'female' | 'other' | null | undefined) ?? null,
      ageYears,
      recent7DaySteps: weeklyActivityData.map((d) => d.steps),
      todayStepsSoFar: activityResponse.data?.steps ?? 0,
      sleepLastNightMinutes,
      avgSleepLast3NightsMinutes,
      shift: agentShift,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: {
        hardGoalMin: prefs?.hardGoalMin ?? null,
        hardGoalMax: prefs?.hardGoalMax ?? null,
        optOutAdaptive: prefs?.optOutAdaptive ?? false,
      },
      lastAdaptedAt: profile?.adapted_daily_steps_goal_at ?? null,
      lastAdaptedStepGoal: profile?.adapted_daily_steps_goal ?? null,
      shiftTransitionDetected,
      // TODO: set true from circadian / sleep-window signal when available (sleep-window debounce path is dormant until then).
      inSleepWindow: false,
    })

    persistAdaptedStepGoalAgent(supabase, agentResult).catch((err) =>
      console.error('[activity/today] persistAdaptedStepGoalAgent failed:', err),
    )
    // ── end agent ────────────────────────────────────────────────────────────

    // Calculate movement consistency
    const movementConsistency = calculateMovementConsistency(weeklyActivityData)

    const profileStepGoal = profileResponse.data?.daily_steps_goal ?? 10000
    const bodyGoal = profileResponse.data?.goal as 'lose' | 'maintain' | 'gain' | null | undefined
    const shiftPattern = profileResponse.data?.shift_pattern as
      | 'rotating'
      | 'mostly_days'
      | 'mostly_nights'
      | 'custom'
      | null
      | undefined

    const activityPersonalization = computePersonalizedActivityTargets({
      profileStepGoal,
      heightCm: profileResponse.data?.height_cm ?? null,
      weightKg: profileResponse.data?.weight_kg ?? null,
      bodyGoal: bodyGoal ?? null,
      shiftPattern: shiftPattern ?? null,
      shiftTypeToday: shiftType,
      weeklySleepDeficitHours: sleepDeficitForIntel?.weeklyDeficit ?? null,
      sleepCategory: sleepDeficitForIntel?.category ?? null,
      baselineSteps: activityIntelligence.baselineSteps,
      baselineDaysUsed: activityIntelligence.baselineDaysUsed,
      last7DaySteps: weeklyActivityData.map((d) => d.steps),
      recoveryScore: recoveryScoreResult.score,
    })

    const intensityTargetBase =
      intensityBreakdown.light.target +
      intensityBreakdown.moderate.target +
      intensityBreakdown.vigorous.target
    const scaledActiveMinutesTarget = Math.max(
      10,
      Math.round(intensityTargetBase * activityPersonalization.intensityTargetMultiplier),
    )

    const activityScoreResult = hasMovementData
      ? calculateActivityScore({
          steps,
          stepTarget: activityPersonalization.effectiveStepGoal,
          activeMinutes,
          activeMinutesTarget: scaledActiveMinutesTarget,
          intensityBreakdown,
          shiftType,
          shiftActivityLevel: shiftActivityLevel ?? null,
        })
      : {
          score: 0,
          level: 'Low',
          description:
            'Log steps or connect a wearable to see how your daily movement compares to your target.',
        }

    const sevenDayYmds = weeklyActivityData.map((d) => d.date)
    const weeklyLogsFiltered = weeklyLogs.filter(
      (log: any) =>
        !shouldSkipLegacyWearableActivityLogRow(log, activityIntelTimeZone, explicitWearableShiftedKeysByFamily),
    )
    const shiftStepsLast7Days = computeShiftStepsDuringShiftsLast7Days(
      sevenDayYmds,
      shiftsByDateMap,
      shiftTypeMap,
      activityByDate,
      weeklyLogsFiltered,
      now,
    )

    let hourlyForChart: { steps: number; ts?: string | null; created_at?: string | null }[] = []
    let hourlyQuery: any = await supabase
      .from('activity_logs')
      .select('id, steps, merge_status, ts, created_at, activity_date, source')
      .eq('user_id', userId)
      .gte('ts', windowStartISO)
      .lte('ts', windowEndISO)
      .order('ts', { ascending: true })

    if (
      hourlyQuery.error &&
      (hourlyQuery.error.code === '42703' || String(hourlyQuery.error.message ?? '').includes('ts'))
    ) {
      hourlyQuery = await supabase
        .from('activity_logs')
        .select('id, steps, merge_status, ts, created_at, activity_date, source')
        .eq('user_id', userId)
        .gte('created_at', windowStartISO)
        .lte('created_at', windowEndISO)
        .order('created_at', { ascending: true })
    }

    if (!hourlyQuery.error) {
      let hourlyRows = hourlyQuery.data ?? []
      const hourlyByDate = await supabase
        .from('activity_logs')
        .select('id, steps, merge_status, ts, created_at, activity_date, source')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .order('ts', { ascending: true })
      if (!hourlyByDate.error && hourlyByDate.data?.length) {
        hourlyRows = mergeActivityLogRowsDedupe(hourlyRows, hourlyByDate.data)
        hourlyRows.sort(
          (a: any, b: any) =>
            new Date(a.ts ?? a.created_at ?? 0).getTime() - new Date(b.ts ?? b.created_at ?? 0).getTime(),
        )
      }
      hourlyForChart = filterActivityLogRowsForWearableDedupe(hourlyRows, activityIntelTimeZone).map((r: any) => ({
        ...r,
        steps: effectiveActivityLogSteps(r),
      }))
    }

    /** Align hourly chart with the same window as step queries (incl. pre-shift buffer). */
    const stepsByHourChartAnchor = shiftStart != null ? windowStartDate : null
    const stepsByHour = stepsByHourFromCumulativeLogs(
      hourlyForChart,
      activityIntelTimeZone,
      steps,
      stepsByHourChartAnchor
        ? { shiftStart: stepsByHourChartAnchor, shiftEnd: shiftEnd ?? now, now }
        : { shiftStart: null, shiftEnd: null, now },
    )

    const payload = {
      steps,
      activeMinutes,
      lastSyncedAt: null, // Column doesn't exist in database
      source: activityResponse.data?.source ?? 'Manual entry',
      goal: profileStepGoal,
      /** Steps target adjusted for profile, sleep, shift, recovery, and observed rhythm (see activityPersonalization). */
      adaptedStepGoal: agentResult.adaptedStepGoal,
      activityPersonalization: agentResult.activityPersonalization,
      /** Current rota context for client (recommendations, copy). Must match shift used for window + scores. */
      shiftType,
      // Use shift date if we have it, so night-shift UI stays consistent.
      date: currentShift?.date ?? today,
      // New activity level fields
      shiftActivityLevel: shiftActivityLevel ?? null,
      activityLabel: activityDetails?.label ?? null,
      activityDescription: activityDetails?.description ?? null,
      estimatedCaloriesBurned,
      activityImpact,
      activityFactor: activityDetails?.factor ?? 1.0,
      recoverySuggestion,
      // Intensity breakdown
      intensityBreakdown,
      // Shift movement plan
      movementPlan,
      // Shift timing
      shiftStart: shiftStart?.toISOString() ?? null,
      shiftEnd: shiftEnd?.toISOString() ?? null,
      // Recovery and Activity scores
      recoveryScore: recoveryScoreResult.score,
      recoveryLevel: recoveryScoreResult.level,
      recoveryDescription: recoveryScoreResult.description,
      activityScore: activityScoreResult.score,
      activityLevel: activityScoreResult.level,
      activityScoreDescription: activityScoreResult.description,
      // Movement consistency
      movementConsistency: movementConsistency.consistencyScore,
      movementConsistencyData: movementConsistency,
      activityIntelligence,
      stepsByHour,
      /** ISO start of hour-slot 0 for `stepsByHour` when shift-aware; omit when civil clock buckets. */
      stepsByHourAnchorStart: stepsByHourChartAnchor?.toISOString() ?? null,
      shiftStepsLast7Days,
    }

    return NextResponse.json({ activity: payload }, { status: 200, headers: ACTIVITY_TODAY_CACHE_HEADERS })
  } catch (err: any) {
    console.error('[/api/activity/today] error:', err)
    return NextResponse.json(
      {
        activity: {
          steps: 0,
          activeMinutes: null,
          lastSyncedAt: null,
          source: 'Not connected',
          goal: 10000,
          adaptedStepGoal: 10000,
          activityPersonalization: {
            profileStepGoal: 10000,
            effectiveStepGoal: 10000,
            intensityTargetMultiplier: 1,
            reasons: [] as string[],
          },
          shiftType: 'other' as const,
          date: today,
          shiftActivityLevel: null,
          activityLabel: null,
          activityDescription: null,
          estimatedCaloriesBurned: 0,
          activityImpact: 'Not set',
          activityFactor: 1.0,
          recoverySuggestion: 'Maintain consistent sleep timing to support your body clock.',
          intensityBreakdown: {
            light: { minutes: 0, target: 10 },
            moderate: { minutes: 0, target: 15 },
            vigorous: { minutes: 0, target: 5 },
            totalActiveMinutes: 0,
          },
          movementPlan: {
            title: 'Daily movement plan',
            activities: [
              { label: 'Morning walk', timing: 'Morning', duration: '10-15 min' },
              { label: 'Midday break', timing: 'Midday', duration: '10 min' },
              { label: 'Evening stretch', timing: 'Evening', duration: '10-15 min' },
            ],
            intensity: 'Moderate' as const,
            shiftType: 'other' as const,
          },
          shiftStart: null,
          shiftEnd: null,
          recoveryScore: 50,
          recoveryLevel: 'Moderate',
          recoveryDescription: 'Recovery data not available. Log sleep to get personalized recovery insights.',
          activityScore: 0,
          activityLevel: 'Low',
          activityScoreDescription: 'Activity data not available. Start moving to track your activity score.',
          movementConsistency: 0,
          movementConsistencyData: {
            consistencyScore: 0,
            weeklyAverageSteps: 0,
            weeklyAverageActiveMinutes: null,
            dailyData: [],
            trend: 'insufficient_data',
            insights: ['Not enough activity data to calculate consistency.'],
          },
          activityIntelligence: {
            activityDaySteps: 0,
            activityDayKey: '1970-01-01',
            activityTimeZone: 'UTC',
            baselineSteps: null,
            baselineDaysUsed: 0,
            deltaVsBaseline: null,
            activityStatus: 'insufficient_data',
            lowActivityDay: false,
            readinessHint: null,
            readinessInsight: null,
          },
          stepsByHour: Array.from({ length: 24 }, () => 0),
          stepsByHourAnchorStart: null,
          shiftStepsLast7Days: stubShiftStepsLast7Days(today),
        },
      },
      { status: 200, headers: ACTIVITY_TODAY_CACHE_HEADERS },
    )
  }
}
