import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Event } from '@/lib/models/calendar/Event'

// GET /api/calendar/events/[id] - Get single event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Parse JSON fields
    const event = {
      ...data,
      repetitionExceptions: Array.isArray(data.repetition_exceptions) 
        ? data.repetition_exceptions 
        : JSON.parse(data.repetition_exceptions || '[]'),
      attendees: Array.isArray(data.attendees) 
        ? data.attendees 
        : JSON.parse(data.attendees || '[]'),
    }

    return NextResponse.json({ event })
  } catch (error: any) {
    console.error('Error in GET /api/calendar/events/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/calendar/events/[id] - Update event
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const event: Partial<Event> = body

    // Prepare update data
    const updateData: any = {}
    if (event.startTS !== undefined) updateData.start_ts = event.startTS
    if (event.endTS !== undefined) updateData.end_ts = event.endTS
    if (event.title !== undefined) updateData.title = event.title
    if (event.location !== undefined) updateData.location = event.location
    if (event.description !== undefined) updateData.description = event.description
    if (event.reminder1Minutes !== undefined) updateData.reminder_1_minutes = event.reminder1Minutes
    if (event.reminder2Minutes !== undefined) updateData.reminder_2_minutes = event.reminder2Minutes
    if (event.reminder3Minutes !== undefined) updateData.reminder_3_minutes = event.reminder3Minutes
    if (event.reminder1Type !== undefined) updateData.reminder_1_type = event.reminder1Type
    if (event.reminder2Type !== undefined) updateData.reminder_2_type = event.reminder2Type
    if (event.reminder3Type !== undefined) updateData.reminder_3_type = event.reminder3Type
    if (event.repeatInterval !== undefined) updateData.repeat_interval = event.repeatInterval
    if (event.repeatRule !== undefined) updateData.repeat_rule = event.repeatRule
    if (event.repeatLimit !== undefined) updateData.repeat_limit = event.repeatLimit
    if (event.repetitionExceptions !== undefined) updateData.repetition_exceptions = event.repetitionExceptions
    if (event.attendees !== undefined) updateData.attendees = event.attendees
    if (event.importId !== undefined) updateData.import_id = event.importId
    if (event.timeZone !== undefined) updateData.time_zone = event.timeZone
    if (event.flags !== undefined) updateData.flags = event.flags
    if (event.eventType !== undefined) updateData.event_type = event.eventType
    if (event.parentId !== undefined) updateData.parent_id = event.parentId
    if (event.source !== undefined) updateData.source = event.source
    if (event.availability !== undefined) updateData.availability = event.availability
    if (event.color !== undefined) updateData.color = event.color
    if (event.type !== undefined) updateData.type = event.type

    updateData.last_updated = Math.floor(Date.now() / 1000)

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Parse JSON fields
    const updatedEvent = {
      ...data,
      repetitionExceptions: Array.isArray(data.repetition_exceptions) 
        ? data.repetition_exceptions 
        : JSON.parse(data.repetition_exceptions || '[]'),
      attendees: Array.isArray(data.attendees) 
        ? data.attendees 
        : JSON.parse(data.attendees || '[]'),
    }

    return NextResponse.json({ event: updatedEvent })
  } catch (error: any) {
    console.error('Error in PUT /api/calendar/events/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/calendar/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/calendar/events/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

