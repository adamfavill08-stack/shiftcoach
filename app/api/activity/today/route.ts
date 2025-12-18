import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
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
import { toShiftType, toActivityShiftType } from '@/lib/shifts/toShiftType'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  const today = new Date().toISOString().slice(0, 10)
  const startOfDay = new Date(today + 'T00:00:00Z')
  const endOfDay = new Date(today + 'T23:59:59Z')

  try {
    // Calculate date ranges once for reuse
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    // Try to get today's activity - use timestamp filtering since 'date' column may not exist
    let activityResponse: any = { data: null, error: null }
    let activeMinutes: number | null = null

    // Strategy 1: Try with all columns using timestamp filter
    activityResponse = await supabase
      .from('activity_logs')
      .select('steps,active_minutes,source,ts,shift_activity_level')
      .eq('user_id', userId)
      .gte('ts', startOfDay.toISOString())
      .lt('ts', endOfDay.toISOString())
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Strategy 2: If ts doesn't exist, try created_at
    if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('ts'))) {
      activityResponse = await supabase
        .from('activity_logs')
        .select('steps,active_minutes,source,created_at,shift_activity_level')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    }

    // Strategy 3: If active_minutes doesn't exist, remove it
    if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('active_minutes'))) {
      console.warn('[/api/activity/today] active_minutes column missing, falling back without it')
      activityResponse = await supabase
        .from('activity_logs')
        .select('steps,source,ts,shift_activity_level')
        .eq('user_id', userId)
        .gte('ts', startOfDay.toISOString())
        .lt('ts', endOfDay.toISOString())
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('ts'))) {
        activityResponse = await supabase
          .from('activity_logs')
          .select('steps,source,created_at,shift_activity_level')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      }
    }

    // Strategy 4: If source doesn't exist, remove it
    if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('source'))) {
      console.warn('[/api/activity/today] source column missing, falling back without it')
      activityResponse = await supabase
        .from('activity_logs')
        .select('steps,ts,shift_activity_level')
        .eq('user_id', userId)
        .gte('ts', startOfDay.toISOString())
        .lt('ts', endOfDay.toISOString())
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (activityResponse.error && (activityResponse.error.code === '42703' || activityResponse.error.message?.includes('ts'))) {
        activityResponse = await supabase
          .from('activity_logs')
          .select('steps,created_at,shift_activity_level')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
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
      .select('daily_steps_goal, weight_kg')
      .eq('user_id', userId)
      .maybeSingle()

    // Get today's shift to determine shift type and timing
    const { data: todayShift } = await supabase
      .from('shifts')
      .select('label, date, start_ts, end_ts')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    // Determine shift type using shared utility
    const standardType = toShiftType(todayShift?.label, todayShift?.start_ts)
    const shiftType = toActivityShiftType(standardType) as ShiftType

    // Parse shift times
    const shiftStart = todayShift?.start_ts ? new Date(todayShift.start_ts) : null
    const shiftEnd = todayShift?.end_ts ? new Date(todayShift.end_ts) : null

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

    // Calculate activity score
    const activityScoreResult = hasMovementData
      ? calculateActivityScore({
          steps,
          stepTarget: profileResponse.data?.daily_steps_goal ?? 10000,
          activeMinutes,
          activeMinutesTarget:
            intensityBreakdown.light.target +
            intensityBreakdown.moderate.target +
            intensityBreakdown.vigorous.target,
          intensityBreakdown,
          shiftType,
          shiftActivityLevel: shiftActivityLevel ?? null,
        })
      : {
          score: 0,
          level: 'Low',
          description: 'Log steps or connect a wearable to see how your daily movement compares to your target.',
        }

    // Fetch weekly activity data for movement consistency (last 7 days)
    // Reuse sevenDaysAgo from sleep data fetch above
    const sevenDaysAgoISO = sevenDaysAgo.toISOString().slice(0, 10)
    
    // Fetch activity logs for last 7 days
    // Query weekly activity - handle both ts and created_at columns
    let weeklyActivityQuery: any = await supabase
      .from('activity_logs')
      .select('steps, active_minutes, source, ts, shift_activity_level')
      .eq('user_id', userId)
      .gte('ts', sevenDaysAgo.toISOString())
      .order('ts', { ascending: true })

    // Fallback to created_at if ts doesn't exist
    if (weeklyActivityQuery.error && (weeklyActivityQuery.error.code === '42703' || weeklyActivityQuery.error.message?.includes('ts'))) {
      weeklyActivityQuery = await supabase
        .from('activity_logs')
        .select('steps, active_minutes, source, created_at, shift_activity_level')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
    }

    // Get shifts for the last 7 days to determine shift types
    const { data: weeklyShifts } = await supabase
      .from('shifts')
      .select('date, label')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgoISO)
      .lte('date', today)
      .order('date', { ascending: true })

    // Build shift type map using shared utility
    const shiftTypeMap = new Map<string, 'day' | 'night' | 'off' | 'other'>()
    if (weeklyShifts) {
      weeklyShifts.forEach(shift => {
        const standardType = toShiftType(shift.label, shift.start_ts)
        const type = toActivityShiftType(standardType) as 'day' | 'night' | 'off' | 'other'
        shiftTypeMap.set(shift.date, type)
      })
    }

    // Process weekly activity data
    const weeklyActivityData: DailyActivityData[] = []
    const activityByDate = new Map<string, { steps: number; activeMinutes: number | null; source?: string }>()

    // Group activity by date
    if (weeklyActivityQuery.data) {
      weeklyActivityQuery.data.forEach((log: any) => {
        const logDate = log.ts ? new Date(log.ts).toISOString().slice(0, 10) 
                      : log.created_at ? new Date(log.created_at).toISOString().slice(0, 10)
                      : null
        
        if (logDate && logDate >= sevenDaysAgoISO && logDate <= today) {
          const existing = activityByDate.get(logDate)
          if (existing) {
            // Sum steps and take max active minutes for the day
            existing.steps += log.steps ?? 0
            if (log.active_minutes !== null && (existing.activeMinutes === null || log.active_minutes > existing.activeMinutes)) {
              existing.activeMinutes = log.active_minutes
            }
            // Prefer wearable source if available
            if (log.source && log.source !== 'Manual entry' && existing.source === 'Manual entry') {
              existing.source = log.source
            }
          } else {
            activityByDate.set(logDate, {
              steps: log.steps ?? 0,
              activeMinutes: log.active_minutes ?? null,
              source: log.source ?? 'Manual entry',
            })
          }
        }
      })
    }

    // Build daily data array for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      
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

    // Calculate movement consistency
    const movementConsistency = calculateMovementConsistency(weeklyActivityData)

    const payload = {
      steps,
      activeMinutes,
      lastSyncedAt: null, // Column doesn't exist in database
      source: activityResponse.data?.source ?? 'Manual entry',
      goal: profileResponse.data?.daily_steps_goal ?? 10000,
      date: today,
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
    }

    return NextResponse.json({ activity: payload }, { status: 200 })
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
        },
      },
      { status: 200 },
    )
  }
}
