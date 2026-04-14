import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import * as SupabaseServer from '@/lib/supabase-server'
import { calculateShiftRhythm, type SleepLogInput } from '@/lib/shift-rhythm/engine'
import { buildShiftRhythmInputs } from '@/lib/shift-rhythm/buildShiftRhythmInputs'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'
import { getTodayHydrationIntake } from '@/lib/nutrition/getTodayHydrationIntake'
import { calculateSleepDeficit } from '@/lib/sleep/calculateSleepDeficit'
import { getSocialJetlagMetrics } from '@/lib/circadian/socialJetlag'
import { calculateBingeRisk } from '@/lib/binge/calculateBingeRisk'
import { calculateFatigueRisk, type FatigueRiskResult } from '@/lib/fatigue/calculateFatigueRisk'
import { fetchShiftContext, fatigueGuidanceFromContext } from '@/lib/shift-context'
import type { ShiftRhythmScores } from '@/lib/shift-rhythm/scoring'
// Cache for 60 seconds - shift rhythm scores update daily
export const revalidate = 60
type ApiShiftScore = ShiftRhythmScores & { date: string; activity_score: number | null }
const DEFAULT_FATIGUE_RISK: FatigueRiskResult = {
  score: 20,
  level: 'low',
  drivers: ['Not enough recent sleep and shift data yet'],
  explanation: 'Low fatigue risk for now. Keep logging sleep and shifts to improve accuracy.',
  confidence: 0.25,
  confidenceLabel: 'low',
}

function deriveRecoveryFromSleepDeficitDaily(
  daily: Array<{ actual?: number }> | undefined | null,
): number | null {
  if (!Array.isArray(daily) || daily.length === 0) return null
  const actuals = daily
    .map((d) => (typeof d?.actual === 'number' && Number.isFinite(d.actual) ? d.actual : null))
    .filter((v): v is number => v !== null && v > 0)
  if (actuals.length === 0) return null
  const recent = actuals.slice(0, Math.min(3, actuals.length))
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length
  const clamped = Math.min(Math.max(avg, 4), 9)
  const pct = (clamped - 4) / 5
  return Math.round(35 + pct * 55) // 4h=>35, 9h=>90
}

function deriveShiftFitFromJetlagCategory(
  category: 'low' | 'moderate' | 'high' | undefined,
): number | null {
  if (category === 'low') return 80
  if (category === 'moderate') return 55
  if (category === 'high') return 30
  return null
}

function deriveRegularityFromJetlag(
  category: 'low' | 'moderate' | 'high' | undefined,
  misalignmentHours: number | undefined,
): number | null {
  if (typeof misalignmentHours === 'number' && Number.isFinite(misalignmentHours)) {
    const clamped = Math.min(Math.max(misalignmentHours, 0), 6)
    const ratio = clamped / 6
    return Math.round(85 - ratio * 60) // 0h=>85, 6h=>25
  }
  if (category === 'low') return 78
  if (category === 'moderate') return 52
  if (category === 'high') return 30
  return null
}

