import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { logSupabaseError } from '@/lib/supabase/error-handler'

export async function GET(req: NextRequest) {
  const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
  
  // Use service role client (bypasses RLS) when in dev fallback mode
  const supabase = isDevFallback ? supabaseServer : authSupabase

  try {
    // Accept query params for date range, or default to last 30 days
    const searchParams = req.nextUrl.searchParams
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    
    let fromIsoDate: string
    let toIsoDate: string | undefined
    
    if (fromParam && toParam) {
      fromIsoDate = fromParam
      toIsoDate = toParam
    } else {
      // Default to last 30 days
      const now = new Date()
      const from = new Date()
      from.setDate(now.getDate() - 30)
      fromIsoDate = from.toISOString().slice(0, 10)
      toIsoDate = undefined
    }

    let query = supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps, type')
      .eq('user_id', userId)
      .gte('date', fromIsoDate)
    
    if (toIsoDate) {
      query = query.lte('date', toIsoDate)
    }
    
    // Order by start_ts (actual column name in database)
    const { data: sleepData, error } = await query
      .order('start_ts', { ascending: false })
      .limit(50)

    if (error) {
      logSupabaseError('api/sleep/history', error)
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    // Get unique dates from sleep logs
    const dates = new Set<string>()
    if (sleepData) {
      for (const log of sleepData) {
        const startTime = log.start_ts
        const date = log.date || (startTime ? new Date(startTime).toISOString().slice(0, 10) : null)
        if (date) dates.add(date)
      }
    }

    // Fetch shifts for those dates
    let shiftsByDate = new Map<string, string>()
    if (dates.size > 0) {
      const dateArray = Array.from(dates)
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('date, label')
        .eq('user_id', userId)
        .in('date', dateArray)
      
      if (shiftsData) {
        for (const shift of shiftsData) {
          shiftsByDate.set(shift.date, shift.label || 'OFF')
        }
      }
    }

    // Add shift label to each sleep log entry
    // Normalize field names: add start_at/end_at aliases for compatibility
    const itemsWithShifts = (sleepData || []).map((log: any) => {
      const startTime = log.start_ts
      const endTime = log.end_ts
      const date = log.date || (startTime ? new Date(startTime).toISOString().slice(0, 10) : null)
      const shiftLabel = date ? (shiftsByDate.get(date) || 'OFF') : 'OFF'
      return {
        ...log,
        // Add aliases for compatibility (database has start_ts/end_ts, but some code expects start_at/end_at)
        start_at: log.start_ts,
        end_at: log.end_ts,
        shift_label: shiftLabel,
      }
    })

    console.log('[/api/sleep/history] rows:', itemsWithShifts.length)

    return NextResponse.json({ items: itemsWithShifts }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/history] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json({ items: [] }, { status: 200 })
  }
}

