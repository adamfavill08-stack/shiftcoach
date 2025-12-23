import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { EventType } from '@/lib/models/calendar/EventType'

// GET /api/calendar/event-types/[id] - Get single event type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
      }
      console.error('Error fetching event type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ eventType: data })
  } catch (error: any) {
    console.error('Error in GET /api/calendar/event-types/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/calendar/event-types/[id] - Update event type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const eventType: Partial<EventType> = body

    const updateData: any = {}
    if (eventType.title !== undefined) updateData.title = eventType.title
    if (eventType.color !== undefined) updateData.color = eventType.color
    if (eventType.caldavCalendarId !== undefined) updateData.caldav_calendar_id = eventType.caldavCalendarId
    if (eventType.caldavDisplayName !== undefined) updateData.caldav_display_name = eventType.caldavDisplayName
    if (eventType.caldavEmail !== undefined) updateData.caldav_email = eventType.caldavEmail
    if (eventType.type !== undefined) updateData.type = eventType.type

    const { data, error } = await supabase
      .from('event_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating event type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ eventType: data })
  } catch (error: any) {
    console.error('Error in PUT /api/calendar/event-types/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/calendar/event-types/[id] - Delete event type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if event type is in use
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('event_type', id)
      .limit(1)

    if (events && events.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event type that is in use' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('event_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting event type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/calendar/event-types/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