function isLongTermShiftWorkerProfile(shiftPattern: string | null | undefined): boolean {
  return shiftPattern === 'rotating' || shiftPattern === 'mostly_nights' || shiftPattern === 'custom'
}

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    
    // Check for force recalculation parameter
    const searchParams = req.nextUrl.searchParams
    const forceRecalculate = searchParams.get('force') === 'true'

    // Try to get today's score and yesterday's score for comparison
    const [{ data: existing, error: fetchErr }, { data: yesterdayScore }, { data: profile }] = await Promise.all([
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
      supabase
        .from('profiles')
        .select('shift_pattern')
        .eq('user_id', userId)
        .maybeSingle(),
    ])
    const applyShiftWorkerCap = isLongTermShiftWorkerProfile((profile as any)?.shift_pattern ?? null)

    if (fetchErr) {
      const { logSupabaseError } = await import('@/lib/supabase/error-handler')
      logSupabaseError('api/shift-rhythm', fetchErr, { level: 'warn' })
      
      // If table doesn't exist, return null instead of error
      if (fetchErr.message?.includes('relation') || fetchErr.message?.includes('does not exist')) {
        console.warn('[/api/shift-rhythm] Table does not exist yet:', fetchErr.message)
        return NextResponse.json({ score: null, fatigueRisk: DEFAULT_FATIGUE_RISK }, { status: 200 })
      }
    }

    let score: ApiShiftScore | null = existing && !forceRecalculate
      ? {
          date: existing.date,
          sleep_score: existing.sleep_score ?? 0,
          regularity_score:
            existing.regularity_score === null || existing.regularity_score === undefined
              ? null
              : Number(existing.regularity_score),
          shift_pattern_score: existing.shift_pattern_score ?? 0,
          recovery_score: existing.recovery_score ?? null,
          nutrition_score: existing.nutrition_score ?? null,
          activity_score: existing.activity_score ?? null,
          movement_score: existing.movement_score ?? null,
          meal_timing_score: existing.meal_timing_score ?? null,
          sleep_composite: existing.sleep_composite ?? null,
          circadian_debt: existing.circadian_debt ?? 0,
          circadian_debt_trend: existing.circadian_debt_trend ?? 'stable',
          total_score: existing.total_score ?? 0,
        }
      : null

    // Self-heal old cached rows from earlier duration parsing issues:
    // if today's cached recovery is zero but recent sleep exists, force recalculation.
    let forceRecalculateFromSuspiciousCache = false
    if (existing && !forceRecalculate) {
      const suspiciousRecovery = existing.recovery_score === 0 || existing.recovery_score == null

      if (suspiciousRecovery) {
        try {
          const probeInputs = await buildShiftRhythmInputs(supabaseServer, userId)
          const hasRecentSleepForRecalc = probeInputs.sleepLogs.some(
            (s: SleepLogInput) => s.durationHours > 0,
          )
          if (hasRecentSleepForRecalc) {
            forceRecalculateFromSuspiciousCache = true
            score = null
            console.log(
              '[/api/shift-rhythm] Suspicious cached recovery=0 detected with real sleep logs, forcing recalculation',
            )
          }
        } catch (probeErr) {
          console.warn('[/api/shift-rhythm] Probe recalc check failed, keeping cached score', probeErr)
        }
      }
    }

    let hasRhythmData = true

    // If no score or force recalculation, calculate and store it
    if (!score || forceRecalculate || forceRecalculateFromSuspiciousCache) {
      console.log('[/api/shift-rhythm] No score for today, calculating…')
      try {
        const inputs = await buildShiftRhythmInputs(supabaseServer, userId)

        const hasMeaningfulSleep = inputs.sleepLogs.some((s: SleepLogInput) => s.durationHours > 0)
        const hasMeaningfulShifts = inputs.shiftDays.length > 0
        hasRhythmData = hasMeaningfulSleep || hasMeaningfulShifts

        // If there is no real sleep or shift data yet, return a neutral zero score
        // so new users don't see an arbitrary mid-range value.
        if (!hasRhythmData) {
          score = {
            date: today,
            sleep_score: 0,
            regularity_score: null,
            shift_pattern_score: 0,
            recovery_score: null,
            nutrition_score: null,
            activity_score: null,
            movement_score: null,
            meal_timing_score: null,
            sleep_composite: null,
            circadian_debt: 0,
            circadian_debt_trend: 'stable' as const,
            total_score: 0,
          }
        } else {
          const scores = calculateShiftRhythm(inputs)

          const upsertPayload = {
            user_id: userId,
            date: today,
            sleep_score: scores.sleep_score,
            regularity_score: scores.regularity_score,
            shift_pattern_score: scores.shift_pattern_score,
            recovery_score: scores.recovery_score,
            total_score: scores.total_score,
            circadian_debt: scores.circadian_debt,
            circadian_debt_trend: scores.circadian_debt_trend,
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
              return NextResponse.json({ score: null, fatigueRisk: DEFAULT_FATIGUE_RISK }, { status: 200 })
            }

            // If RLS blocks insert (common when RLS is strict), log and continue WITHOUT failing the request.
            // We'll still return the calculated score so the UI can render rings, we just won't persist it.
            if (upsertErr.code === '42501' || upsertErr.message?.includes('row-level security')) {
              console.warn('[/api/shift-rhythm] RLS prevented saving score; returning calculated score only.')
            } else {
              return NextResponse.json(
                { error: 'Failed to save shift rhythm score', details: upsertErr.message },
                { status: 500 }
              )
            }
          }

          score = {
            date: inserted?.date ?? today,
            sleep_score: scores.sleep_score,
            regularity_score: scores.regularity_score,
            shift_pattern_score: scores.shift_pattern_score,
            recovery_score: scores.recovery_score,
            nutrition_score: scores.nutrition_score,
            activity_score: scores.activity_score,
            movement_score: scores.movement_score,
            meal_timing_score: scores.meal_timing_score,
            sleep_composite: scores.sleep_composite,
            circadian_debt: scores.circadian_debt,
            circadian_debt_trend: scores.circadian_debt_trend,
            total_score: scores.total_score,
          }
        }
      } catch (calcErr: any) {
        console.error('[/api/shift-rhythm] Calculation error:', calcErr)
        // Return null if calculation fails, don't crash
        return NextResponse.json({ score: null, fatigueRisk: DEFAULT_FATIGUE_RISK }, { status: 200 })
      }
    }

    // Resolved shift context (today / next shift–aware) for jetlag copy + fatigue blending
    let shiftContextBundle = null
    try {
      shiftContextBundle = await fetchShiftContext(supabase, userId)
    } catch {
      shiftContextBundle = null
    }

    // Calculate social jetlag
    let socialJetlag = null
    try {
      console.log('[api/shift-rhythm] Calculating social jetlag for user:', userId)
      const jetlagMetrics = await getSocialJetlagMetrics(supabase, userId, shiftContextBundle)
      
      // Only include social jetlag if it has valid data (not default/error metrics)
      // Valid data means: has a category and explanation doesn't contain error messages
      const explanation = jetlagMetrics.explanation || ''
      const hasError = explanation.includes('No sleep') || 
                      explanation.includes('Not enough') || 
                      explanation.includes('Failed to fetch') ||
                      explanation.includes('need at least') ||
                      explanation.includes('No main sleep') ||
                      explanation.includes('Not enough baseline')
      
      // Valid data: has category and no error in explanation
      // Note: currentMisalignmentHours can be 0 (which means low jetlag - still valid!)
      const hasValidData = !hasError && 
                          jetlagMetrics.category && 
                          jetlagMetrics.currentMisalignmentHours !== undefined &&
                          jetlagMetrics.currentMisalignmentHours >= 0
      
      if (hasValidData) {
        socialJetlag = {
          currentMisalignmentHours: jetlagMetrics.currentMisalignmentHours,
          weeklyAverageMisalignmentHours: jetlagMetrics.weeklyAverageMisalignmentHours,
          baselineMidpointClock: jetlagMetrics.baselineMidpointClock,
          currentMidpointClock: jetlagMetrics.currentMidpointClock,
          category: jetlagMetrics.category,
          explanation: jetlagMetrics.explanation,
        }
        console.log('[api/shift-rhythm] Calculated social jetlag:', {
          category: jetlagMetrics.category,
          misalignment: jetlagMetrics.currentMisalignmentHours,
          explanation: jetlagMetrics.explanation,
        })
      } else {
        console.log('[api/shift-rhythm] Social jetlag not available:', jetlagMetrics.explanation)
        // Don't include socialJetlag in response if it's just an error message
      }
    } catch (err: any) {
      console.error('[/api/shift-rhythm] Error calculating social jetlag:', {
        error: err?.message,
        stack: err?.stack,
      })
      // Continue without social jetlag if calculation fails
    }

    // Calculate sleep deficit
    let sleepDeficit = null
    try {
      const { supabase: deficitSupabase, isDevFallback: deficitIsDev } = await getServerSupabaseAndUserId()
      const deficitSupabaseClient = deficitIsDev ? SupabaseServer.supabaseServer : deficitSupabase
      
      const now = new Date()
      const sevenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)
      
      const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      const getLocalDateFromISO = (isoString: string): string => {
        const date = new Date(isoString)
        return getLocalDateString(date)
      }
      
      const minutesBetween = (a: string | Date, b: string | Date) => {
        return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
      }
      
      // Fetch sleep data for last 7 days
      let weekLogs: any[] = []
      let weekResult = await deficitSupabaseClient
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('start_at', sevenAgo.toISOString())
        .order('start_at', { ascending: true })
      
      weekLogs = weekResult.data || []
      
      if (weekResult.error && (weekResult.error.message?.includes("start_at") || weekResult.error.code === 'PGRST204')) {
        weekResult = await deficitSupabaseClient
          .from('sleep_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('start_ts', sevenAgo.toISOString())
          .order('start_ts', { ascending: true })
        weekLogs = weekResult.data || []
      }
      
      // Aggregate by day
      const byDay: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
        const key = getLocalDateString(d)
        byDay[key] = 0
      }
      
      for (const row of weekLogs ?? []) {
        const endTime = row.end_at || row.end_ts
        const startTime = row.start_at || row.start_ts
        if (!endTime || !startTime) continue
        
        let key: string
        if (row.date) {
          key = row.date.slice(0, 10)
        } else {
          key = getLocalDateFromISO(endTime)
        }
        
        if (byDay[key] !== undefined) {
          byDay[key] += minutesBetween(startTime, endTime)
        }
      }
      
      const sleepData = Object.entries(byDay).map(([date, totalMinutes]) => ({
        date,
        totalMinutes,
      }))
      
      sleepDeficit = calculateSleepDeficit(sleepData, 7.5)
      console.log('[api/shift-rhythm] Calculated sleep deficit:', sleepDeficit.category, sleepDeficit.weeklyDeficit)
    } catch (deficitErr) {
      console.warn('[api/shift-rhythm] Failed to calculate sleep deficit:', deficitErr)
      // Continue without deficit data
    }

    // Recovery fallback: when rhythm engine couldn't ingest sleep rows but sleep-deficit has
    // real daily actual sleep values, derive recovery from that observed sleep.
    if (score && (score.recovery_score === null || score.recovery_score === undefined)) {
      const derivedRecovery = deriveRecoveryFromSleepDeficitDaily(sleepDeficit?.daily)
      if (derivedRecovery != null) {
        score.recovery_score = derivedRecovery
      }
    }

    // Shift-fit fallback: if native shift_pattern_score is missing/zero but social jetlag has
    // a valid category, derive a conservative alignment score so UI doesn't show a false empty state.
    if (score && (score.shift_pattern_score === null || score.shift_pattern_score <= 0)) {
      const derivedShiftFit = deriveShiftFitFromJetlagCategory(
        (socialJetlag?.category as 'low' | 'moderate' | 'high' | undefined),
      )
      if (derivedShiftFit != null) {
        score.shift_pattern_score = derivedShiftFit
      }
    }

    // Bedtime consistency fallback: if native regularity scoring is unavailable,
    // derive from social jetlag alignment so the row reflects real circadian data.
    if (score && (score.regularity_score === null || score.regularity_score === undefined)) {
      const derivedRegularity = deriveRegularityFromJetlag(
        (socialJetlag?.category as 'low' | 'moderate' | 'high' | undefined),
        socialJetlag?.currentMisalignmentHours,
      )
      if (derivedRegularity != null) {
        score.regularity_score = derivedRegularity
      }
    }

    if (score && typeof score.total_score === 'number' && applyShiftWorkerCap) {
      score.total_score = Math.min(score.total_score, 75)
    }

    // Calculate fatigue risk from consolidated sleep/shift/circadian signals
    let fatigueRisk: FatigueRiskResult = DEFAULT_FATIGUE_RISK
    try {
      const fatigueInputs = await buildShiftRhythmInputs(supabaseServer, userId)
      fatigueRisk = calculateFatigueRisk({
        sleepLogs: fatigueInputs.sleepLogs.map((s: any) => ({
          durationHours: s.durationHours,
          quality: s.quality ?? null,
          start: s.start,
          end: s.end,
        })),
        shifts: fatigueInputs.shiftDays.map((s: any) => ({ type: s.type })),
        weeklySleepDebtHours: sleepDeficit?.weeklyDeficit ?? undefined,
        socialJetlag: socialJetlag
          ? {
              currentMisalignmentHours: socialJetlag.currentMisalignmentHours,
              weeklyAverageMisalignmentHours: socialJetlag.weeklyAverageMisalignmentHours,
              category: socialJetlag.category,
            }
          : null,
        now: new Date(),
        shiftGuidance:
          fatigueGuidanceFromContext(fatigueInputs.shiftContext ?? shiftContextBundle) ?? undefined,
      })
    } catch (fatigueErr) {
      console.warn('[api/shift-rhythm] Fatigue risk fallback applied:', fatigueErr)
      fatigueRisk = DEFAULT_FATIGUE_RISK
    }

    // Calculate binge risk
    let bingeRisk = null
    try {
      console.log('[api/shift-rhythm] Starting binge risk calculation...')
      
      // Always use service role client for binge risk (most reliable, bypasses RLS)
      // This ensures we always have a valid Supabase client regardless of auth state
      const bingeRiskSupabaseClient = supabaseServer
      
      // Verify the client is valid before using it
      if (!bingeRiskSupabaseClient) {
        throw new Error('Supabase service role client is not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable.')
      }
      if (typeof bingeRiskSupabaseClient.from !== 'function') {
        console.error('[api/shift-rhythm] Service role client validation failed:', {
          clientType: typeof bingeRiskSupabaseClient,
          clientKeys: Object.keys(bingeRiskSupabaseClient || {}),
          hasFrom: 'from' in (bingeRiskSupabaseClient || {}),
          constructor: bingeRiskSupabaseClient?.constructor?.name
        })
        throw new Error('Invalid Supabase service role client: missing .from() method')
      }
      
      console.log('[api/shift-rhythm] Using Supabase service role client for binge risk calculation')
      
      const inputs = await buildShiftRhythmInputs(bingeRiskSupabaseClient, userId)
      console.log('[api/shift-rhythm] Built inputs, sleepLogs:', inputs.sleepLogs.length, 'shiftDays:', inputs.shiftDays.length)
      
      const now = new Date()
      
      // Meal logging removed - using advice-only approach
      // Prepare data for binge risk calculation
      // Sort sleep logs by most recent first (they should already be sorted, but ensure it)
      const sortedSleepLogs = [...inputs.sleepLogs].sort((a, b) => {
        const dateA = new Date(a.end || a.start).getTime()
        const dateB = new Date(b.end || b.start).getTime()
        return dateB - dateA
      })
      
      // Sort shifts by date descending (most recent first)
      const sortedShifts = [...inputs.shiftDays].sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      
      // No meals logged - empty array for binge risk calculation
      const sortedMeals: any[] = []
      
      // Fetch today's activity level for binge risk
      const today = now.toISOString().slice(0, 10)
      const startOfDay = new Date(today + 'T00:00:00Z')
      const endOfDay = new Date(today + 'T23:59:59Z')
      
      let activityQuery = await bingeRiskSupabaseClient
        .from('activity_logs')
        .select('shift_activity_level,ts')
        .eq('user_id', userId)
        .gte('ts', startOfDay.toISOString())
        .lt('ts', endOfDay.toISOString())
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      // Fallback to created_at if ts doesn't exist
      if (activityQuery.error && (activityQuery.error.code === '42703' || activityQuery.error.message?.includes('ts'))) {
        activityQuery = await bingeRiskSupabaseClient
          .from('activity_logs')
          .select('shift_activity_level,created_at')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      }
      
      const todayActivityLevel = activityQuery.data?.shift_activity_level as 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null | undefined
      
      const bingeRiskInputs = {
        sleepLogs: sortedSleepLogs.map((s: any) => ({
          date: s.date,
          start: s.start,
          end: s.end,
          durationHours: s.durationHours,
          quality: s.quality ?? null,
        })),
        shifts: sortedShifts.map((s: any) => ({
          date: s.date,
          type: s.type,
        })),
        meals: sortedMeals,
        now,
        sleepDebtHours: sleepDeficit?.weeklyDeficit ?? undefined,
        shiftLagScore: score?.total_score ? (100 - score.total_score) : undefined, // Inverse of shift rhythm score
        activityLevel: todayActivityLevel ?? undefined,
      }
      
      console.log('[api/shift-rhythm] Binge risk inputs:', {
        sleepLogsCount: bingeRiskInputs.sleepLogs.length,
        shiftsCount: bingeRiskInputs.shifts.length,
        mealsCount: bingeRiskInputs.meals.length,
        hasSleepDebt: bingeRiskInputs.sleepDebtHours !== undefined,
        hasShiftLag: bingeRiskInputs.shiftLagScore !== undefined,
      })
      
      console.log('[api/shift-rhythm] Calling calculateBingeRisk...')
      bingeRisk = calculateBingeRisk(bingeRiskInputs)
      console.log('[api/shift-rhythm] calculateBingeRisk returned:', {
        type: typeof bingeRisk,
        isNull: bingeRisk === null,
        isUndefined: bingeRisk === undefined,
        value: bingeRisk
      })
      console.log('[api/shift-rhythm] Calculated binge risk:', JSON.stringify(bingeRisk, null, 2))
      
      // Validate bingeRisk result - ensure it has all required fields
      if (!bingeRisk) {
        console.error('[api/shift-rhythm] calculateBingeRisk returned null/undefined, creating fallback')
        bingeRisk = {
          score: 0,
          level: 'low' as const,
          drivers: ['Insufficient data for calculation'],
          explanation: 'Unable to calculate binge risk due to missing data.'
        }
      } else if (typeof bingeRisk.score !== 'number' || !bingeRisk.level || !Array.isArray(bingeRisk.drivers) || !bingeRisk.explanation) {
        console.error('[api/shift-rhythm] Invalid binge risk result structure, creating fallback:', {
          hasScore: typeof bingeRisk.score === 'number',
          scoreValue: bingeRisk.score,
          hasLevel: !!bingeRisk.level,
          levelValue: bingeRisk.level,
          hasDrivers: Array.isArray(bingeRisk.drivers),
          driversValue: bingeRisk.drivers,
          hasExplanation: !!bingeRisk.explanation,
          explanationValue: bingeRisk.explanation,
          actualValue: bingeRisk
        })
        // Create a valid fallback result
        bingeRisk = {
          score: typeof bingeRisk.score === 'number' ? bingeRisk.score : 0,
          level: (bingeRisk.level || 'low') as 'low' | 'medium' | 'high',
          drivers: Array.isArray(bingeRisk.drivers) ? bingeRisk.drivers : ['Calculation error'],
          explanation: bingeRisk.explanation || 'Binge risk calculation completed with limited data.'
        }
      } else {
        console.log('[api/shift-rhythm] Binge risk validation passed:', {
          score: bingeRisk.score,
          level: bingeRisk.level,
          driversCount: bingeRisk.drivers.length,
          hasExplanation: !!bingeRisk.explanation
        })
      }
    } catch (bingeErr: any) {
      console.error('[api/shift-rhythm] Failed to calculate binge risk:', bingeErr)
      console.error('[api/shift-rhythm] Binge risk error name:', bingeErr?.name || 'Unknown')
      console.error('[api/shift-rhythm] Binge risk error message:', bingeErr?.message || String(bingeErr))
      console.error('[api/shift-rhythm] Binge risk error stack:', bingeErr?.stack || 'No stack trace')
      
      // Check if it's specifically the supabase.from error
      const errorMessage = bingeErr?.message || String(bingeErr)
      if (errorMessage.includes('supabase.from is not a function') || errorMessage.includes('.from is not a function')) {
        console.error('[api/shift-rhythm] CRITICAL: Supabase client initialization failed. Check SUPABASE_SERVICE_ROLE_KEY env variable.')
      }
      
      // Provide a fallback result instead of null
      bingeRisk = {
        score: 0,
        level: 'low' as const,
        drivers: ['Calculation error'],
        explanation: `Unable to calculate binge risk: ${errorMessage}`
      }
    }
    
    // Ensure bingeRisk is always set (should never be null now)
    // If it's still null at this point, set a fallback
    if (bingeRisk === null || bingeRisk === undefined) {
      console.warn('[api/shift-rhythm] bingeRisk is null/undefined before response, setting fallback')
      bingeRisk = {
        score: 0,
        level: 'low' as const,
        drivers: ['No data available'],
        explanation: 'Binge risk calculation is not available at this time.'
      }
    }

    // Include yesterday's score, sleep deficit, social jetlag, and binge risk for comparison
    const response: any = { score, sleepDeficit, socialJetlag, fatigueRisk, bingeRisk, hasRhythmData }
    if (yesterdayScore?.total_score !== undefined) {
      response.yesterdayScore = yesterdayScore.total_score
    }

    // Double-check that bingeRisk is in the response (should never be null now)
    if (response.bingeRisk === null || response.bingeRisk === undefined) {
      console.error('[api/shift-rhythm] CRITICAL: bingeRisk is still null/undefined in response object!')
      response.bingeRisk = {
        score: 0,
        level: 'low',
        drivers: ['System error'],
        explanation: 'Binge risk calculation failed. Please try again later.'
      }
    }

    console.log('[api/shift-rhythm] Final response bingeRisk:', {
      hasBingeRisk: !!response.bingeRisk,
      bingeRisk: response.bingeRisk,
      bingeRiskType: typeof response.bingeRisk,
      bingeRiskIsNull: response.bingeRisk === null,
      score: response.bingeRisk?.score,
      level: response.bingeRisk?.level,
    })

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
  if (!userId) return buildUnauthorizedResponse()

  try {
    const inputs = await buildShiftRhythmInputs(supabaseServer, userId)
    const scores = calculateShiftRhythm(inputs)

    const upsertPayload = {
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      sleep_score: scores.sleep_score,
      regularity_score: scores.regularity_score,
      shift_pattern_score: scores.shift_pattern_score,
      recovery_score: scores.recovery_score,
      total_score: scores.total_score,
      circadian_debt: scores.circadian_debt,
      circadian_debt_trend: scores.circadian_debt_trend,
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
          ...scores,
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



