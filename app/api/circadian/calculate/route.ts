import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateCircadianPhase, type ShiftType } from '@/lib/circadian/calcCircadianPhase'
import { getSleepDeficitForCircadian } from '@/lib/circadian/sleep'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    console.log('[api/circadian/calculate] Starting request...')
    
    let supabase: any
    let userId: string | null = null
    let isDevFallback = false
    
    try {
      console.log('[api/circadian/calculate] Getting Supabase client...')
      const result = await getServerSupabaseAndUserId()
      supabase = result.supabase
      userId = result.userId
      isDevFallback = result.isDevFallback
      console.log('[api/circadian/calculate] Got client, userId:', userId, 'isDevFallback:', isDevFallback)
    } catch (authError: any) {
      console.error('[api/circadian/calculate] Failed to get Supabase client:', {
        name: authError?.name,
        message: authError?.message,
        stack: authError?.stack,
      })
      return NextResponse.json(
        { 
          error: 'Authentication error',
          details: authError?.message || 'Failed to initialize database connection'
        },
        { status: 500 }
      )
    }
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    // This is needed because RLS policies check auth.uid(), which is null without a real session
    let dbClient: any
    try {
      if (isDevFallback) {
        console.log('[api/circadian/calculate] Using supabaseServer (dev fallback)')
        dbClient = supabaseServer
      } else {
        console.log('[api/circadian/calculate] Using authenticated supabase client')
        dbClient = supabase
      }
    } catch (clientError: any) {
      console.error('[api/circadian/calculate] Failed to get dbClient:', {
        name: clientError?.name,
        message: clientError?.message,
        stack: clientError?.stack,
      })
      return NextResponse.json(
        { 
          error: 'Database client error',
          details: clientError?.message || 'Failed to initialize database client'
        },
        { status: 500 }
      )
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const todayDateString = today.toISOString().slice(0, 10) // YYYY-MM-DD format

    // Fast path: if we already have a recent circadian_logs row for this user,
    // reuse it instead of recalculating. This keeps behavior the same but moves
    // the heavy work off the request path when the precompute cron has run.
    console.log('[api/circadian/calculate] Checking for precomputed data...')
    let precomputed: any
    try {
      precomputed = await dbClient
        .from('circadian_logs')
        .select(
          'sleep_midpoint_minutes,deviation_hours,circadian_phase,alignment_score,latest_shift,sleep_duration,sleep_timing,sleep_debt,inconsistency,created_at',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (precomputed.error) {
        const errorMessage = precomputed.error.message || String(precomputed.error)
        const isNetworkError = errorMessage.includes('fetch failed') || 
                              errorMessage.includes('ETIMEDOUT') || 
                              errorMessage.includes('EHOSTUNREACH') ||
                              errorMessage.includes('ECONNREFUSED')
        
        if (isNetworkError) {
          console.error('[api/circadian/calculate] Network error on precomputed query - database unreachable')
          return NextResponse.json({ 
            error: 'Database temporarily unavailable',
            details: 'Unable to connect to database. Please check your internet connection and try again.',
            type: 'network_error'
          }, { status: 503 })
        }
        
        console.warn('[api/circadian/calculate] Precomputed query error (non-fatal):', precomputed.error.message)
      } else {
        console.log('[api/circadian/calculate] Precomputed query result:', precomputed.data ? 'found' : 'not found')
      }
    } catch (precomputedError: any) {
      const errorMessage = precomputedError?.message || String(precomputedError)
      const isNetworkError = errorMessage.includes('fetch failed') || 
                            errorMessage.includes('ETIMEDOUT') || 
                            errorMessage.includes('EHOSTUNREACH') ||
                            errorMessage.includes('ECONNREFUSED')
      
      if (isNetworkError) {
        console.error('[api/circadian/calculate] Network error on precomputed query - database unreachable')
        return NextResponse.json({ 
          error: 'Database temporarily unavailable',
          details: 'Unable to connect to database. Please check your internet connection and try again.',
          type: 'network_error'
        }, { status: 503 })
      }
      
      console.error('[api/circadian/calculate] Precomputed query exception:', {
        name: precomputedError?.name,
        message: precomputedError?.message,
        stack: precomputedError?.stack,
      })
      // Continue with fallback path for non-network errors
      precomputed = { error: precomputedError, data: null }
    }

    if (!precomputed.error && precomputed.data) {
      const createdAt = precomputed.data.created_at
      const createdDate = createdAt ? new Date(createdAt) : null
      const isToday =
        createdDate &&
        createdDate.getFullYear() === today.getFullYear() &&
        createdDate.getMonth() === today.getMonth() &&
        createdDate.getDate() === today.getDate()

      if (isToday) {
        const circadian = {
          circadianPhase: precomputed.data.circadian_phase,
          alignmentScore: precomputed.data.alignment_score,
          factors: {
            latestShift: precomputed.data.latest_shift,
            sleepDuration: precomputed.data.sleep_duration,
            sleepTiming: precomputed.data.sleep_timing,
            sleepDebt: precomputed.data.sleep_debt,
            inconsistency: precomputed.data.inconsistency,
          },
        }

        return NextResponse.json({ circadian }, { status: 200 })
      }
    }

    // Fallback path: no usable precomputed row for today, so we calculate
    // circadian metrics on-demand exactly as before.
    console.log('[api/circadian/calculate] Using fallback path - calculating on-demand')
    const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
    console.log('[api/circadian/calculate] Fetching sleep logs from:', fourteenDaysAgo.toISOString())

    // Fetch ALL sleep logs (both main sleep and naps) - try new schema first
    let sleepLogs: any[] = []
    let sleepError: any = null

    // Try new schema (type, start_at, end_at)
    console.log('[api/circadian/calculate] Trying new schema (start_at, end_at)...')
    let newSchemaResult: any
    try {
      newSchemaResult = await dbClient
        .from('sleep_logs')
        .select('type, start_at, end_at')
        .eq('user_id', userId)
        .gte('start_at', fourteenDaysAgo.toISOString())
        .order('start_at', { ascending: false })
        .limit(100)
      
      if (newSchemaResult.error) {
        const errorMessage = newSchemaResult.error.message || String(newSchemaResult.error)
        const isNetworkError = errorMessage.includes('fetch failed') || 
                              errorMessage.includes('ETIMEDOUT') || 
                              errorMessage.includes('EHOSTUNREACH') ||
                              errorMessage.includes('ECONNREFUSED')
        
        if (isNetworkError) {
          console.error('[api/circadian/calculate] Network error on new schema query - database unreachable')
          // Continue to try old schema, but if that also fails, we'll return 503
        } else {
          console.warn('[api/circadian/calculate] New schema query error:', newSchemaResult.error.message)
        }
      } else {
        console.log('[api/circadian/calculate] New schema result:', newSchemaResult.data?.length || 0, 'records')
      }
    } catch (newSchemaException: any) {
      const errorMessage = newSchemaException?.message || String(newSchemaException)
      const isNetworkError = errorMessage.includes('fetch failed') || 
                            errorMessage.includes('ETIMEDOUT') || 
                            errorMessage.includes('EHOSTUNREACH') ||
                            errorMessage.includes('ECONNREFUSED')
      
      if (isNetworkError) {
        console.error('[api/circadian/calculate] Network error on new schema query - will try old schema')
        // Continue to try old schema
      } else {
        console.error('[api/circadian/calculate] New schema query exception:', {
          name: newSchemaException?.name,
          message: newSchemaException?.message,
          stack: newSchemaException?.stack,
        })
      }
      newSchemaResult = { error: newSchemaException, data: null }
    }

    if (!newSchemaResult.error && newSchemaResult.data && newSchemaResult.data.length > 0) {
      // New schema found - normalize the data
      sleepLogs = newSchemaResult.data.map((log: any) => ({
        type: log.type,
        start_ts: log.start_at,
        end_ts: log.end_at,
        isMain: log.type === 'sleep',
        isNap: log.type === 'nap',
      }))
    } else {
      // Try old schema (start_ts, end_ts, naps, sleep_hours)
      console.log('[api/circadian/calculate] Trying old schema (start_ts, end_ts)...')
      let oldSchemaResult: any
      try {
        oldSchemaResult = await dbClient
          .from('sleep_logs')
          .select('start_ts, end_ts, sleep_hours, naps')
          .eq('user_id', userId)
          .gte('start_ts', fourteenDaysAgo.toISOString())
          .order('start_ts', { ascending: false })
          .limit(100)

      if (oldSchemaResult.error) {
        console.error('[api/circadian/calculate] Old schema query error:', oldSchemaResult.error.message)
        
        // Check if it's a network error
        const errorMessage = oldSchemaResult.error.message || String(oldSchemaResult.error)
        const isNetworkError = errorMessage.includes('fetch failed') || 
                              errorMessage.includes('ETIMEDOUT') || 
                              errorMessage.includes('EHOSTUNREACH') ||
                              errorMessage.includes('ECONNREFUSED')
        
        if (isNetworkError) {
          console.error('[api/circadian/calculate] Network error - database unreachable')
          return NextResponse.json({ 
            error: 'Database temporarily unavailable',
            details: 'Unable to connect to database. Please check your internet connection and try again.',
            type: 'network_error'
          }, { status: 503 })
        }
        
        const { logSupabaseError } = await import('@/lib/supabase/error-handler')
        logSupabaseError('api/circadian/calculate', oldSchemaResult.error, { level: 'warn' })
        return NextResponse.json({ 
          error: 'Failed to fetch sleep data',
          details: oldSchemaResult.error.message 
        }, { status: 500 })
      } else {
        console.log('[api/circadian/calculate] Old schema result:', oldSchemaResult.data?.length || 0, 'records')
      }
    } catch (oldSchemaException: any) {
      console.error('[api/circadian/calculate] Old schema query exception:', {
        name: oldSchemaException?.name,
        message: oldSchemaException?.message,
        stack: oldSchemaException?.stack,
      })
      
      // Check if it's a network error
      const errorMessage = oldSchemaException?.message || String(oldSchemaException)
      const isNetworkError = errorMessage.includes('fetch failed') || 
                            errorMessage.includes('ETIMEDOUT') || 
                            errorMessage.includes('EHOSTUNREACH') ||
                            errorMessage.includes('ECONNREFUSED')
      
      if (isNetworkError) {
        console.error('[api/circadian/calculate] Network error - database unreachable')
        return NextResponse.json({ 
          error: 'Database temporarily unavailable',
          details: 'Unable to connect to database. Please check your internet connection and try again.',
          type: 'network_error'
        }, { status: 503 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch sleep data',
        details: oldSchemaException?.message || String(oldSchemaException)
      }, { status: 500 })
    }

      if (oldSchemaResult.data && oldSchemaResult.data.length > 0) {
        // Old schema - normalize the data
        sleepLogs = oldSchemaResult.data.map((log: any) => ({
          type: log.naps === 0 || !log.naps ? 'sleep' : 'nap',
          start_ts: log.start_ts,
          end_ts: log.end_ts,
          sleep_hours: log.sleep_hours,
          isMain: log.naps === 0 || !log.naps,
          isNap: log.naps > 0,
        }))
      }
    }

    if (!sleepLogs || sleepLogs.length === 0) {
      return NextResponse.json(
        {
          error: 'No sleep data available',
          circadian: null,
        },
        { status: 200 },
      )
    }

    // Separate main sleep and naps
    const mainSleepLogs = sleepLogs.filter(log => log.isMain)
    const napLogs = sleepLogs.filter(log => log.isNap)

    if (mainSleepLogs.length === 0) {
      return NextResponse.json({ 
        error: 'No main sleep data available',
        circadian: null 
      }, { status: 200 })
    }

    // Get latest main sleep for timing calculations
    const latestSleep = mainSleepLogs[0]
    if (!latestSleep.start_ts || !latestSleep.end_ts) {
      return NextResponse.json({ 
        error: 'Latest sleep missing start/end times',
        circadian: null 
      }, { status: 200 })
    }

    const sleepStart = new Date(latestSleep.start_ts)
    const sleepEnd = new Date(latestSleep.end_ts)
    
    // Calculate duration of latest main sleep
    const sleepDurationHours = latestSleep.sleep_hours ?? 
      (sleepEnd.getTime() - sleepStart.getTime()) / (1000 * 60 * 60)

    // Calculate averages and variance from last 7-14 days of MAIN SLEEP ONLY
    const recentMainSleep = mainSleepLogs.slice(0, Math.min(14, mainSleepLogs.length))
    
    const bedtimes: number[] = []
    const wakeTimes: number[] = []
    const mainDurations: number[] = []

    for (const log of recentMainSleep) {
      if (!log.start_ts || !log.end_ts) continue
      const start = new Date(log.start_ts)
      const end = new Date(log.end_ts)
      
      // Convert to minutes from midnight
      const bedtimeMin = start.getHours() * 60 + start.getMinutes()
      const wakeTimeMin = end.getHours() * 60 + end.getMinutes()
      
      bedtimes.push(bedtimeMin)
      wakeTimes.push(wakeTimeMin)
      
      const duration = log.sleep_hours ?? (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      mainDurations.push(duration)
    }

    if (bedtimes.length === 0) {
      return NextResponse.json({ 
        error: 'Insufficient sleep data',
        circadian: null 
      }, { status: 200 })
    }

    // Calculate averages for main sleep timing
    const avgBedtime = Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length)
    const avgWakeTime = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length)

    // Calculate bedtime variance (standard deviation) for main sleep only
    const bedtimeMean = avgBedtime
    const variance = bedtimes.reduce((sum, bt) => {
      const diff = Math.abs(bt - bedtimeMean)
      // Handle wrap-around (e.g., 23:00 vs 01:00 = 2 hours, not 22 hours)
      const wrappedDiff = Math.min(diff, 1440 - diff)
      return sum + (wrappedDiff * wrappedDiff)
    }, 0) / bedtimes.length
    const bedtimeVariance = Math.round(Math.sqrt(variance))

    // Calculate sleep debt using sleep deficit helper
    // This ensures consistency with /api/sleep/deficit
    let sleepDeficit = null
    let sleepDebtHours = 0
    try {
      sleepDeficit = await getSleepDeficitForCircadian(dbClient, userId, 7.5)
      sleepDebtHours = sleepDeficit ? Math.max(0, sleepDeficit.weeklyDeficit) : 0
      
      console.log('[api/circadian/calculate] Sleep deficit:', {
        weeklyDeficit: sleepDeficit?.weeklyDeficit,
        category: sleepDeficit?.category,
        sleepDebtHours,
      })
    } catch (deficitError: any) {
      console.warn('[api/circadian/calculate] Failed to calculate sleep deficit:', deficitError?.message || deficitError)
      // Continue with default value
      sleepDebtHours = 0
    }

    // Get latest shift to determine shift type
    const { data: shifts, error: shiftError } = await dbClient
      .from('shifts')
      .select('label, start_ts, date')
      .eq('user_id', userId)
      .lte('date', todayDateString)
      .order('date', { ascending: false })
      .limit(7)

    let shiftType: ShiftType = 'day' // default

    if (!shiftError && shifts && shifts.length > 0) {
      // Find the most recent non-OFF shift
      const latestShift = shifts.find(s => s.label && s.label !== 'OFF')
      
      if (latestShift) {
        try {
          // Use shared utility for consistent classification
          const { toShiftType } = await import('@/lib/shifts/toShiftType')
          shiftType = toShiftType(
            latestShift.label,
            latestShift.start_ts,
            true, // check for rotating pattern
            shifts
          ) as ShiftType
        } catch (importError: any) {
          console.warn('[api/circadian/calculate] Failed to import toShiftType:', importError?.message || importError)
          // Fallback: use simple classification based on label
          const labelLower = (latestShift.label || '').toLowerCase()
          if (labelLower.includes('night')) {
            shiftType = 'night'
          } else if (labelLower.includes('late') || labelLower.includes('evening')) {
            shiftType = 'late'
          } else {
            shiftType = 'day'
          }
        }
      }
    }

    // Build input and calculate
    const input = {
      sleepStart,
      sleepEnd,
      avgBedtime,
      avgWakeTime,
      bedtimeVariance,
      sleepDurationHours,
      sleepDebtHours,
      shiftType,
    }

    let circadian
    try {
      circadian = calculateCircadianPhase(input)
    } catch (calcError: any) {
      console.error('[api/circadian/calculate] Failed to calculate circadian phase:', calcError)
      throw new Error(`Circadian calculation failed: ${calcError?.message || String(calcError)}`)
    }

    // Optionally log to circadian_logs table (non-blocking)
    try {
      const midpointMinutes = (sleepStart.getTime() + sleepEnd.getTime()) / 2 / (1000 * 60)
      const midpointMod = ((midpointMinutes % 1440) + 1440) % 1440
      const idealMidpoint = 3 * 60 // 03:00
      let deviation = Math.abs(midpointMod - idealMidpoint)
      deviation = Math.min(deviation, 1440 - deviation)
      const deviationHours = deviation / 60

      const { error: logError } = await dbClient
        .from('circadian_logs')
        .insert({
          user_id: userId,
          sleep_midpoint_minutes: Math.round(midpointMod),
          deviation_hours: Math.round(deviationHours * 10) / 10,
          circadian_phase: circadian.circadianPhase,
          alignment_score: circadian.alignmentScore,
          latest_shift: circadian.factors.latestShift,
          sleep_duration: circadian.factors.sleepDuration,
          sleep_timing: circadian.factors.sleepTiming,
          sleep_debt: circadian.factors.sleepDebt,
          inconsistency: circadian.factors.inconsistency,
        })

      if (logError) {
        // Non-blocking - table might not exist yet
        console.log(
          '[api/circadian/calculate] Failed to log circadian data (table may not exist):',
          logError.message
        )
      }
    } catch (err: any) {
      // Non-blocking - unexpected error
      console.log(
        '[api/circadian/calculate] Failed to log circadian data (unexpected):',
        err?.message ?? err
      )
    }

    return NextResponse.json({ circadian }, { status: 200 })
  } catch (err: any) {
    console.error('[api/circadian/calculate] FATAL ERROR:', err)
    console.error('[api/circadian/calculate] Error stack:', err?.stack)
    
    // Ensure we always return a valid JSON response
    try {
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: err?.message || String(err),
          type: 'unexpected_error'
        },
        { status: 500 }
      )
    } catch (responseError: any) {
      // If even creating the response fails, return a minimal error
      console.error('[api/circadian/calculate] Failed to create error response:', responseError)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Internal server error',
          type: 'response_serialization_error'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}
