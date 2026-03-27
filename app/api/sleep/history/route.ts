import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { logSupabaseError } from '@/lib/supabase/error-handler'
import { getShiftedDayKey } from '@/lib/sleep/utils'

export async function GET(req: NextRequest) {
  const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  // Use service role client (bypasses RLS) when in dev fallback mode
  const supabase = isDevFallback ? supabaseServer : authSupabase

  try {
    // Accept query params for date range, or default to last 30 shifted days (inclusive of today)
    const searchParams = req.nextUrl.searchParams
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const daysParam = Number.parseInt(searchParams.get('days') || '', 10)

    const isValidDateOnly = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
    
    let fromIsoDate: string
    let toIsoDate: string
    
    if (fromParam || toParam) {
      if (!fromParam || !toParam) {
        return NextResponse.json(
          { error: 'Both from and to must be provided together in YYYY-MM-DD format' },
          { status: 400 }
        )
      }

      if (!isValidDateOnly(fromParam) || !isValidDateOnly(toParam)) {
        return NextResponse.json(
          { error: 'Invalid from/to date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }

      if (fromParam > toParam) {
        return NextResponse.json(
          { error: 'from must be on or before to' },
          { status: 400 }
        )
      }

      fromIsoDate = fromParam
      toIsoDate = toParam
    } else {
      // Default to last 30 days, inclusive of today (today + previous 29).
      const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30
      const now = new Date()
      const from = new Date()
      from.setHours(0, 0, 0, 0)
      from.setDate(now.getDate() - (days - 1))
      fromIsoDate = from.toISOString().slice(0, 10)
      const to = new Date(now)
      to.setHours(0, 0, 0, 0)
      toIsoDate = to.toISOString().slice(0, 10)
    }

    // Build requested shifted-day keys (final clipping window).
    const requestedDayKeys = new Set<string>()
    {
      const start = new Date(`${fromIsoDate}T12:00:00`)
      const end = new Date(`${toIsoDate}T12:00:00`)
      const cursor = new Date(start)
      while (cursor <= end) {
        requestedDayKeys.add(getShiftedDayKey(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    // Boundary-safe raw fetch window:
    // include one extra day on both sides and overlap-match by [start_at, end_at].
    const rawStart = new Date(`${fromIsoDate}T00:00:00.000Z`)
    rawStart.setDate(rawStart.getDate() - 1)
    const rawEnd = new Date(`${toIsoDate}T23:59:59.999Z`)
    rawEnd.setDate(rawEnd.getDate() + 1)

    let query = supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, quality, type, source, notes')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('end_at', rawStart.toISOString())
      .lte('start_at', rawEnd.toISOString())
    
    // 500 is sufficient for 30 days of user-visible sessions;
    // revisit if wearable imports create many fragmented session rows.
    const { data: sleepData, error } = await query
      .order('start_at', { ascending: false })
      .limit(500)

    if (error) {
      logSupabaseError('api/sleep/history', error)
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    // Get unique dates from sleep logs
    const dates = new Set<string>()
    if (sleepData) {
      for (const log of sleepData) {
        const date = log.start_at ? getShiftedDayKey(log.start_at) : null
        if (date) dates.add(date)
      }
    }

    // Fetch shifts for those dates
    const shiftsByDate = new Map<string, string>()
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

    const itemsWithShifts = (sleepData || [])
      .filter((log: any) => log.start_at && log.end_at)
      .map((log: any) => {
        const date = getShiftedDayKey(log.start_at)
        const shiftLabel = shiftsByDate.get(date) || 'OFF'
        return {
          ...log,
          date,
          shift_label: shiftLabel,
        }
      })
      .filter((log: any) => requestedDayKeys.has(log.date))

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

