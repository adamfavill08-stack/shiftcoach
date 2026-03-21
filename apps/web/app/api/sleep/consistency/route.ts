import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Calculate sleep consistency score (0-100) based on bedtime variance
 * For shift workers, this measures how regular their sleep schedule is
 * despite shift changes.
 */
function calculateConsistencyScore(bedtimes: Date[]): number {
  if (bedtimes.length <= 1) {
    // Not enough data for consistency calculation
    return 0
  }

  // Calculate standard deviation of bedtimes in hours
  const reference = bedtimes[0]
  const offsets = bedtimes.map((d) => (d.getTime() - reference.getTime()) / (1000 * 60 * 60))
  const mean = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length
  const variance = offsets.reduce((sum, offset) => sum + Math.pow(offset - mean, 2), 0) / offsets.length
  const stdDevHours = Math.sqrt(variance)

  // Map standard deviation (0-3.5 hours) to score (100-40)
  // Lower variance = higher consistency score
  // 0 hours variance = 100 score (perfect consistency)
  // 3.5+ hours variance = 40 score (low consistency)
  const score = stdDevHours <= 0 
    ? 100 
    : stdDevHours >= 3.5 
    ? 40 
    : Math.round(100 - (stdDevHours / 3.5) * 60)

  return Math.max(0, Math.min(100, score))
}

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch last 7 days of main sleep sessions (not naps)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Try new schema first (start_at, end_at, type)
    let { data: sleepLogs, error } = await supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, type, start_ts, end_ts, naps')
      .eq('user_id', userId)
      .gte('start_at', sevenDaysAgo.toISOString())
      .order('start_at', { ascending: false })
      .limit(20) // Get enough to filter main sleep

    // Type sleepLogs as any[] to handle both old and new schemas
    let sleepLogsArray: any[] = sleepLogs || []

    // If new schema fails, try old schema
    if (error) {
      const errorMsg = error.message || ''
      const errorCode = error.code || ''
      
      if (errorMsg.includes('start_at') || errorMsg.includes('column') || errorCode === 'PGRST204' || errorCode === '42703') {
        console.log('[api/sleep/consistency] New schema failed, trying old schema:', errorMsg)
        
        const { data: oldSleepLogs, error: oldError } = await supabase
          .from('sleep_logs')
          .select('id, start_ts, end_ts, naps')
          .eq('user_id', userId)
          .gte('start_ts', sevenDaysAgo.toISOString())
          .order('start_ts', { ascending: false })
          .limit(20)

        if (oldError) {
          console.error('[api/sleep/consistency] Old schema also failed:', oldError)
          return NextResponse.json({ consistencyScore: null, error: 'No sleep data available' }, { status: 200 })
        }

        sleepLogsArray = oldSleepLogs || []
        error = null
      } else {
        console.error('[api/sleep/consistency] Query error:', error)
        return NextResponse.json({ consistencyScore: null, error: 'Failed to fetch sleep data' }, { status: 500 })
      }
    }

    if (!sleepLogsArray || sleepLogsArray.length === 0) {
      return NextResponse.json({ consistencyScore: null, error: 'No sleep data available' }, { status: 200 })
    }

    // Filter for main sleep sessions only (not naps)
    // New schema: type === 'sleep', Old schema: naps === 0 or null
    const mainSleepSessions = sleepLogsArray.filter((log: any) => {
      if (log.type !== undefined) {
        // New schema
        return log.type === 'sleep' || log.type === 'main'
      } else {
        // Old schema
        return log.naps === 0 || log.naps === null || !log.naps
      }
    })

    if (mainSleepSessions.length < 2) {
      // Need at least 2 main sleep sessions to calculate consistency
      return NextResponse.json({ 
        consistencyScore: null, 
        error: 'Not enough sleep data. Need at least 2 main sleep sessions.' 
      }, { status: 200 })
    }

    // Extract bedtimes (start times) from main sleep sessions
    const bedtimes = mainSleepSessions
      .map((log: any) => {
        const startTime = log.start_at || log.start_ts
        if (!startTime) return null
        return new Date(startTime)
      })
      .filter((date: Date | null): date is Date => date !== null && !isNaN(date.getTime()))

    if (bedtimes.length < 2) {
      return NextResponse.json({ 
        consistencyScore: null, 
        error: 'Not enough valid bedtimes to calculate consistency.' 
      }, { status: 200 })
    }

    // Calculate consistency score
    const consistencyScore = calculateConsistencyScore(bedtimes)

    // Calculate average sleep duration and prepare bedtime/wake time data
    let avgSleepHours: number | null = null
    const durations: number[] = []
    
    // Prepare bedtime/wake time data for last 7 days (for sparkline)
    // Use the same sevenDaysAgo but create a new date for the 7-day range (6 days ago to today = 7 days)
    const sparklineStartDate = new Date(sevenDaysAgo)
    sparklineStartDate.setDate(sparklineStartDate.getDate() + 1) // Start from 6 days ago (to get 7 days total)
    const bedtimeWakeData: Array<{ date: string; bedtimeHour: number | null; wakeHour: number | null }> = []
    
    // Initialize 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(sparklineStartDate)
      date.setDate(sparklineStartDate.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)
      bedtimeWakeData.push({ date: dateStr, bedtimeHour: null, wakeHour: null })
    }

    // Process each sleep session to get duration and map to days
    mainSleepSessions.forEach((log: any) => {
      const startTime = log.start_at || log.start_ts
      const endTime = log.end_at || log.end_ts
      if (!startTime || !endTime) return
      
      const start = new Date(startTime)
      const end = new Date(endTime)
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      
      if (durationHours > 0 && durationHours < 24) { // Valid sleep duration
        durations.push(durationHours)
      }
      
      // Get the date string for the day this sleep session belongs to (based on wake time)
      const wakeDate = new Date(end)
      const dateStr = wakeDate.toISOString().slice(0, 10)
      
      const dayData = bedtimeWakeData.find(d => d.date === dateStr)
      if (dayData) {
        // Convert to hours (0-24) for visualization
        dayData.bedtimeHour = start.getHours() + start.getMinutes() / 60
        dayData.wakeHour = end.getHours() + end.getMinutes() / 60
      }
    })
    
    // Calculate average sleep duration
    if (durations.length > 0) {
      avgSleepHours = durations.reduce((sum, h) => sum + h, 0) / durations.length
    }

    return NextResponse.json(
      { 
        consistencyScore,
        bedtimesCount: bedtimes.length,
        avgSleepHours,
        bedtimeWakeData: bedtimeWakeData.slice().reverse(), // Reverse to show most recent first
        // Include stdDev for debugging (optional)
        stdDevHours: bedtimes.length > 1 
          ? (() => {
              const reference = bedtimes[0]
              const offsets = bedtimes.map((d) => (d.getTime() - reference.getTime()) / (1000 * 60 * 60))
              const mean = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length
              const variance = offsets.reduce((sum, offset) => sum + Math.pow(offset - mean, 2), 0) / offsets.length
              return Math.sqrt(variance)
            })()
          : null
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
  } catch (err: any) {
    console.error('[api/sleep/consistency] Fatal error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

