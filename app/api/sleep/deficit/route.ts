import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateSleepDeficit } from '@/lib/sleep/calculateSleepDeficit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sleep/deficit
 * Returns sleep deficit calculation for the last 7 days
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requiredDailyHours = 7.5; // Default requirement

    // Get last 7 days of sleep data
    const now = new Date()
    const sevenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)
    
    // Helper to get local date string (YYYY-MM-DD) from a Date
    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Helper to get local date from ISO string
    const getLocalDateFromISO = (isoString: string): string => {
      const date = new Date(isoString)
      return getLocalDateString(date)
    }

    // Utility function to calculate minutes between two times
    const minutesBetween = (a: string | Date, b: string | Date) => {
      return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
    }

    // Try new schema first (start_at, end_at, type)
    let weekLogs: any[] = []
    let weekErr: any = null
    
    let weekResult = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('start_at', sevenAgo.toISOString())
      .order('start_at', { ascending: true })
    
    weekLogs = weekResult.data || []
    weekErr = weekResult.error
    
    // If new schema fails, try old schema
    if (weekErr && (weekErr.message?.includes("start_at") || weekErr.message?.includes("type") || weekErr.code === 'PGRST204')) {
      console.log('[api/sleep/deficit] Trying old schema')
      weekResult = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('start_ts', sevenAgo.toISOString())
        .order('start_ts', { ascending: true })
      weekLogs = weekResult.data || []
      weekErr = weekResult.error
    }

    if (weekErr) {
      console.error('[api/sleep/deficit] Query error:', weekErr)
      // If table doesn't exist, return empty data
      if (weekErr.message?.includes('relation') || weekErr.message?.includes('does not exist')) {
        return NextResponse.json({
          requiredDaily: requiredDailyHours,
          weeklyDeficit: 0,
          daily: [],
          category: 'low',
        }, { status: 200 })
      }
      return NextResponse.json({ error: weekErr.message }, { status: 500 })
    }

    // Aggregate sleep by day (same logic as /api/sleep/summary)
    const byDay: Record<string, number> = {}

    // Initialize 7 days with 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
      const key = getLocalDateString(d)
      byDay[key] = 0
    }

    // Filter for main sleep sessions only (not naps) - similar to consistency API
    const mainSleepLogs = weekLogs.filter((row: any) => {
      if (row.type !== undefined) {
        // New schema: type === 'sleep' or 'main'
        return row.type === 'sleep' || row.type === 'main'
      } else {
        // Old schema: naps === 0 or null
        return row.naps === 0 || row.naps === null || !row.naps
      }
    })

    // Aggregate sleep by day (only main sleep, not naps)
    for (const row of mainSleepLogs ?? []) {
      const endTime = row.end_at || row.end_ts
      const startTime = row.start_at || row.start_ts
      if (!endTime || !startTime) continue
      
      // Use date column if available (old schema), otherwise extract local date from endTime
      let key: string
      if (row.date) {
        key = row.date.slice(0, 10)
      } else {
        // Extract local date from endTime (sleep ends on the date it's logged for)
        key = getLocalDateFromISO(endTime)
      }
      
      if (!byDay[key]) {
        // Date might be outside our 7-day window, skip it
        continue
      }
      byDay[key] += minutesBetween(startTime, endTime)
    }

    // Convert to array format for calculation
    const sleepData = Object.entries(byDay).map(([date, totalMinutes]) => ({
      date,
      totalMinutes,
    }))

    // Calculate deficit
    const deficit = calculateSleepDeficit(sleepData, requiredDailyHours)

    console.log('[api/sleep/deficit] Calculated deficit:', {
      weeklyDeficit: deficit.weeklyDeficit,
      category: deficit.category,
      dailyCount: deficit.daily.length,
    })

    return NextResponse.json(deficit, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err: any) {
    console.error('[api/sleep/deficit] FATAL ERROR:', {
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

