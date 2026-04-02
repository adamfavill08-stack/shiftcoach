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

function normalizeTimestamps(row: any) {
  const start_at = row.start_at ?? row.start_ts ?? null
  const end_at = row.end_at ?? row.end_ts ?? null
  return { ...row, start_at, end_at }
}

function sessionOverlapsWindow(
  startIso: string,
  endIso: string,
  winStart: Date,
  winEnd: Date,
): boolean {
  const a = new Date(startIso).getTime()
  const b = new Date(endIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return b >= winStart.getTime() && a <= winEnd.getTime()
}

function resolveRequestTimeZone(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get('tz') ?? req.nextUrl.searchParams.get('timeZone') ?? ''
  const decoded = raw ? decodeURIComponent(raw.trim()) : ''
  const zone = decoded.slice(0, 120)
  if (!zone) return 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}

function groupByShiftedDay(sessions: any[], timeZone: string): Record<string, any[]> {
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
      
      const dayKey = getShiftedDayKey(startTimeStr, 7, timeZone)
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
    const timeZone = resolveRequestTimeZone(req)

    const now = new Date()
    // Use UTC calendar bounds so behavior matches hosted servers (often UTC). Extend winEnd to
    // **tomorrow** UTC: evening sleep in the Americas starts on the next UTC calendar day while
    // "now" is still the previous UTC date — a same-day winEnd would drop those sessions entirely.
    const y = now.getUTCFullYear()
    const mo = now.getUTCMonth()
    const d = now.getUTCDate()
    const winStart = new Date(Date.UTC(y, mo, d - days - 1, 0, 0, 0, 0))
    const winEnd = new Date(Date.UTC(y, mo, d + 1, 23, 59, 59, 999))

    // Pull a slightly wider slice from SQL, then filter overlaps in JS (avoids edge cases with PostgREST).
    const sqlLowerBound = new Date(winStart)
    sqlLowerBound.setUTCDate(sqlLowerBound.getUTCDate() - 3)
    const sqlUpperBound = new Date(winEnd)
    sqlUpperBound.setUTCDate(sqlUpperBound.getUTCDate() + 2)

    const fullSelect =
      'id, start_at, end_at, start_ts, end_ts, type, quality, notes, source, created_at'

    async function fetchRows(opts: { withDeletedNull: boolean; columns: string }) {
      let q = supabase
        .from('sleep_logs')
        .select(opts.columns)
        .eq('user_id', userId)
        // Loose overlap: session intersects [sqlLowerBound, sqlUpperBound]; tighten to win* in JS.
        .not('start_at', 'is', null)
        .not('end_at', 'is', null)
        .gte('end_at', sqlLowerBound.toISOString())
        .lte('start_at', sqlUpperBound.toISOString())
        .order('start_at', { ascending: false })
        .limit(800)
      if (opts.withDeletedNull) q = q.is('deleted_at', null)
      return q
    }

    let r = await fetchRows({ withDeletedNull: true, columns: fullSelect })
    let rows: any[] | null = r.data as any[] | null
    let error = r.error

    const deletedBroken =
      !!error &&
      (error.code === 'PGRST204' ||
        error.code === '42703' ||
        (error.message ?? '').toLowerCase().includes('deleted_at') ||
        (error.message ?? '').includes('does not exist'))

    if (deletedBroken) {
      r = await fetchRows({ withDeletedNull: false, columns: fullSelect })
      rows = r.data as any[] | null
      error = r.error
    }

    const columnBroken =
      !!error &&
      ((error.message ?? '').includes('column') || error.code === 'PGRST204' || error.code === '42703')

    if (columnBroken) {
      const r3 = await supabase
        .from('sleep_logs')
        .select('id, start_at, end_at, type, quality, notes, source, created_at')
        .eq('user_id', userId)
        .not('start_at', 'is', null)
        .not('end_at', 'is', null)
        .gte('end_at', sqlLowerBound.toISOString())
        .lte('start_at', sqlUpperBound.toISOString())
        .order('start_at', { ascending: false })
        .limit(800)
      rows = r3.data as any[] | null
      error = r3.error
    }

    if (error) {
      console.error('[api/sleep/24h-grouped] Query error:', error)
      return NextResponse.json({ days: [], currentShiftedDay: getShiftedDayKey(now, 7, timeZone) }, { status: 200 })
    }

    const normalized = (rows ?? []).map(normalizeTimestamps).filter((s: any) => s.start_at && s.end_at)

    const inWindow = normalized.filter((s: any) =>
      sessionOverlapsWindow(s.start_at, s.end_at, winStart, winEnd),
    )

    const sessionsArray = inWindow.map((s: any) => ({
      id: s.id,
      start_at: s.start_at,
      end_at: s.end_at,
      type: s.type as SleepType,
      quality: s.quality,
      notes: s.notes,
      source: s.source || 'manual',
      created_at: s.created_at,
    }))

    if (process.env.NODE_ENV === 'development') {
      console.log('[api/sleep/24h-grouped]', {
        userId,
        rawRows: rows?.length ?? 0,
        normalized: normalized.length,
        inWindow: inWindow.length,
        daysParam: days,
      })
    }

    const grouped = groupByShiftedDay(sessionsArray, timeZone)

    const todayKey = getShiftedDayKey(now, 7, timeZone)
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

