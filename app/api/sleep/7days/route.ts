import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Utility function from summary route
function minutesBetween(a: string | Date, b: string | Date) {
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
}

/**
 * GET /api/sleep/7days
 * Returns sleep data for the last 7 days, grouped by calendar day
 * Reuses the same aggregation logic as /api/sleep/summary
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Last 7 days summary (group by date) - use local time
    // Same logic as /api/sleep/summary
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

    // Try old schema first, fallback to new schema (same as summary route)
    let weekLogs, weekErr
    let weekResult = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('naps', 0) // 0 = main sleep in old schema
      .gte('start_ts', sevenAgo.toISOString())
      .order('start_ts', { ascending: true })
    
    weekLogs = weekResult.data
    weekErr = weekResult.error
    
    // If old schema fails (column doesn't exist), try new schema
    if (weekErr && (weekErr.message?.includes("start_ts") || weekErr.message?.includes("naps") || weekErr.code === 'PGRST204')) {
      console.log('[api/sleep/7days] Trying new schema for week data')
      weekResult = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'sleep') // Only get main sleep for 7-day summary
        .gte('start_at', sevenAgo.toISOString())
        .order('start_at', { ascending: true })
      weekLogs = weekResult.data
      weekErr = weekResult.error
    }

    if (weekErr) {
      console.error('[api/sleep/7days] week query error:', weekErr)
      // If table doesn't exist, return empty array
      if (weekErr.message?.includes('relation') || weekErr.message?.includes('does not exist')) {
        console.log('[api/sleep/7days] Table does not exist, returning empty days array')
        return NextResponse.json({ days: [] }, { status: 200 })
      }
      return NextResponse.json({ error: weekErr.message }, { status: 500 })
    }

    // Map by day (local) - same logic as summary route
    const byDay: Record<string, {
      date: string
      total: number
    }> = {}

    // Initialize 7 days with empty data
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
      const key = getLocalDateString(d)
      byDay[key] = { date: key, total: 0 }
    }

    // Aggregate sleep by day
    for (const row of weekLogs ?? []) {
      // Handle both schemas
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
      byDay[key].total += minutesBetween(startTime, endTime)
    }

    // Convert to array format expected by frontend
    // Sort by date descending (most recent first)
    const daysArray = Object.values(byDay)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((d) => ({
        date: d.date,
        totalMinutes: d.total,
        totalSleepHours: d.total / 60,
      }))

    console.log('[api/sleep/7days] Returning days:', daysArray)
    
    return NextResponse.json({ days: daysArray }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err: any) {
    console.error('[api/sleep/7days] FATAL ERROR:', {
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
