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
import {
  computeActivityTotalsBreakdown,
  effectiveActivityLogSteps,
  isManualActivityRow,
  toPublicActivityTotalsBreakdown,
  type ActivityTotalsBreakdown,
  type ActivityTotalsSourceOfTruth,
} from '@/lib/activity/activityLogStepSum'
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
  countDuplicateBucketStarts,
  processWearableStepSamplesForMovementCard,
} from '@/lib/activity/normalizeWearableStepSamplesForMovement'
import { inferSleepWindowStartAfterShiftEnd } from '@/lib/activity/inferSleepWindowStartAfterShiftEnd'
import {
  computeShiftStepsDuringShiftsLast7Days,
  stubShiftStepsLast7Days,
  type RotaShiftRow,
} from '@/lib/activity/computeShiftStepsDuringShifts'
import { toShiftType, toActivityShiftType } from '@/lib/shifts/toShiftType'
import {
  addCalendarDaysToYmd,
  endOfLocalDayUtcMs,
  formatYmdInTimeZone,
  movementAllocationWindowFromShiftInstants,
  rowCountsAsPrimarySleep,
  startOfLocalDayUtcMs,
} from '@/lib/sleep/utils'
import { fetchActivityLogsByActivityDateWindow } from '@/lib/activity/fetchActivityLogsByActivityDateWindow'
import { fetchHolidayLocalDatesSet } from '@/lib/rota/holidayRotaPriority'
import { getSleepDeficitForCircadian } from '@/lib/circadian/sleep'
import { computePersonalizedActivityTargets } from '@/lib/activity/personalizedActivityTargets'
import { computeAdaptedStepGoalAgent, type AdaptedStepShift } from '@/lib/activity/computeAdaptedStepGoalAgent'
import { persistAdaptedStepGoalAgent } from '@/lib/activity/persistAdaptedStepGoalAgent'
import {
  civilYmdRangeInclusive,
  filterActivityLogRowsToCivilYmd,
  filterActivityLogRowsToCivilYmdSet,
  resolveActivityLogCivilYmd,
} from '@/lib/activity/activityLogCivilDay'
import {
  applyCurrentShiftFallbackBounds,
  isWorkRosterLabel,
  pickCurrentShiftFromOverlapRows,
  type ActivityTodayShiftRow,
} from '@/lib/activity/currentShiftForActivityToday'

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

type RecentSleepLogRow = {
  sleep_hours?: number | null
  end_ts?: string | null
  end_at?: string | null
  start_ts?: string | null
  start_at?: string | null
}

function sleepHoursFromLogRow(log: RecentSleepLogRow): number | null {
  if (typeof log.sleep_hours === 'number' && Number.isFinite(log.sleep_hours) && log.sleep_hours > 0) {
    return log.sleep_hours
  }
  const start = log.start_ts || log.start_at
  const end = log.end_ts || log.end_at
  if (!start || !end) return null
  const ms = Date.parse(end) - Date.parse(start)
  if (!Number.isFinite(ms) || ms <= 0) return null
  return ms / 3600000
}

