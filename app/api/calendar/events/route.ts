// Calendar Events API - using getServerSupabaseAndUserId for authentication
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Event, type Attendee } from '@/lib/models/calendar/Event'
import { parseJsonArray } from '@/lib/helpers/calendar/normalizeCalendarEvent'
import { resolveEventTypeId } from '@/lib/helpers/calendar/resolveEventTypeId'

// GET /api/calendar/events - Get events in date range
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Service role + explicit user_id filter (same pattern as /api/rota/event): RLS often blocks
    // inserts/updates when the route uses the anon cookie client without a forwarded JWT.
    const supabase = supabaseServer

    const searchParams = request.nextUrl.searchParams
    const fromTS = searchParams.get('fromTS')
    const toTS = searchParams.get('toTS')
    const eventTypeIds = searchParams.get('eventTypeIds')?.split(',').map(Number)
    const type = searchParams.get('type') // 'event' or 'task'
    const searchQuery = searchParams.get('search')

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)

    // Date range filter
    if (fromTS && toTS) {
      query = query
        .lte('start_ts', Number(toTS))
        .gte('end_ts', Number(fromTS))
    }

    // Event type filter
    if (eventTypeIds && eventTypeIds.length > 0) {
      query = query.in('event_type', eventTypeIds)
    }

    // Type filter (event vs task)
    if (type === 'task') {
      query = query.eq('type', 1) // TYPE_TASK
    } else if (type === 'event') {
      query = query.eq('type', 0) // TYPE_EVENT
    }

    // Search filter
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    }

    // Order by start time
    query = query.order('start_ts', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const events = (data || []).map((row) => ({
      ...row,
      repetitionExceptions: parseJsonArray<string>(row.repetition_exceptions, []),
      attendees: parseJsonArray<Attendee>(row.attendees, []),
    }))

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Error in GET /api/calendar/events:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/calendar/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const supabase = supabaseServer

    const body = await request.json()
    const event: Partial<Event> = body
    const safeEventTypeId = await resolveEventTypeId(supabase, event.eventType)

    // Prepare event data
    const eventData = {
      user_id: userId,
      start_ts: event.startTS || 0,
      end_ts: event.endTS || 0,
      title: event.title || '',
      location: event.location || '',
      description: event.description || '',
      reminder_1_minutes: event.reminder1Minutes ?? -1,
      reminder_2_minutes: event.reminder2Minutes ?? -1,
      reminder_3_minutes: event.reminder3Minutes ?? -1,
      reminder_1_type: event.reminder1Type ?? 0,
      reminder_2_type: event.reminder2Type ?? 0,
      reminder_3_type: event.reminder3Type ?? 0,
      repeat_interval: event.repeatInterval ?? 0,
      repeat_rule: event.repeatRule ?? 0,
      repeat_limit: event.repeatLimit ?? 0,
      repetition_exceptions: event.repetitionExceptions || [],
      attendees: event.attendees || [],
      import_id: event.importId || '',
      time_zone: event.timeZone || '',
      flags: event.flags ?? 0,
      event_type: safeEventTypeId,
      parent_id: event.parentId ?? 0,
      last_updated: Math.floor(Date.now() / 1000),
      source: event.source || 'simple-calendar',
      availability: event.availability ?? 0,
      color: event.color ?? 0,
      type: event.type ?? 0, // TYPE_EVENT
    }

    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const createdEvent = {
      ...data,
      repetitionExceptions: parseJsonArray<string>(data.repetition_exceptions, []),
      attendees: parseJsonArray<Attendee>(data.attendees, []),
    }

    return NextResponse.json({ event: createdEvent }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/events:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

