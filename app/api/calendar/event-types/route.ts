import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { EventType } from '@/lib/models/calendar/EventType'

// GET /api/calendar/event-types - Get all event types
export async function GET(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching event types:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ eventTypes: data || [] })
  } catch (error: any) {
    console.error('Error in GET /api/calendar/event-types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/calendar/event-types - Create new event type
export async function POST(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const eventType: Partial<EventType> = body

    const eventTypeData = {
      title: eventType.title || '',
      color: eventType.color ?? 0,
      caldav_calendar_id: eventType.caldavCalendarId ?? 0,
      caldav_display_name: eventType.caldavDisplayName || '',
      caldav_email: eventType.caldavEmail || '',
      type: eventType.type ?? 0,
    }

    const { data, error } = await supabase
      .from('event_types')
      .insert(eventTypeData)
      .select()
      .single()

    if (error) {
      console.error('Error creating event type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ eventType: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/event-types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