function deriveSleepMinutes(recentSleepLogs: RecentSleepLogRow[] | null): {
  sleepLastNightMinutes: number | null
  avgSleepLast3NightsMinutes: number | null
} {
  const primary =
    recentSleepLogs?.filter((l) =>
      rowCountsAsPrimarySleep(l as { type?: string | null; naps?: number | null }),
    ) ?? []
  if (primary.length === 0) {
    return { sleepLastNightMinutes: null, avgSleepLast3NightsMinutes: null }
  }
  const enriched = primary
    .map((l) => ({
      log: l,
      hours: sleepHoursFromLogRow(l),
      end: l.end_ts || l.end_at || '',
    }))
    .filter((x) => x.hours != null && x.end)
    .sort((a, b) => Date.parse(b.end) - Date.parse(a.end))
  const sorted = enriched.map((x) => ({ ...x.log, sleep_hours: x.hours! }))
  const toMin = (h: number) => Math.round(h * 60)
  const last = sorted[0]
  const sleepLastNightMinutes = last && last.sleep_hours != null ? toMin(last.sleep_hours) : null
  const avg3 =
    sorted.length >= 2
      ? sorted.slice(0, 3).reduce((s, l) => s + toMin(l.sleep_hours ?? 0), 0) / Math.min(sorted.length, 3)
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

/**
 * Merges rows for the user's civil `localToday` (activity_date + manual orphans with NULL activity_date)
 * into shift-window / ts queries so "today" totals match the activity log page and DB truth.
 */
async function mergeTodayActivityLogsByCivilDate(
  supabase: any,
  userId: string,
  localToday: string,
  activityIntelTimeZone: string,
  rows: any[],
): Promise<any[]> {
  const byCivilDay = await fetchActivityLogsByActivityDateWindow(
    supabase,
    userId,
    localToday,
    localToday,
    { timeZone: activityIntelTimeZone },
  )
  if (!byCivilDay.length) return rows
  const merged = mergeActivityLogRowsDedupe(rows, byCivilDay)
  merged.sort((a: any, b: any) => new Date(b.ts ?? b.created_at ?? 0).getTime() - new Date(a.ts ?? a.created_at ?? 0).getTime())
  return filterActivityLogRowsToCivilYmd(
    merged as Record<string, unknown>[],
    localToday,
    activityIntelTimeZone,
  ) as any[]
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

function activeMinutesFromKeptRows(kept: any[], sourceOfTruth: ActivityTotalsSourceOfTruth): number | null {
  const nums = (arr: any[]) =>
    arr
      .map((r) => r.active_minutes)
      .filter((v: unknown) => typeof v === 'number' && Number.isFinite(v)) as number[]
  if (sourceOfTruth === 'wearable') {
    const wear = kept.filter((r: any) => !isManualActivityRow(r.source))
    const v = nums(wear)
    return v.length ? Math.max(...v) : null
  }
  if (sourceOfTruth === 'manual') {
    const manuals = kept.filter(
      (r: any) => isManualActivityRow(r.source) && r.merge_status !== 'superseded_by_wearable',
    )
    const v = nums(manuals)
    return v.length ? v.reduce((a, b) => a + b, 0) : null
  }
  return null
}

function pickMostRecentRowForDisplay(rows: any[], kept: any[], breakdown: ActivityTotalsBreakdown): any {
  if (breakdown.sourceOfTruth === 'wearable') {
    const w = kept.find((r: any) => !isManualActivityRow(r.source))
    if (w) return w
  }
  return rows[0]
}

/** 20d activity_logs window for movement consistency — retries match legacy column rollouts. */
async function fetchWeeklyActivityLogsWithRetries(supabase: any, userId: string, activityIntelFromIso: string) {
  let weeklyActivityQuery: any = await supabase
    .from('activity_logs')
    .select(
      'steps, active_minutes, source, merge_status, ts, logged_at, created_at, id, shift_activity_level, activity_date',
    )
    .eq('user_id', userId)
    .gte('ts', activityIntelFromIso)
    .order('ts', { ascending: true })

  if (
    weeklyActivityQuery.error &&
    String(weeklyActivityQuery.error.message ?? '').includes('logged_at')
  ) {
    weeklyActivityQuery = await supabase
      .from('activity_logs')
      .select('steps, active_minutes, source, merge_status, ts, created_at, id, shift_activity_level, activity_date')
      .eq('user_id', userId)
      .gte('ts', activityIntelFromIso)
      .order('ts', { ascending: true })
  }

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

  if (
    weeklyActivityQuery.error &&
    (weeklyActivityQuery.error.code === '42703' || weeklyActivityQuery.error.message?.includes('ts'))
  ) {
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

  return weeklyActivityQuery
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

  try {
    // Calculate date ranges once for reuse
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const activityIntelFetchFrom = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    const activityIntelFromIso = activityIntelFetchFrom.toISOString()
    const sevenDaysAgoISO = sevenDaysAgo.toISOString().slice(0, 10)
    const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().slice(0, 10)

    // For shift workers, do NOT treat "today" as calendar midnight.
    // Instead, compute the "activity window" from the current shift start -> now.
    // Also include a travel buffer: start 1h before the rota shift start.
    const SHIFT_WINDOW_BUFFER_MS = 60 * 60 * 1000
    const nowPlusBufferAfterIso = new Date(now.getTime() + SHIFT_WINDOW_BUFFER_MS).toISOString()
    const nowMinusBufferBeforeIso = new Date(now.getTime() - SHIFT_WINDOW_BUFFER_MS).toISOString()

    let currentShift: ActivityTodayShiftRow | null = null

    // Overlap query and holiday lookup are independent — run together to cut latency.
    const [{ data: overlapRaw }, holidayToday] = await Promise.all([
      supabase
        .from('shifts')
        .select('label, date, start_ts, end_ts')
        .eq('user_id', userId)
        .not('start_ts', 'is', null)
        .not('end_ts', 'is', null)
        .lte('start_ts', nowPlusBufferAfterIso)
        .gt('end_ts', nowMinusBufferBeforeIso)
        .order('start_ts', { ascending: false })
        .limit(24),
      fetchHolidayLocalDatesSet(supabase, userId, localToday, localToday),
    ])

    const overlapList = (Array.isArray(overlapRaw) ? overlapRaw : []) as ActivityTodayShiftRow[]
    currentShift = pickCurrentShiftFromOverlapRows(overlapList, now, SHIFT_WINDOW_BUFFER_MS)

    // Roster fallback: civil “today” row may be DAY/NIGHT but instants missing or outside buffer.
    if (!currentShift) {
      const { data: todayShift } = await supabase
        .from('shifts')
        .select('label, date, start_ts, end_ts')
        .eq('user_id', userId)
        .eq('date', localToday)
        .maybeSingle()

      if (todayShift && isWorkRosterLabel(todayShift.label)) {
        currentShift = applyCurrentShiftFallbackBounds(
          todayShift as ActivityTodayShiftRow,
          localToday,
          activityIntelTimeZone,
        )
      }
    }

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

    /** Overlap with activity-log reads — profile is independent of shift window. */
    const profilePromise = supabase
      .from('profiles')
      .select(
        'daily_steps_goal, weight_kg, height_cm, goal, sleep_goal_h, shift_pattern, sex, date_of_birth, adapted_daily_steps_goal, adapted_daily_steps_goal_at, activity_adaptation_agent_meta, preferences',
      )
      .eq('user_id', userId)
      .maybeSingle()

    /** Overlap with weekly `activity_logs` fetch — rota rows do not depend on logs. */
    const weeklyShiftsPromise = supabase
      .from('shifts')
      .select('date, label, start_ts, end_ts')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgoISO)
      .lte('date', today)
      .order('date', { ascending: true })

    /** Runs in parallel with “today” activity resolution and later sleep batch — same inputs as the old sequential block. */
    const weeklyActivityLogsPromise = fetchWeeklyActivityLogsWithRetries(supabase, userId, activityIntelFromIso)
    const logsByActivityDateForWeeklyPromise = fetchActivityLogsByActivityDateWindow(
      supabase,
      userId,
      addCalendarDaysToYmd(localToday, -14),
      localToday,
      { timeZone: activityIntelTimeZone },
    )

    // Try to get today's activity - use timestamp filtering since 'date' column may not exist
    let activityResponse: any = { data: null, error: null }
    let activeMinutes: number | null = null
    let lastTodayTotalsBreakdown: ActivityTotalsBreakdown | null = null

    // Strategy 1: window + by-activity_date overlap (parallel round trips).
    const activityLogsTodayByDateTs = () =>
      supabase
        .from('activity_logs')
        .select('id,steps,active_minutes,source,merge_status,ts,shift_activity_level,activity_date')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .order('ts', { ascending: false })
    const activityLogsTodayWindowTs = () =>
      supabase
        .from('activity_logs')
        .select('id,steps,active_minutes,source,merge_status,ts,shift_activity_level,activity_date')
        .eq('user_id', userId)
        .gte('ts', windowStartISO)
        .lt('ts', windowEndISO)
        .order('ts', { ascending: false })

    let [activityQueryTs, byDateRes]: [any, any] = await Promise.all([
      activityLogsTodayWindowTs(),
      activityLogsTodayByDateTs(),
    ])

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
      if (!byDateRes.error && byDateRes.data?.length) {
        rows = mergeActivityLogRowsDedupe(rows, byDateRes.data)
        rows.sort(
          (a: any, b: any) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime(),
        )
      }
      rows = await mergeTodayActivityLogsByCivilDate(supabase, userId, today, activityIntelTimeZone, rows)
      const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
      const todayBreakdown = computeActivityTotalsBreakdown(kept, {
        includeDebugContributingIds: process.env.NODE_ENV === 'development',
      })
      lastTodayTotalsBreakdown = todayBreakdown
      const totalSteps = todayBreakdown.totalSteps
      const mostRecentRow = pickMostRecentRowForDisplay(rows, kept, todayBreakdown)
      const totalActiveMinutes = activeMinutesFromKeptRows(kept, todayBreakdown.sourceOfTruth)
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
      const activityLogsTodayByDateCreatedAt = () =>
        supabase
          .from('activity_logs')
          .select('id,steps,active_minutes,source,merge_status,ts,created_at,shift_activity_level,activity_date')
          .eq('user_id', userId)
          .eq('activity_date', today)
          .order('created_at', { ascending: false })
      const activityLogsTodayWindowCreatedAt = () =>
        supabase
          .from('activity_logs')
          .select('id,steps,active_minutes,source,merge_status,created_at,shift_activity_level,activity_date')
          .eq('user_id', userId)
          .gte('created_at', windowStartISO)
          .lt('created_at', windowEndISO)
          .order('created_at', { ascending: false })

      let [activityQueryCreatedAt, byDateRes2]: [any, any] = await Promise.all([
        activityLogsTodayWindowCreatedAt(),
        activityLogsTodayByDateCreatedAt(),
      ])

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
        if (!byDateRes2.error && byDateRes2.data?.length) {
          rows = mergeActivityLogRowsDedupe(rows, byDateRes2.data)
          rows.sort(
            (a: any, b: any) =>
              new Date(b.created_at ?? b.ts ?? 0).getTime() -
              new Date(a.created_at ?? a.ts ?? 0).getTime(),
          )
        }
        rows = await mergeTodayActivityLogsByCivilDate(supabase, userId, today, activityIntelTimeZone, rows)
        const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
        const todayBreakdown = computeActivityTotalsBreakdown(kept, {
          includeDebugContributingIds: process.env.NODE_ENV === 'development',
        })
        lastTodayTotalsBreakdown = todayBreakdown
        const totalSteps = todayBreakdown.totalSteps
        const mostRecentRow = pickMostRecentRowForDisplay(rows, kept, todayBreakdown)
        const totalActiveMinutes = activeMinutesFromKeptRows(kept, todayBreakdown.sourceOfTruth)
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
        let rows = activityQueryNoActiveMinutes.data ?? []
        rows = await mergeTodayActivityLogsByCivilDate(supabase, userId, today, activityIntelTimeZone, rows)
        const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
        const todayBreakdown = computeActivityTotalsBreakdown(kept, {
          includeDebugContributingIds: process.env.NODE_ENV === 'development',
        })
        lastTodayTotalsBreakdown = todayBreakdown
        const totalSteps = todayBreakdown.totalSteps
        const mostRecentRow = pickMostRecentRowForDisplay(rows, kept, todayBreakdown)
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
          let rows = activityQueryNoActiveMinutesNoTs.data ?? []
          rows = await mergeTodayActivityLogsByCivilDate(supabase, userId, today, activityIntelTimeZone, rows)
          const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
          const todayBreakdown = computeActivityTotalsBreakdown(kept, {
            includeDebugContributingIds: process.env.NODE_ENV === 'development',
          })
          lastTodayTotalsBreakdown = todayBreakdown
          const totalSteps = todayBreakdown.totalSteps
          const mostRecentRow = pickMostRecentRowForDisplay(rows, kept, todayBreakdown)
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
        let rows = activityQueryNoSource.data ?? []
        rows = await mergeTodayActivityLogsByCivilDate(supabase, userId, today, activityIntelTimeZone, rows)
        const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
        const todayBreakdown = computeActivityTotalsBreakdown(kept, {
          includeDebugContributingIds: process.env.NODE_ENV === 'development',
        })
        lastTodayTotalsBreakdown = todayBreakdown
        const totalSteps = todayBreakdown.totalSteps
        const mostRecentRow = pickMostRecentRowForDisplay(rows, kept, todayBreakdown)
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
          let rows = activityQueryNoSourceNoTs.data ?? []
          rows = await mergeTodayActivityLogsByCivilDate(supabase, userId, today, activityIntelTimeZone, rows)
          const kept = filterActivityLogRowsForWearableDedupe(rows, activityIntelTimeZone)
          const todayBreakdown = computeActivityTotalsBreakdown(kept, {
            includeDebugContributingIds: process.env.NODE_ENV === 'development',
          })
          lastTodayTotalsBreakdown = todayBreakdown
          const totalSteps = todayBreakdown.totalSteps
          const mostRecentRow = pickMostRecentRowForDisplay(rows, kept, todayBreakdown)
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

    const profileResponse = await profilePromise

    const profileSleepGoalH = Math.min(
      12,
      Math.max(5, profileResponse.data?.sleep_goal_h ?? 7.5),
    )

    /** Overlap with weekly activity processing — only needs profile sleep goal. */
    const sleepDeficitForIntelPromise = getSleepDeficitForCircadian(supabase, userId, profileSleepGoalH)

    // Determine shift type using shared utility
    const standardType = toShiftType(currentShift?.label, currentShift?.start_ts)
    const shiftType = toActivityShiftType(standardType) as ShiftType

    // Parse shift times
    const shiftStart = currentShift?.start_ts ? new Date(currentShift.start_ts) : null
    const shiftEnd = currentShift?.end_ts ? new Date(currentShift.end_ts) : null

    const selectedDayStartMs = startOfLocalDayUtcMs(today, activityIntelTimeZone)
    const selectedDayEndMs = endOfLocalDayUtcMs(today, activityIntelTimeZone)
    const shiftStartMs = shiftStart?.getTime() ?? NaN
    const shiftEndMs = shiftEnd?.getTime() ?? NaN
    /** After local midnight, `today` is the new civil day — still include buckets from the shift start *date* so “before shift” isn’t empty. */
    const shiftStartCivilDayStartMs =
      shiftStart != null && Number.isFinite(shiftStartMs)
        ? startOfLocalDayUtcMs(formatYmdInTimeZone(shiftStart, activityIntelTimeZone), activityIntelTimeZone)
        : NaN
    const stepSamplesRangeStartMs = Number.isFinite(shiftStartMs)
      ? Math.min(
          selectedDayStartMs,
          Number.isFinite(shiftStartCivilDayStartMs) ? shiftStartCivilDayStartMs : selectedDayStartMs,
          shiftStartMs,
        )
      : selectedDayStartMs
    let stepSamplesRangeEndMs =
      Number.isFinite(shiftEndMs) ? Math.max(selectedDayEndMs, shiftEndMs) : selectedDayEndMs

    // Get activity level and calculate impacts
    const shiftActivityLevel = activityResponse.data?.shift_activity_level as ShiftActivityLevel | null | undefined
    const weightKg = profileResponse.data?.weight_kg ?? 75
    const steps = activityResponse.data?.steps ?? 0
    const activityDetails = getActivityLevelDetails(shiftActivityLevel)
    const estimatedCaloriesBurned = getEstimatedCaloriesBurned(shiftActivityLevel, weightKg)
    const activityImpact = getActivityImpactLabel(shiftActivityLevel)
    const recoverySuggestion = getRecoverySuggestion(shiftActivityLevel)

    // Generate shift movement plan
    const movementPlan = generateShiftMovementPlan(
      shiftType,
      shiftActivityLevel ?? null,
      shiftStart,
      shiftEnd,
      new Date()
    )

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const yesterdayIso = yesterday.toISOString().slice(0, 10)

    const sleepWindowCutoff = sevenDaysAgo.toISOString()
    const sleepSelect =
      'id, start_ts, end_ts, start_at, end_at, sleep_hours, quality, type, date'
    const [[sleepByEndTs, sleepByEndAt, previousShiftRes, sleepDeficitDataRes], weeklyActivityQuery] =
      await Promise.all([
        Promise.all([
          supabase
            .from('sleep_logs')
            .select(sleepSelect)
            .eq('user_id', userId)
            .gte('end_ts', sleepWindowCutoff)
            .order('end_ts', { ascending: false })
            .limit(12),
          supabase
            .from('sleep_logs')
            .select(sleepSelect)
            .eq('user_id', userId)
            .gte('end_at', sleepWindowCutoff)
            .order('end_at', { ascending: false })
            .limit(12),
          supabase.from('shifts').select('label').eq('user_id', userId).eq('date', yesterdayIso).maybeSingle(),
          supabase
            .from('shift_rhythm_scores')
            .select('total_score')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]),
        weeklyActivityLogsPromise,
      ])
    const mergedSleep = new Map<string, Record<string, unknown>>()
    const pushRows = (rows: unknown[] | null | undefined) => {
      for (const row of rows ?? []) {
        const r = row as Record<string, unknown>
        const id = String(r.id ?? `${r.start_at ?? r.start_ts ?? ''}|${r.end_at ?? r.end_ts ?? ''}`)
        if (id.replace(/\|/g, '')) mergedSleep.set(id, r)
      }
    }
    if (!sleepByEndTs.error) pushRows(sleepByEndTs.data)
    if (!sleepByEndAt.error) pushRows(sleepByEndAt.data)
    const recentSleepLogs = [...mergedSleep.values()]
      .sort((a, b) => {
        const endA = String(a.end_ts || a.end_at || '')
        const endB = String(b.end_ts || b.end_at || '')
        return Date.parse(endB) - Date.parse(endA)
      })
      .slice(0, 14)
    const previousShift = previousShiftRes.data
    const sleepDeficitData = sleepDeficitDataRes.data

    // Process sleep data (include main_sleep / post_shift_sleep from /api/sleep/log; support start_at/end_at.)
    const mainSleepLogs = (recentSleepLogs || []).filter((log: any) => rowCountsAsPrimarySleep(log))
    const lastSleep = mainSleepLogs[0]
    const lastSleepHours: number | null = lastSleep
      ? sleepHoursFromLogRow(lastSleep as RecentSleepLogRow)
      : null
    const lastSleepQuality =
      typeof lastSleep?.quality === 'number' && Number.isFinite(lastSleep.quality)
        ? lastSleep.quality
        : null
    const recentSleepHours = mainSleepLogs
      .slice(0, 7)
      .map((log: any) => sleepHoursFromLogRow(log as RecentSleepLogRow) ?? 0)
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

    let movementAfterShiftSleepWindowStartIso: string | null = null
    const mainSleepStartsForInfer: Date[] = []
    for (const log of mainSleepLogs as Array<Record<string, unknown>>) {
      const raw = log.start_ts ?? log.start_at
      if (!raw) continue
      const t = Date.parse(String(raw))
      if (Number.isFinite(t)) mainSleepStartsForInfer.push(new Date(t))
    }
    const inferShiftType =
      standardType === 'night' ? 'night' : standardType === 'off' ? 'off' : ('day' as const)
    const inferredMovementSleepStart = inferSleepWindowStartAfterShiftEnd({
      shiftEnd,
      timeZone: activityIntelTimeZone,
      shiftType: inferShiftType,
      mainSleepStarts: mainSleepStartsForInfer,
    })
    if (inferredMovementSleepStart) {
      movementAfterShiftSleepWindowStartIso = inferredMovementSleepStart.toISOString()
      const capMs = inferredMovementSleepStart.getTime()
      const padMs = 15 * 60 * 1000
      const anchorEnd = Number.isFinite(shiftEndMs) ? shiftEndMs : now.getTime()
      const maxExtendMs = anchorEnd + 84 * 3600000
      stepSamplesRangeEndMs = Math.max(stepSamplesRangeEndMs, Math.min(capMs + padMs, maxExtendMs))
    }

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

    const { data: weeklyShifts } = await weeklyShiftsPromise

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

    let weeklyLogs = (weeklyActivityQuery.data ?? []) as any[]
    // Manual sessions (and some wearables) may have `activity_date` set but NULL `ts`; ts-window queries miss them.
    const logsByActivityDate = await logsByActivityDateForWeeklyPromise
    if (logsByActivityDate.length) {
      weeklyLogs = mergeActivityLogRowsDedupe(weeklyLogs, logsByActivityDate)
    }
    // Rollout: legacy wearable rows (no activity_date) can duplicate new rows keyed by activity_date.
    const explicitWearableShiftedKeysByFamily = buildExplicitWearableShiftedKeysByFamily(
      weeklyLogs,
      activityIntelTimeZone,
    )

    const logsByCivilDate = new Map<string, any[]>()
    if (weeklyLogs.length > 0) {
      for (const log of weeklyLogs) {
        if (
          shouldSkipLegacyWearableActivityLogRow(log, activityIntelTimeZone, explicitWearableShiftedKeysByFamily)
        ) {
          continue
        }
        const logDate = resolveActivityLogCivilYmd(log as Record<string, unknown>, activityIntelTimeZone)
        if (!logDate || logDate < fourteenDaysAgoISO || logDate > today) continue
        const arr = logsByCivilDate.get(logDate) ?? []
        arr.push(log)
        logsByCivilDate.set(logDate, arr)
      }
    }

    const activityByDate = new Map<string, { steps: number; activeMinutes: number | null; source?: string }>()
    for (const [logDate, logs] of logsByCivilDate.entries()) {
      const kept = filterActivityLogRowsForWearableDedupe(logs, activityIntelTimeZone)
      const bd = computeActivityTotalsBreakdown(kept)
      const am = activeMinutesFromKeptRows(kept, bd.sourceOfTruth)
      const wearableRow = kept.find((r: any) => !isManualActivityRow(r.source))
      const source =
        bd.sourceOfTruth === 'wearable' && wearableRow?.source
          ? String(wearableRow.source)
          : 'Manual entry'
      activityByDate.set(logDate, {
        steps: bd.totalSteps,
        activeMinutes: am,
        source,
      })
    }

    const logsByShiftedDayKey = new Map<string, any[]>()
    if (weeklyLogs.length > 0) {
      for (const log of weeklyLogs) {
        if (
          shouldSkipLegacyWearableActivityLogRow(log, activityIntelTimeZone, explicitWearableShiftedKeysByFamily)
        ) {
          continue
        }
        const civil = resolveActivityLogCivilYmd(log as Record<string, unknown>, activityIntelTimeZone)
        if (!civil) continue
        const dayKey = activityDayKeyFromCivilActivityDate(civil, activityIntelTimeZone)
        const arr = logsByShiftedDayKey.get(dayKey) ?? []
        arr.push(log)
        logsByShiftedDayKey.set(dayKey, arr)
      }
    }

    const stepsByActivityDay: Record<string, number> = {}
    for (const [k, logs] of logsByShiftedDayKey.entries()) {
      const kept = filterActivityLogRowsForWearableDedupe(logs, activityIntelTimeZone)
      const bd = computeActivityTotalsBreakdown(kept)
      stepsByActivityDay[k] = bd.totalSteps
    }

    const currentActivityDayKey = activityDayKeyFromTimestamp(now, activityIntelTimeZone)
    const sleepDeficitForIntel = await sleepDeficitForIntelPromise
    const activityIntelligence = computeActivityIntelligence({
      currentActivityDayKey,
      stepsByActivityDay,
      weeklyDeficitHours: sleepDeficitForIntel?.weeklyDeficit ?? null,
      activityTimeZone: activityIntelTimeZone,
    })

    /** Shift-window totals can be 0 while civil/anchored `activityDaySteps` still has wearable totals — keep card/API metrics aligned. */
    const coherentSteps = Math.max(steps, activityIntelligence.activityDaySteps ?? 0)
    const hasMovementData = coherentSteps > 0 || (activeMinutes ?? 0) > 0

    const intensityBreakdown = calculateIntensityBreakdown(
      shiftActivityLevel ?? null,
      coherentSteps,
      activeMinutes,
      shiftType,
    )
    /** Wearable / Health Connect rows often omit `active_minutes` and `shift_activity_level`; breakdown already estimates minutes from steps. */
    const displayActiveMinutes = intensityBreakdown.totalActiveMinutes
    /** Rough steps-only kcal when we have no self-reported activity level (same order of magnitude as common trackers). */
    const displayEstimatedCaloriesBurned =
      estimatedCaloriesBurned > 0
        ? estimatedCaloriesBurned
        : coherentSteps > 0
          ? Math.round(coherentSteps * 0.04)
          : 0

    /** Midnight–midnight local `today` — Activity page hero only (shift window can span nights). */
    const civilHeroActivity = activityByDate.get(today) ?? {
      steps: 0,
      activeMinutes: null as number | null,
      source: 'Manual entry',
    }
    const heroCivilIntensityBreakdown = calculateIntensityBreakdown(
      null,
      civilHeroActivity.steps,
      civilHeroActivity.activeMinutes,
      shiftType,
    )
    const heroCivilEstimatedCaloriesBurned =
      civilHeroActivity.steps > 0 ? Math.round(civilHeroActivity.steps * 0.04) : 0
    const heroCivilCalendarDay = {
      ymd: today,
      steps: civilHeroActivity.steps,
      activeMinutes:
        heroCivilIntensityBreakdown.totalActiveMinutes > 0
          ? Math.round(heroCivilIntensityBreakdown.totalActiveMinutes)
          : Math.max(0, Math.round(civilHeroActivity.activeMinutes ?? 0)),
      intensityBreakdown: heroCivilIntensityBreakdown,
      estimatedCaloriesBurned: heroCivilEstimatedCaloriesBurned,
      source: civilHeroActivity.source,
    }

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
      todayStepsSoFar: coherentSteps,
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
          steps: coherentSteps,
          stepTarget: activityPersonalization.effectiveStepGoal,
          activeMinutes: displayActiveMinutes,
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

    const hourlyChartCivilYmds = civilYmdRangeInclusive(windowStartDate, windowEndDate, activityIntelTimeZone)
    const hourlyChartYmdMin = hourlyChartCivilYmds[0] ?? today
    const hourlyChartYmdMax = hourlyChartCivilYmds[hourlyChartCivilYmds.length - 1] ?? today

    const stepSamplesRangeValid =
      Number.isFinite(stepSamplesRangeStartMs) && Number.isFinite(stepSamplesRangeEndMs)
    const stepSamplesStartIso = stepSamplesRangeValid
      ? new Date(stepSamplesRangeStartMs).toISOString()
      : ''
    const stepSamplesEndIso = stepSamplesRangeValid
      ? new Date(stepSamplesRangeEndMs).toISOString()
      : ''

    async function fetchHourlyWindowLogs(): Promise<any> {
      let q: any = await supabase
        .from('activity_logs')
        .select('id, steps, merge_status, ts, created_at, activity_date, source')
        .eq('user_id', userId)
        .gte('ts', windowStartISO)
        .lte('ts', windowEndISO)
        .order('ts', { ascending: true })
      if (
        q.error &&
        (q.error.code === '42703' || String(q.error.message ?? '').includes('ts'))
      ) {
        q = await supabase
          .from('activity_logs')
          .select('id, steps, merge_status, ts, created_at, activity_date, source')
          .eq('user_id', userId)
          .gte('created_at', windowStartISO)
          .lte('created_at', windowEndISO)
          .order('created_at', { ascending: true })
      }
      return q
    }

    const hourlyByDatePromise = supabase
      .from('activity_logs')
      .select('id, steps, merge_status, ts, created_at, activity_date, source')
      .eq('user_id', userId)
      .gte('activity_date', hourlyChartYmdMin)
      .lte('activity_date', hourlyChartYmdMax)
      .order('ts', { ascending: true })

    const stepSamplesPromise =
      stepSamplesRangeValid && stepSamplesStartIso && stepSamplesEndIso
        ? supabase
            .from('wearable_step_samples')
            .select('bucket_start_utc, bucket_end_utc, steps')
            .eq('user_id', userId)
            .eq('source', 'health_connect')
            .gte('bucket_start_utc', stepSamplesStartIso)
            .lte('bucket_start_utc', stepSamplesEndIso)
            .order('bucket_start_utc', { ascending: true })
        : Promise.resolve({ data: [] as unknown[], error: null })

    const [hourlyQuery, hourlyByDate, stepSamplesQuery] = await Promise.all([
      fetchHourlyWindowLogs(),
      hourlyByDatePromise,
      stepSamplesPromise,
    ])

    let hourlyForChart: { steps: number; ts?: string | null; created_at?: string | null }[] = []
    if (!hourlyQuery.error) {
      let hourlyRows = hourlyQuery.data ?? []
      if (!hourlyByDate.error && hourlyByDate.data?.length) {
        hourlyRows = mergeActivityLogRowsDedupe(hourlyRows, hourlyByDate.data)
        hourlyRows.sort(
          (a: any, b: any) =>
            new Date(a.ts ?? a.created_at ?? 0).getTime() - new Date(b.ts ?? b.created_at ?? 0).getTime(),
        )
      }
      hourlyRows = filterActivityLogRowsToCivilYmdSet(
        hourlyRows as Record<string, unknown>[],
        hourlyChartCivilYmds,
        activityIntelTimeZone,
      ) as any[]
      const hourlyKept = filterActivityLogRowsForWearableDedupe(hourlyRows, activityIntelTimeZone)
      const hourlyBd = computeActivityTotalsBreakdown(hourlyKept)
      hourlyForChart = hourlyKept.map((r: any) => ({
        ...r,
        steps:
          hourlyBd.sourceOfTruth === 'wearable' && isManualActivityRow(r.source)
            ? 0
            : effectiveActivityLogSteps(r),
      }))
    }

    /** Align hourly chart with the same window as step queries (incl. pre-shift buffer). */
    const stepsByHourChartAnchor = shiftStart != null ? windowStartDate : null
    const stepsByHour = stepsByHourFromCumulativeLogs(
      hourlyForChart,
      activityIntelTimeZone,
      coherentSteps,
      stepsByHourChartAnchor
        ? { shiftStart: stepsByHourChartAnchor, shiftEnd: shiftEnd ?? now, now }
        : { shiftStart: null, shiftEnd: null, now },
    )

    let stepSamples: Array<{ timestamp: string; steps: number; endTimestamp?: string | null }> = []
    if (stepSamplesRangeValid && !stepSamplesQuery.error) {
      const rawRows = (stepSamplesQuery.data ?? []) as Array<{
        bucket_start_utc: string | null
        bucket_end_utc: string | null
        steps: number | null
      }>
      const mappedPre = rawRows
        .map((row) => {
          if (!row?.bucket_start_utc) return null
          const steps = typeof row.steps === 'number' && Number.isFinite(row.steps) ? Math.max(0, Math.round(row.steps)) : 0
          return { timestamp: row.bucket_start_utc, steps, endTimestamp: row.bucket_end_utc ?? null }
        })
        .filter((row): row is { timestamp: string; steps: number; endTimestamp: string | null } => row != null)
      let movementClipStartMs = startOfLocalDayUtcMs(today, activityIntelTimeZone)
      let movementClipEndExclusiveMs = startOfLocalDayUtcMs(
        addCalendarDaysToYmd(today, 1),
        activityIntelTimeZone,
      )
      if (shiftStart && shiftEnd) {
        const span = movementAllocationWindowFromShiftInstants(
          shiftStart,
          shiftEnd,
          activityIntelTimeZone,
        )
        if (span) {
          movementClipStartMs = Math.min(movementClipStartMs, span.startMs)
          movementClipEndExclusiveMs = Math.max(movementClipEndExclusiveMs, span.endExclusiveMs)
        }
      }
      const processed = processWearableStepSamplesForMovementCard({
        rawRows,
        dayStartMs: movementClipStartMs,
        dayEndExclusiveMs: movementClipEndExclusiveMs,
        coherentStepsHint: coherentSteps,
      })
      stepSamples = processed.map((s) => ({
        timestamp: s.timestamp,
        steps: s.steps,
        endTimestamp: s.endTimestamp ?? null,
      }))
      console.info('[movement-steps]', {
        source: 'api',
        cache: 'no-store',
        selectedYmd: today,
        tz: activityIntelTimeZone,
        shiftStart: shiftStart?.toISOString() ?? null,
        shiftEnd: shiftEnd?.toISOString() ?? null,
        clip: {
          dayStart: new Date(movementClipStartMs).toISOString(),
          dayEndExclusive: new Date(movementClipEndExclusiveMs).toISOString(),
        },
        queryRange: { stepSamplesStartIso, stepSamplesEndIso },
        rawBucketRows: rawRows.length,
        duplicateStartsInRaw: countDuplicateBucketStarts(mappedPre),
        clippedSamples: stepSamples.length,
        clippedStepsSum: stepSamples.reduce((a, s) => a + s.steps, 0),
      })
    }

    const payload = {
      steps: coherentSteps,
      activeMinutes: displayActiveMinutes,
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
      estimatedCaloriesBurned: displayEstimatedCaloriesBurned,
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
      /** Inferred main-sleep start after roster end; caps “after shift” on the movement card. */
      movementAfterShiftSleepWindowStartIso,
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
      stepSamples,
      /** ISO start of hour-slot 0 for `stepsByHour` when shift-aware; omit when civil clock buckets. */
      stepsByHourAnchorStart: stepsByHourChartAnchor?.toISOString() ?? null,
      shiftStepsLast7Days,
      activityTotalsBreakdown: toPublicActivityTotalsBreakdown(
        lastTodayTotalsBreakdown ?? computeActivityTotalsBreakdown([]),
        process.env.NODE_ENV === 'development',
      ),
      heroCivilCalendarDay,
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
          movementAfterShiftSleepWindowStartIso: null,
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
          stepSamples: [],
          stepsByHourAnchorStart: null,
          shiftStepsLast7Days: stubShiftStepsLast7Days(today),
          activityTotalsBreakdown: toPublicActivityTotalsBreakdown(computeActivityTotalsBreakdown([]), false),
          heroCivilCalendarDay: {
            ymd: today,
            steps: 0,
            activeMinutes: 0,
            intensityBreakdown: {
              light: { minutes: 0, target: 10 },
              moderate: { minutes: 0, target: 15 },
              vigorous: { minutes: 0, target: 5 },
              totalActiveMinutes: 0,
            },
            estimatedCaloriesBurned: 0,
            source: 'Not connected',
          },
        },
      },
      { status: 200, headers: ACTIVITY_TODAY_CACHE_HEADERS },
    )
  }
}
