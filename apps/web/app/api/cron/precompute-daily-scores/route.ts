import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import * as SupabaseServer from '@/lib/supabase-server'
import { buildShiftRhythmInputs } from '@/app/api/shift-rhythm/route'
import { calculateShiftRhythm } from '@/lib/shift-rhythm/engine'
import { calculateShiftLag } from '@/lib/shiftlag/calculateShiftLag'
import { calculateCircadianPhase } from '@/lib/circadian/calcCircadianPhase'
import { getSleepDeficitForCircadian } from '@/lib/circadian/sleep'

/**
 * POST /api/cron/precompute-daily-scores
 *
 * This endpoint is intended to be called from a scheduled job (e.g. Vercel Cron)
 * once per day. It precomputes the same scores that the dashboard APIs expose:
 *
 * - /api/shift-rhythm       -> shift_rhythm_scores
 * - /api/shiftlag           -> shiftlag_logs
 * - /api/circadian/calculate -> circadian_logs
 *
 * Behavior: it should NOT change what end-users see. The dashboard APIs will
 * continue to fall back to on-demand calculations if a precomputed row is
 * missing. This job just moves heavy work off the request path.
 */
export async function POST(req: NextRequest) {
  try {
    // Protect this endpoint similarly to /api/subscription/process-deletions:
    const vercelCronHeader = req.headers.get('x-vercel-cron')
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    const isVercelCron = vercelCronHeader === '1'
    const isValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isVercelCron && !isValidSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - must be called by Vercel Cron or with valid secret' },
        { status: 401 },
      )
    }

    // Use service-role Supabase so we can iterate users safely
    const { supabase: authSupabase, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? SupabaseServer.supabaseServer : authSupabase

    const today = new Date().toISOString().slice(0, 10)

    // Find distinct active users from profiles (lightweight; adjust if you later add an "active" flag).
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')

    if (profileError) {
      console.error('[cron/precompute-daily-scores] Failed to load profiles:', profileError)
      return NextResponse.json(
        { error: 'Failed to load profiles', details: profileError.message },
        { status: 500 },
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, message: 'No profiles found', processed: 0 })
    }

    let processed = 0
    const errors: string[] = []

    for (const profile of profiles) {
      const userId = profile.user_id as string | null
      if (!userId) continue

      try {
        // Reuse the existing shift rhythm input builder so logic stays identical.
        const inputs = await buildShiftRhythmInputs(supabase, userId)
        const shiftResult = calculateShiftRhythm(inputs)

        await supabase
          .from('shift_rhythm_scores')
          .upsert(
            {
              user_id: userId,
              date: today,
              sleep_score: shiftResult.sleep_score,
              regularity_score: shiftResult.regularity_score,
              shift_pattern_score: shiftResult.shift_pattern_score,
              recovery_score: shiftResult.recovery_score,
              total_score: shiftResult.total_score,
            },
            { onConflict: 'user_id,date' },
          )

        // For ShiftLag we mimic /api/shiftlag logic but only store the final metrics.
        const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)

        const sleepResult = await supabase
          .from('sleep_logs')
          .select('start_at, end_at, start_ts, end_ts, type, date, naps')
          .eq('user_id', userId)
          .gte('start_at', sevenDaysAgo.toISOString())
          .order('start_at', { ascending: true })
          .limit(100)

        const sleepLogs = (sleepResult.data ?? []).map((log: any) => ({
          start_at: log.start_at ?? log.start_ts,
          end_at: log.end_at ?? log.end_ts,
          type: log.type ?? (log.naps === 0 || !log.naps ? 'sleep' : 'nap'),
          date: log.date,
          naps: log.naps,
        }))

        const shiftResultDays = await supabase
          .from('shifts')
          .select('date, label, start_ts, end_ts, status')
          .eq('user_id', userId)
          .gte('date', fourteenDaysAgo.toISOString().slice(0, 10))
          .lte('date', today)
          .order('date', { ascending: true })

        const shiftDays = shiftResultDays.data ?? []

        // Aggregate sleep by day (same as /api/shiftlag)
        const sleepByDay = new Map<string, number>()
        const getLocalDateString = (dateStr: string | Date): string => {
          const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const validDates = new Set<string>()
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo)
          d.setDate(d.getDate() + i)
          validDates.add(getLocalDateString(d))
        }

        for (const log of sleepLogs) {
          const startTime = log.start_at
          const endTime = log.end_at
          if (!startTime || !endTime) continue

          const isMainSleep = log.type === 'sleep' || (log.naps === 0 || !log.naps)
          if (!isMainSleep) continue

          const start = new Date(startTime)
          const end = new Date(endTime)
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

          const dateKey = log.date ? String(log.date).slice(0, 10) : getLocalDateString(endTime)
          if (!validDates.has(dateKey)) continue

          const existing = sleepByDay.get(dateKey) || 0
          sleepByDay.set(dateKey, existing + hours)
        }

        const sleepDays = Array.from(validDates).map((date) => ({
          date,
          totalHours: sleepByDay.get(date) || 0,
        }))

        const circadianResult = await supabase
          .from('circadian_logs')
          .select('sleep_midpoint_minutes')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const circadianMidpoint = circadianResult.data?.sleep_midpoint_minutes

        const shiftLagMetrics = calculateShiftLag(sleepDays, shiftDays, circadianMidpoint)

        await supabase
          .from('shiftlag_logs')
          .upsert(
            {
              user_id: userId,
              date: today,
              score: shiftLagMetrics.score,
              level: shiftLagMetrics.level,
              sleep_debt_score: shiftLagMetrics.sleepDebtScore,
              misalignment_score: shiftLagMetrics.misalignmentScore,
              instability_score: shiftLagMetrics.instabilityScore,
              sleep_debt_hours_7d: shiftLagMetrics.sleepDebtHours,
              avg_night_overlap_hours: shiftLagMetrics.avgNightOverlapHours,
              shift_start_variability_hours: shiftLagMetrics.shiftStartVariabilityHours,
            },
            { onConflict: 'user_id,date' },
          )

        // Circadian: reuse the same logic as /api/circadian/calculate but only store the final values.
        const fourteenDaysAgoCircadian = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)

        let sleepLogsCircadian: any[] = []
        const newSchemaResult = await supabase
          .from('sleep_logs')
          .select('type, start_at, end_at, sleep_hours, naps')
          .eq('user_id', userId)
          .gte('start_at', fourteenDaysAgoCircadian.toISOString())
          .order('start_at', { ascending: false })
          .limit(100)

        if (!newSchemaResult.error && newSchemaResult.data && newSchemaResult.data.length > 0) {
          sleepLogsCircadian = newSchemaResult.data.map((log: any) => ({
            type: log.type ?? (log.naps === 0 || !log.naps ? 'sleep' : 'nap'),
            start_ts: log.start_at,
            end_ts: log.end_at,
            sleep_hours: log.sleep_hours,
            isMain: log.type === 'sleep' || log.naps === 0 || !log.naps,
            isNap: log.type === 'nap' || log.naps > 0,
          }))
        }

        if (sleepLogsCircadian.length > 0) {
          const mainSleepLogs = sleepLogsCircadian.filter((log) => log.isMain)
          if (mainSleepLogs.length > 0) {
            const latestSleep = mainSleepLogs[0]
            if (latestSleep.start_ts && latestSleep.end_ts) {
              const sleepStart = new Date(latestSleep.start_ts)
              const sleepEnd = new Date(latestSleep.end_ts)
              const sleepDurationHours =
                latestSleep.sleep_hours ??
                (sleepEnd.getTime() - sleepStart.getTime()) / (1000 * 60 * 60)

              const recentMainSleep = mainSleepLogs.slice(
                0,
                Math.min(14, mainSleepLogs.length),
              )

              const bedtimes: number[] = []
              const wakeTimes: number[] = []
              const mainDurations: number[] = []

              for (const log of recentMainSleep) {
                if (!log.start_ts || !log.end_ts) continue
                const start = new Date(log.start_ts)
                const end = new Date(log.end_ts)

                const bedtimeMin = start.getHours() * 60 + start.getMinutes()
                const wakeTimeMin = end.getHours() * 60 + end.getMinutes()

                bedtimes.push(bedtimeMin)
                wakeTimes.push(wakeTimeMin)

                const duration =
                  log.sleep_hours ?? (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                mainDurations.push(duration)
              }

              if (bedtimes.length > 0) {
                const avgBedtime = Math.round(
                  bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length,
                )
                const avgWakeTime = Math.round(
                  wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length,
                )

                const bedtimeMean = avgBedtime
                const variance =
                  bedtimes.reduce((sum, bt) => {
                    const diff = Math.abs(bt - bedtimeMean)
                    const wrappedDiff = Math.min(diff, 1440 - diff)
                    return sum + wrappedDiff * wrappedDiff
                  }, 0) / bedtimes.length
                const bedtimeVariance = Math.round(Math.sqrt(variance))

                const sleepDeficit = await getSleepDeficitForCircadian(
                  supabase,
                  userId,
                  7.5,
                )
                const sleepDebtHours = sleepDeficit
                  ? Math.max(0, sleepDeficit.weeklyDeficit)
                  : 0

                const input = {
                  sleepStart,
                  sleepEnd,
                  avgBedtime,
                  avgWakeTime,
                  bedtimeVariance,
                  sleepDurationHours,
                  sleepDebtHours,
                  shiftType: 'day' as const,
                }

                const circadian = calculateCircadianPhase(input)

                const midpointMinutes =
                  (sleepStart.getTime() + sleepEnd.getTime()) / 2 / (1000 * 60)
                const midpointMod = ((midpointMinutes % 1440) + 1440) % 1440

                await supabase.from('circadian_logs').insert({
                  user_id: userId,
                  sleep_midpoint_minutes: Math.round(midpointMod),
                  deviation_hours: null,
                  circadian_phase: circadian.circadianPhase,
                  alignment_score: circadian.alignmentScore,
                  latest_shift: circadian.factors.latestShift,
                  sleep_duration: circadian.factors.sleepDuration,
                  sleep_timing: circadian.factors.sleepTiming,
                  sleep_debt: circadian.factors.sleepDebt,
                  inconsistency: circadian.factors.inconsistency,
                })
              }
            }
          }
        }

        processed++
      } catch (err: any) {
        console.error(
          '[cron/precompute-daily-scores] Error processing user',
          userId,
          err,
        )
        errors.push(`${userId}: ${err?.message || String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors: errors.length ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[cron/precompute-daily-scores] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}


