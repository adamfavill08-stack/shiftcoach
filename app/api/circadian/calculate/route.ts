import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateCircadianPhase, type ShiftType } from '@/lib/circadian/calcCircadianPhase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get last 14 days of sleep data for averages
    const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
    const today = new Date()

    // Fetch ALL sleep logs (both main sleep and naps) - try new schema first
    let sleepLogs: any[] = []
    let sleepError: any = null

    // Try new schema (type, start_at, end_at)
    const newSchemaResult = await supabase
      .from('sleep_logs')
      .select('type, start_at, end_at')
      .eq('user_id', userId)
      .gte('start_at', fourteenDaysAgo.toISOString())
      .order('start_at', { ascending: false })
      .limit(100)

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
      const oldSchemaResult = await supabase
        .from('sleep_logs')
        .select('start_ts, end_ts, sleep_hours, naps')
        .eq('user_id', userId)
        .gte('start_ts', fourteenDaysAgo.toISOString())
        .order('start_ts', { ascending: false })
        .limit(100)

      if (oldSchemaResult.error) {
        console.error('[api/circadian/calculate] sleep query error:', oldSchemaResult.error)
        return NextResponse.json({ error: 'Failed to fetch sleep data' }, { status: 500 })
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
      return NextResponse.json({ 
        error: 'No sleep data available',
        circadian: null 
      }, { status: 200 })
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

    // Calculate sleep debt using MAIN SLEEP + NAPS combined
    // Get last 7 days of all sleep (main + naps)
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    const allRecentSleep = sleepLogs.filter(log => {
      const logDate = new Date(log.start_ts || log.end_ts)
      return logDate >= sevenDaysAgo
    })

    // Calculate total sleep hours from main sleep + naps over last 7 days
    let totalSleepHours = 0
    for (const log of allRecentSleep) {
      if (!log.start_ts || !log.end_ts) continue
      const start = new Date(log.start_ts)
      const end = new Date(log.end_ts)
      const duration = log.sleep_hours ?? (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      totalSleepHours += duration
    }

    // Calculate sleep debt
    const idealHoursPerNight = 7.5
    const numberOfDays = 7
    const expectedSleepHours = idealHoursPerNight * numberOfDays
    const sleepDebtHours = Math.max(0, expectedSleepHours - totalSleepHours)

    // Get latest shift to determine shift type
    const { data: shifts, error: shiftError } = await supabase
      .from('shifts')
      .select('label, start_ts, date')
      .eq('user_id', userId)
      .lte('date', today.toISOString().slice(0, 10))
      .order('date', { ascending: false })
      .limit(7)

    let shiftType: ShiftType = 'day' // default

    if (!shiftError && shifts && shifts.length > 0) {
      // Find the most recent non-OFF shift
      const latestShift = shifts.find(s => s.label && s.label !== 'OFF')
      
      if (latestShift) {
        const label = latestShift.label?.toUpperCase()
        
        // Map shift labels to circadian shift types
        if (label === 'NIGHT') {
          shiftType = 'night'
        } else if (label === 'DAY') {
          // Check if it's morning or day based on start time
          if (latestShift.start_ts) {
            const startHour = new Date(latestShift.start_ts).getHours()
            if (startHour >= 5 && startHour < 9) {
              shiftType = 'morning'
            } else {
              shiftType = 'day'
            }
          } else {
            shiftType = 'day'
          }
        } else if (label === 'CUSTOM' && latestShift.start_ts) {
          const startHour = new Date(latestShift.start_ts).getHours()
          if (startHour >= 5 && startHour < 9) {
            shiftType = 'morning'
          } else if (startHour >= 12 && startHour < 17) {
            shiftType = 'day'
          } else if (startHour >= 17 && startHour < 22) {
            shiftType = 'evening'
          } else {
            shiftType = 'night'
          }
        }
        
        // Check if pattern is rotating (multiple different shift types in last 7 days)
        const uniqueLabels = new Set(shifts.filter(s => s.label && s.label !== 'OFF').map(s => s.label))
        if (uniqueLabels.size > 2) {
          shiftType = 'rotating'
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

    const circadian = calculateCircadianPhase(input)

    // Optionally log to circadian_logs table (non-blocking)
    try {
      const midpointMinutes = (sleepStart.getTime() + sleepEnd.getTime()) / 2 / (1000 * 60)
      const midpointMod = ((midpointMinutes % 1440) + 1440) % 1440
      const idealMidpoint = 3 * 60 // 03:00
      let deviation = Math.abs(midpointMod - idealMidpoint)
      deviation = Math.min(deviation, 1440 - deviation)
      const deviationHours = deviation / 60

      const { error: logError } = await supabase
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
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}
