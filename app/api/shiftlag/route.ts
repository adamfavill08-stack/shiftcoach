import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import * as SupabaseServer from '@/lib/supabase-server'
import { calculateShiftLag } from '@/lib/shiftlag/calculateShiftLag'
import { logSupabaseError } from '@/lib/supabase/error-handler'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shiftlag
 * Calculates and returns ShiftLag metrics for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? SupabaseServer.supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)

    // Fetch last 7 days of sleep logs
    let sleepLogs: any[] = []
    let sleepError: any = null
    
    // Try new schema first
    const sleepResult = await supabase
      .from('sleep_logs')
      .select('start_at, end_at, start_ts, end_ts, type, date')
      .eq('user_id', userId)
      .gte('start_at', sevenDaysAgo.toISOString())
      .order('start_at', { ascending: true })
      .limit(100)

    if (sleepResult.error) {
      sleepError = sleepResult.error
      // If it's a column error, try old schema
      if (sleepResult.error.message?.includes('start_at') || sleepResult.error.code === 'PGRST204') {
        console.log('[api/shiftlag] New schema failed, trying old schema')
      } else if (!sleepResult.error.message?.includes('relation')) {
        logSupabaseError('api/shiftlag', sleepResult.error, { level: 'warn' })
      }
    } else if (sleepResult.data) {
      sleepLogs = sleepResult.data
    }

    // If new schema doesn't work, try old schema
    if (sleepLogs.length === 0 && (sleepError?.message?.includes('start_at') || sleepError?.code === 'PGRST204')) {
      const oldSleepResult = await supabase
        .from('sleep_logs')
        .select('start_ts, end_ts, date, naps')
        .eq('user_id', userId)
        .gte('start_ts', sevenDaysAgo.toISOString())
        .order('start_ts', { ascending: true })
        .limit(100)

      if (!oldSleepResult.error && oldSleepResult.data) {
        sleepLogs = oldSleepResult.data.map((log: any) => ({
          start_at: log.start_ts,
          end_at: log.end_ts,
          type: (log.naps === 0 || !log.naps) ? 'sleep' : 'nap',
          date: log.date,
        }))
      }
    }

    // Aggregate sleep by day (last 7 days only)
    const sleepByDay = new Map<string, number>()
    const getLocalDateString = (dateStr: string | Date): string => {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Create set of valid dates (last 7 days)
    const validDates = new Set<string>()
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(d.getDate() + i)
      validDates.add(getLocalDateString(d))
    }

    for (const log of sleepLogs) {
      const startTime = log.start_at || log.start_ts
      const endTime = log.end_at || log.end_ts
      if (!startTime || !endTime) continue

      // Only count main sleep (not naps)
      const isMainSleep = log.type === 'sleep' || (log.naps === 0 || !log.naps)
      if (!isMainSleep) continue

      const start = new Date(startTime)
      const end = new Date(endTime)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

      const dateKey = log.date ? log.date.slice(0, 10) : getLocalDateString(endTime)
      
      // Only include dates from last 7 days
      if (!validDates.has(dateKey)) continue
      
      const existing = sleepByDay.get(dateKey) || 0
      sleepByDay.set(dateKey, existing + hours)
    }

    // Convert to array format, ensuring all 7 days are represented
    const sleepDays = Array.from(validDates).map(date => ({
      date,
      totalHours: sleepByDay.get(date) || 0,
    }))

    // If there are no actual sleep logs at all for the window, treat this as
    // "not enough data yet" instead of assuming maximum sleep debt.
    const hasAnySleep = sleepLogs.some(log => {
      const startTime = log.start_at || log.start_ts
      const endTime = log.end_at || log.end_ts
      if (!startTime || !endTime) return false
      const start = new Date(startTime)
      const end = new Date(endTime)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return hours > 0
    })

    // Fetch last 14 days of shifts (same table as calendar uses)
    let shiftDays: any[] = []
    const shiftResult = await supabase
      .from('shifts')
      .select('date, label, start_ts, end_ts, status')
      .eq('user_id', userId)
      .gte('date', fourteenDaysAgo.toISOString().slice(0, 10))
      .lte('date', today)
      .order('date', { ascending: true })

    if (shiftResult.error && !shiftResult.error.message?.includes('relation')) {
      console.error('[api/shiftlag] shift query error:', shiftResult.error)
    } else if (shiftResult.data) {
      shiftDays = shiftResult.data
      console.log('[api/shiftlag] Fetched shifts:', shiftDays.length, 'shifts from calendar')
    }

    // Get circadian midpoint from latest circadian_logs entry (if available)
    let circadianMidpoint: number | undefined
    const circadianResult = await supabase
      .from('circadian_logs')
      .select('sleep_midpoint_minutes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!circadianResult.error && circadianResult.data?.sleep_midpoint_minutes) {
      circadianMidpoint = circadianResult.data.sleep_midpoint_minutes
    }

    // If there is no actual sleep recorded at all, short‑circuit to a
    // "not enough data" state so new users start from 0 sleep debt.
    let metrics
    if (!hasAnySleep) {
      metrics = {
        score: 0,
        level: 'low' as const,
        sleepDebtScore: 0,
        misalignmentScore: 0,
        instabilityScore: 0,
        sleepDebtHours: 0,
        avgNightOverlapHours: 0,
        shiftStartVariabilityHours: 0,
        explanation: 'Track a few days of sleep and shifts to unlock your ShiftLag score.',
        drivers: {
          sleepDebt: 'No data',
          misalignment: 'No data',
          instability: 'No data',
        },
      }
    } else {
      // Calculate ShiftLag
      console.log('[api/shiftlag] Calculating with:', {
        sleepDaysCount: sleepDays.length,
        shiftDaysCount: shiftDays.length,
        circadianMidpoint,
      })
      
      try {
        metrics = calculateShiftLag(sleepDays, shiftDays, circadianMidpoint)
        
        console.log('[api/shiftlag] Calculated metrics:', {
          score: metrics.score,
          level: metrics.level,
          sleepDebt: metrics.sleepDebtHours,
          sleepDebtScore: metrics.sleepDebtScore,
          misalignmentScore: metrics.misalignmentScore,
          instabilityScore: metrics.instabilityScore,
          variabilityHours: metrics.shiftStartVariabilityHours,
          shiftsWithTimes: shiftDays.filter(s => s.start_ts || (s.label && s.label !== 'OFF')).length,
        })
      } catch (calcErr: any) {
        console.error('[api/shiftlag] Calculation error:', calcErr)
        // Return default metrics on calculation error
        metrics = {
          score: 0,
          level: 'low' as const,
          sleepDebtScore: 0,
          misalignmentScore: 0,
          instabilityScore: 0,
          sleepDebtHours: 0,
          avgNightOverlapHours: 0,
          shiftStartVariabilityHours: 0,
          explanation: 'Unable to calculate ShiftLag. Please try again.',
          drivers: {
            sleepDebt: 'No data',
            misalignment: 'No data',
            instability: 'No data',
          },
        }
      }
    }

    // Store in shiftlag_logs (non-blocking)
    try {
      await supabase
        .from('shiftlag_logs')
        .upsert({
          user_id: userId,
          date: today,
          score: metrics.score,
          level: metrics.level,
          sleep_debt_score: metrics.sleepDebtScore,
          misalignment_score: metrics.misalignmentScore,
          instability_score: metrics.instabilityScore,
          sleep_debt_hours_7d: metrics.sleepDebtHours,
          avg_night_overlap_hours: metrics.avgNightOverlapHours,
          shift_start_variability_hours: metrics.shiftStartVariabilityHours,
        }, {
          onConflict: 'user_id,date',
        })
    } catch (logErr: any) {
      // Non-blocking - table might not exist yet
      console.warn('[api/shiftlag] Failed to log ShiftLag (non-blocking):', logErr?.message || logErr)
    }

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err: any) {
    console.error('[api/shiftlag] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    
    return NextResponse.json(
      { 
        error: err?.message || 'Unknown server error',
        details: err?.details,
      },
      { status: 500 }
    )
  }
}
