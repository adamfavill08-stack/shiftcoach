import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Event, TYPE_TASK } from '@/lib/models/calendar/Event'
import type { SupabaseClient } from '@supabase/supabase-js'

async function resolveEventTypeId(
  supabase: SupabaseClient,
  requestedEventType?: number
): Promise<number> {
  if (typeof requestedEventType === 'number' && Number.isFinite(requestedEventType) && requestedEventType > 0) {
    const { data: existing } = await supabase
      .from('event_types')
      .select('id')
      .eq('id', requestedEventType)
      .maybeSingle()
    if (existing?.id) return existing.id
  }

  const { data: fallback } = await supabase
    .from('event_types')
    .select('id')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  return fallback?.id ?? 1
}

// GET /api/calendar/tasks - Get tasks
export async function GET(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const supabase = isDevFallback ? supabaseServer : authSupabase


    const searchParams = request.nextUrl.searchParams
    const fromTS = searchParams.get('fromTS')
    const toTS = searchParams.get('toTS')
    const completed = searchParams.get('completed') // 'true' or 'false'

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .eq('type', TYPE_TASK)

    if (fromTS && toTS) {
      query = query
        .lte('start_ts', Number(toTS))
        .gte('start_ts', Number(fromTS))
    }

    // Filter by completion status
    if (completed === 'true') {
      query = query.filter('flags', 'cs', '{8}') // FLAG_TASK_COMPLETED
    } else if (completed === 'false') {
      query = query.or('flags.cs.{8},flags.is.null')
    }

    query = query.order('start_ts', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tasks = (data || []).map(task => ({
      ...task,
      repetitionExceptions: Array.isArray(task.repetition_exceptions) 
        ? task.repetition_exceptions 
        : JSON.parse(task.repetition_exceptions || '[]'),
      attendees: Array.isArray(task.attendees) 
        ? task.attendees 
        : JSON.parse(task.attendees || '[]'),
    }))

    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error('Error in GET /api/calendar/tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/calendar/tasks - Create task
export async function POST(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const supabase = isDevFallback ? supabaseServer : authSupabase


    const body = await request.json()
    const task: Partial<Event> = { ...body, type: TYPE_TASK }
    const safeEventTypeId = await resolveEventTypeId(supabase, task.eventType)

    const taskData = {
      user_id: userId,
      start_ts: task.startTS || Math.floor(Date.now() / 1000),
      end_ts: task.endTS || Math.floor(Date.now() / 1000),
      title: task.title || '',
      location: task.location || '',
      description: task.description || '',
      reminder_1_minutes: task.reminder1Minutes ?? -1,
      reminder_2_minutes: task.reminder2Minutes ?? -1,
      reminder_3_minutes: task.reminder3Minutes ?? -1,
      reminder_1_type: task.reminder1Type ?? 0,
      reminder_2_type: task.reminder2Type ?? 0,
      reminder_3_type: task.reminder3Type ?? 0,
      repeat_interval: task.repeatInterval ?? 0,
      repeat_rule: task.repeatRule ?? 0,
      repeat_limit: task.repeatLimit ?? 0,
      repetition_exceptions: task.repetitionExceptions || [],
      attendees: task.attendees || [],
      import_id: task.importId || '',
      time_zone: task.timeZone || '',
      flags: task.flags ?? 0,
      event_type: safeEventTypeId,
      parent_id: task.parentId ?? 0,
      last_updated: Math.floor(Date.now() / 1000),
      source: task.source || 'simple-calendar',
      availability: task.availability ?? 0,
      color: task.color ?? 0,
      type: TYPE_TASK,
    }

    const { data, error } = await supabase
      .from('events')
      .insert(taskData)
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also create task record
    if (data.id) {
      await supabase.from('tasks').insert({
        task_id: data.id,
        start_ts: data.start_ts,
        flags: data.flags,
      })
    }

    const createdTask = {
      ...data,
      repetitionExceptions: Array.isArray(data.repetition_exceptions) 
        ? data.repetition_exceptions 
        : JSON.parse(data.repetition_exceptions || '[]'),
      attendees: Array.isArray(data.attendees) 
        ? data.attendees 
        : JSON.parse(data.attendees || '[]'),
    }

    return NextResponse.json({ task: createdTask }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

