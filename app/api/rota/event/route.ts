import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { logSupabaseError } from '@/lib/supabase/error-handler'

export const dynamic = 'force-dynamic'

// GET ?month=11&year=2025 -> list events for month
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    const { searchParams } = new URL(req.url)
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
    const year  = Number(searchParams.get('year'))  || new Date().getFullYear()

    // Calculate the actual date range for the calendar grid (includes previous/next month dates)
    const zeroBasedMonth = month - 1
    const firstOfMonth = new Date(year, zeroBasedMonth, 1)
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(firstOfMonth.getDate() - firstWeekday) // Start from first Monday before/on 1st
    
    // Calendar shows 6 weeks max (42 days)
    const gridEnd = new Date(gridStart)
    gridEnd.setDate(gridStart.getDate() + 41) // 42 days total
    
    // Query events for the entire calendar grid range
    const startIso = gridStart.toISOString()
    const endIso = new Date(gridEnd)
    endIso.setHours(23, 59, 59, 999)
    const endIsoStr = endIso.toISOString()

    // Add timeout protection for Supabase query
    const queryPromise = supabase
      .from('rota_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_at', startIso)
      .lte('start_at', endIsoStr)
      .order('start_at', { ascending: true })

    // Race against a timeout (10 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 10000)
    )

    let result
    try {
      result = await Promise.race([queryPromise, timeoutPromise])
    } catch (timeoutError: any) {
      if (timeoutError?.message === 'Query timeout') {
        console.warn('[api/rota/event] Query timeout, returning empty events')
        return NextResponse.json({ events: [] }, { status: 200 })
      }
      throw timeoutError
    }

    const { data, error } = result as { data: any; error: any }

    if (error) {
      // Check if it's a table not found error (non-fatal)
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[api/rota/event] rota_events table not found, returning empty events')
        return NextResponse.json({ events: [] }, { status: 200 })
      }
      logSupabaseError('api/rota/event', error, { level: 'warn' })
      return NextResponse.json({ events: [] }, { status: 200 }) // don't break UI
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (e: any) {
    // Handle any unexpected errors gracefully
    console.error('[api/rota/event] fatal GET', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.slice(0, 500), // Limit stack trace length
    })
    return NextResponse.json({ events: [] }, { status: 200 })
  }
}

// POST -> save event
export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    const body = await req.json()

    console.log('[api/rota/event] incoming body', body)

    // Frontend sends: { title, description, startDate, endDate, startTime?, endTime?, allDay, eventType, color }
    // Database expects: { user_id, title, start_at, end_at, all_day, color, notes } (after migration)
    
    if (!body.title || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title and start date are required' },
        { status: 400 }
      )
    }

    const startDateStr = body.startDate // YYYY-MM-DD format
    const endDateStr = body.endDate || body.startDate // Default to start date if not provided

    // For holidays, create one event per day in the range
    // For other events, create a single event
    const isHoliday = body.eventType === 'holiday'
    const eventsToCreate: any[] = []

    if (isHoliday && startDateStr !== endDateStr) {
      // Create events for each day in the range
      const start = new Date(startDateStr)
      const end = new Date(endDateStr)
      
      // Validate date range
      if (end < start) {
        return NextResponse.json(
          { error: 'End date must be on or after start date' },
          { status: 400 }
        )
      }

      // Clean up any existing holiday events with the same title in this range to avoid stacking
      const { error: rangeDeleteError } = await supabase
        .from('rota_events')
        .delete()
        .eq('user_id', userId)
        .eq('title', body.title)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

      if (rangeDeleteError && !rangeDeleteError.message?.includes('relation')) {
        console.warn('[api/rota/event] range delete warning (safe to continue):', rangeDeleteError)
      }

      // Generate all dates in the range
      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().slice(0, 10)
        const startAt = new Date(Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(5, 7)) - 1,
          parseInt(dateStr.substring(8, 10)),
          0, 0, 0
        )).toISOString()
        const endAt = new Date(Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(5, 7)) - 1,
          parseInt(dateStr.substring(8, 10)),
          23, 59, 59
        )).toISOString()

        eventsToCreate.push({
          user_id: userId,
          title: body.title,
          date: dateStr,
          start_at: startAt,
          end_at: endAt,
          all_day: true,
          color: body.color ?? '#FCD34D', // Yellow for holidays
          notes: body.description?.trim() || null,
        })

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else {
      // Single event (non-holiday or single-day holiday)
      const dateStr = startDateStr
      let startAt: string
      let endAt: string

      if (body.allDay) {
        // All-day events: start at 00:00:00 UTC, end at 23:59:59 UTC
        startAt = new Date(Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(5, 7)) - 1,
          parseInt(dateStr.substring(8, 10)),
          0, 0, 0
        )).toISOString()
        endAt = new Date(Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(5, 7)) - 1,
          parseInt(dateStr.substring(8, 10)),
          23, 59, 59
        )).toISOString()
      } else {
        // Timed events: combine date with startTime/endTime
        const startTime = body.startTime || '00:00'
        const endTime = body.endTime || '23:59'
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        
        startAt = new Date(Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(5, 7)) - 1,
          parseInt(dateStr.substring(8, 10)),
          startHour, startMin, 0
        )).toISOString()
        
        endAt = new Date(Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(5, 7)) - 1,
          parseInt(dateStr.substring(8, 10)),
          endHour, endMin, 0
        )).toISOString()
      }

      eventsToCreate.push({
        user_id: userId,
        title: body.title,
        date: dateStr,
        start_at: startAt,
        end_at: endAt,
        all_day: !!body.allDay,
        // Default to the same amber-yellow used in the UI if no explicit colour chosen
        color: body.color ?? '#FCD34D',
        notes: body.description?.trim() || null,
      })
    }

    console.log('[api/rota/event] inserting', eventsToCreate.length, 'event(s)')

    const { data, error } = await supabase
      .from('rota_events')
      .insert(eventsToCreate)
      .select()

    if (error) {
      console.error('[api/rota/event] insert error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error,
      })
      return NextResponse.json(
        { 
          error: 'insert_failed',
          detail: error.message ?? String(error),
          code: error.code,
        },
        { status: 500 }
      )
    }

    console.log('[api/rota/event] saved', data?.length || 0, 'event(s)')
    return NextResponse.json({ ok: true, events: data, count: data?.length || 0 })
  } catch (e: any) {
    console.error('[api/rota/event] fatal POST', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
      fullError: e,
    })
    return NextResponse.json(
      { 
        error: 'fatal',
        detail: e?.message || String(e),
      },
      { status: 500 }
    )
  }
}

// DELETE -> delete event by id
export async function DELETE(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('id')
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing event id' },
        { status: 400 }
      )
    }
    
    console.log('[api/rota/event] deleting event', eventId)
    
    const { error } = await supabase
      .from('rota_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId)
    
    if (error) {
      console.error('[api/rota/event] delete error', error)
      return NextResponse.json(
        { 
          error: 'delete_failed',
          detail: error.message ?? String(error),
        },
        { status: 500 }
      )
    }
    
    console.log('[api/rota/event] deleted event', eventId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/rota/event] fatal DELETE', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
      fullError: e,
    })
    return NextResponse.json(
      { 
        error: 'fatal',
        detail: e?.message || String(e),
      },
      { status: 500 }
    )
  }
}
