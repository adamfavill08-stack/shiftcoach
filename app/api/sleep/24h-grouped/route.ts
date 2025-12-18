/**
 * GET /api/sleep/24h-grouped
 * Get sleep sessions grouped by shifted 24h day (07:00 → 07:00)
 * 
 * Returns sleep sessions for the current shifted day and recent days
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Get shifted day start (07:00 of current day)
 */
function getShiftedDayStart(date: Date): Date {
  const shifted = new Date(date)
  shifted.setHours(7, 0, 0, 0)
  if (date.getHours() < 7) {
    // If before 07:00, use previous day's 07:00
    shifted.setDate(shifted.getDate() - 1)
  }
  return shifted
}

/**
 * Get shifted day end (07:00 of next day)
 */
function getShiftedDayEnd(date: Date): Date {
  const shifted = new Date(date)
  shifted.setHours(7, 0, 0, 0)
  if (date.getHours() >= 7) {
    // If after 07:00, use next day's 07:00
    shifted.setDate(shifted.getDate() + 1)
  } else {
    // If before 07:00, use today's 07:00
  }
  return shifted
}

/**
 * Group sleep sessions by shifted day
 */
function groupByShiftedDay(sessions: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  
  for (const session of sessions) {
    try {
      const startTimeStr = session.start_at || session.start_ts
      if (!startTimeStr) {
        console.warn('[api/sleep/24h-grouped] Session missing start time:', session.id)
        continue
      }
      
      const startTime = new Date(startTimeStr)
      if (isNaN(startTime.getTime())) {
        console.warn('[api/sleep/24h-grouped] Invalid start time for session:', session.id, startTimeStr)
        continue
      }
      
      const shiftedDayStart = getShiftedDayStart(startTime)
      const dayKey = shiftedDayStart.toISOString().slice(0, 10)
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = []
      }
      grouped[dayKey].push(session)
    } catch (err) {
      console.warn('[api/sleep/24h-grouped] Error grouping session:', session.id, err)
      continue
    }
  }
  
  return grouped
}

export async function GET(req: NextRequest) {
  try {
    console.log('[api/sleep/24h-grouped] Route hit')
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = supabaseServer
    
    console.log('[api/sleep/24h-grouped] Got userId:', userId, 'isDevFallback:', isDevFallback)
    
    if (!userId) {
      console.error('[api/sleep/24h-grouped] No userId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '3') // Default: last 3 shifted days
    
    // Calculate date range (last N shifted days)
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)
    
    // Fetch sleep sessions
    // Try old schema first (start_ts, end_ts, naps) since that's likely what exists
    let { data: sessions, error } = await supabase
      .from('sleep_logs')
      .select('id, start_ts, end_ts, naps, quality, notes, created_at')
      .eq('user_id', userId)
      .gte('start_ts', startDate.toISOString())
      .lte('start_ts', endDate.toISOString())
      .order('start_ts', { ascending: false })
    
    // Type sessions as any[] to handle both old and new schemas
    let sessionsArray: any[] = sessions || []
    
    // If old schema fails (column doesn't exist), try new schema
    if (error) {
      const errorMsg = error.message || ''
      const errorCode = error.code || ''
      
      // Check if it's a column error
      if (errorMsg.includes('start_ts') || errorMsg.includes('column') || errorCode === 'PGRST204' || errorCode === '42703') {
        console.log('[api/sleep/24h-grouped] Old schema failed, trying new schema:', errorMsg)
        
        const { data: newSessions, error: newError } = await supabase
          .from('sleep_logs')
          .select('id, start_at, end_at, type, quality, notes, source, created_at')
          .eq('user_id', userId)
          .gte('start_at', startDate.toISOString())
          .lte('start_at', endDate.toISOString())
          .order('start_at', { ascending: false })
        
        if (newError) {
          console.error('[api/sleep/24h-grouped] New schema also failed:', newError)
          // If both fail, return empty array instead of error
          sessionsArray = []
          error = null
        } else if (newSessions) {
          sessionsArray = newSessions
          error = null
        } else {
          sessionsArray = []
          error = null
        }
      } else {
        // Other error - log but return empty array
        console.error('[api/sleep/24h-grouped] Query error:', error)
        sessionsArray = []
        error = null
      }
    } else if (sessions) {
      // Map old schema to new format
      sessionsArray = sessions.map((s: any) => ({
        id: s.id,
        start_at: s.start_ts,
        end_at: s.end_ts,
        type: (s.naps === 0 || !s.naps) ? 'sleep' : 'nap',
        quality: s.quality,
        notes: s.notes,
        source: 'manual',
        created_at: s.created_at,
      }))
    }
    
    // Ensure sessionsArray is defined (already set above)
    console.log('[api/sleep/24h-grouped] Found', sessionsArray.length, 'sessions')
    
    // Group by shifted day
    const grouped = groupByShiftedDay(sessionsArray)
    
    // Always include today's shifted day, even if empty
    const todayShiftedDay = getShiftedDayStart(now)
    const todayKey = todayShiftedDay.toISOString().slice(0, 10)
    if (!grouped[todayKey]) {
      grouped[todayKey] = []
    }
    
    // Format response
    const daysArray = Object.entries(grouped).map(([date, daySessions]) => {
      const totalMinutes = daySessions.reduce((sum: number, s: any) => {
        try {
          const start = new Date(s.start_at || s.start_ts)
          const end = new Date(s.end_at || s.end_ts)
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn('[api/sleep/24h-grouped] Invalid date in session:', s.id)
            return sum
          }
          const diffMs = end.getTime() - start.getTime()
          if (diffMs > 0) {
            return sum + diffMs / (1000 * 60)
          }
          return sum
        } catch (err) {
          console.warn('[api/sleep/24h-grouped] Error calculating duration for session:', s.id, err)
          return sum
        }
      }, 0)
      
      return {
        date,
        shiftedDayStart: getShiftedDayStart(new Date(date + 'T12:00:00')).toISOString(),
        sessions: daySessions.map((s: any) => {
          try {
            const start = new Date(s.start_at || s.start_ts)
            const end = new Date(s.end_at || s.end_ts)
            const durationMs = end.getTime() - start.getTime()
            const durationMinutes = durationMs > 0 ? durationMs / (1000 * 60) : 0
            const durationHours = durationMinutes / 60
            
            return {
              id: s.id,
              start_at: s.start_at || s.start_ts,
              end_at: s.end_at || s.end_ts,
              type: s.type || ((s.naps === 0 || !s.naps) ? 'sleep' : 'nap'),
              quality: s.quality,
              notes: s.notes,
              source: s.source || 'manual',
              durationHours,
            }
          } catch (err) {
            console.warn('[api/sleep/24h-grouped] Error mapping session:', s.id, err)
            return null
          }
        }).filter((s: any) => s !== null),
        totalMinutes,
        totalHours: totalMinutes / 60,
      }
    })
    
    // Sort by date (most recent first)
    daysArray.sort((a, b) => b.date.localeCompare(a.date))
    
    console.log('[api/sleep/24h-grouped] Returning', daysArray.length, 'days')
    
    return NextResponse.json({
      days: daysArray,
      currentShiftedDay: getShiftedDayStart(now).toISOString().slice(0, 10),
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/24h-grouped] Fatal error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

