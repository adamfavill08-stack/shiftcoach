import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Event, TYPE_TASK, FLAG_TASK_COMPLETED } from '@/lib/models/calendar/Event'

// PUT /api/calendar/tasks/[id] - Update task (including completion status)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { completed, ...taskData } = body

    const updateData: any = {}
    if (taskData.title !== undefined) updateData.title = taskData.title
    if (taskData.description !== undefined) updateData.description = taskData.description
    if (taskData.startTS !== undefined) updateData.start_ts = taskData.startTS
    if (taskData.endTS !== undefined) updateData.end_ts = taskData.endTS
    if (taskData.flags !== undefined) updateData.flags = taskData.flags
    if (taskData.eventType !== undefined) updateData.event_type = taskData.eventType
    if (taskData.color !== undefined) updateData.color = taskData.color

    // Handle completion status
    if (completed !== undefined) {
      const { data: currentTask } = await supabase
        .from('events')
        .select('flags')
        .eq('id', params.id)
        .eq('user_id', userId)
        .single()

      if (currentTask) {
        updateData.flags = completed
          ? (currentTask.flags | FLAG_TASK_COMPLETED)
          : (currentTask.flags & ~FLAG_TASK_COMPLETED)
      }
    }

    updateData.last_updated = Math.floor(Date.now() / 1000)

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .eq('type', TYPE_TASK)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update task record
    if (data.id) {
      await supabase
        .from('tasks')
        .upsert({
          task_id: data.id,
          start_ts: data.start_ts,
          flags: data.flags,
        })
    }

    const updatedTask = {
      ...data,
      repetitionExceptions: Array.isArray(data.repetition_exceptions) 
        ? data.repetition_exceptions 
        : JSON.parse(data.repetition_exceptions || '[]'),
      attendees: Array.isArray(data.attendees) 
        ? data.attendees 
        : JSON.parse(data.attendees || '[]'),
    }

    return NextResponse.json({ task: updatedTask })
  } catch (error: any) {
    console.error('Error in PUT /api/calendar/tasks/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/calendar/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete task record first
    await supabase
      .from('tasks')
      .delete()
      .eq('task_id', params.id)

    // Delete event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)
      .eq('type', TYPE_TASK)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/calendar/tasks/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

