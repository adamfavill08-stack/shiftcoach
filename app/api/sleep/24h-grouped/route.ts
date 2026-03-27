/**
 * GET /api/sleep/24h-grouped
 * Get sleep sessions grouped by shifted 24h day (07:00 → 07:00)
 * 
 * Returns sleep sessions for the current shifted day and recent days
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getShiftedDayKey, minutesBetween } from '@/lib/sleep/utils'
import type { SleepType } from '@/lib/sleep/types'

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

function groupByShiftedDay(sessions: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}

  for (const session of sessions) {
    try {
      const startTimeStr = session.start_at
      if (!startTimeStr) {
        console.warn('[api/sleep/24h-grouped] Session missing start time:', session.id)
        continue
      }
      
      const startTime = new Date(startTimeStr)
      if (isNaN(startTime.getTime())) {
        console.warn('[api/sleep/24h-grouped] Invalid start time for session:', session.id, startTimeStr)
        continue
      }
      
      const dayKey = getShiftedDayKey(startTimeStr)
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
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    if (!userId) return buildUnauthorizedResponse()
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '3') // Default: last 3 shifted days

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)
    
    const { data: sessions, error } = await supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, type, quality, notes, source, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('start_at', startDate.toISOString())
      .lte('start_at', endDate.toISOString())
      .order('start_at', { ascending: false })

    if (error) {
      console.error('[api/sleep/24h-grouped] Query error:', error)
      return NextResponse.json({ days: [], currentShiftedDay: getShiftedDayKey(now) }, { status: 200 })
    }

    const sessionsArray = (sessions ?? []).map((s: any) => ({
      id: s.id,
      start_at: s.start_at,
      end_at: s.end_at,
      type: s.type as SleepType,
      quality: s.quality,
      notes: s.notes,
      source: s.source || 'manual',
      created_at: s.created_at,
    }))

    const grouped = groupByShiftedDay(sessionsArray)

    const todayKey = getShiftedDayKey(now)
    if (!grouped[todayKey]) {
      grouped[todayKey] = []
    }

    const daysArray = Object.entries(grouped).map(([date, daySessions]) => {
      const totalMinutes = daySessions.reduce((sum: number, s: any) => {
        return sum + minutesBetween(s.start_at, s.end_at)
      }, 0)

      return {
        date,
        shiftedDayStart: getShiftedDayStart(new Date(date + 'T12:00:00')).toISOString(),
        sessions: daySessions.map((s: any) => {
          const durationHours = minutesBetween(s.start_at, s.end_at) / 60
          return {
            id: s.id,
            start_at: s.start_at,
            end_at: s.end_at,
            type: s.type,
            quality: s.quality,
            notes: s.notes,
            source: s.source || 'manual',
            durationHours,
          }
        }),
        totalMinutes,
        totalHours: totalMinutes / 60,
      }
    })

    daysArray.sort((a, b) => b.date.localeCompare(a.date))
    return NextResponse.json({
      days: daysArray,
      currentShiftedDay: todayKey,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/24h-grouped] Fatal error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

