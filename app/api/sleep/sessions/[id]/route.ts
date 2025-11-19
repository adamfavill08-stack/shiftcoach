import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/sleep/sessions/[id]
 * Update an existing sleep session
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    // Always use service role client to bypass RLS (consistent with other sleep routes)
    const supabase = supabaseServer
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()
    const { start_time, end_time, session_type, quality } = body

    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: 'start_time and end_time are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(start_time)
    const endDate = new Date(end_time)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json(
        { error: 'end_time must be after start_time' },
        { status: 400 }
      )
    }

    // Map session_type to type field
    const type = session_type === 'nap' ? 'nap' : 'sleep'

    // Try new schema first
    let updateResult = await supabase
      .from('sleep_logs')
      .update({
        type,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        quality: quality || null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (updateResult.error) {
      // Try old schema
      updateResult = await supabase
        .from('sleep_logs')
        .update({
          start_ts: startDate.toISOString(),
          end_ts: endDate.toISOString(),
          naps: session_type === 'nap' ? 1 : 0,
          quality: quality || null,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
    }

    if (updateResult.error) {
      console.error('[api/sleep/sessions/:id PATCH] error:', updateResult.error)
      return NextResponse.json(
        { error: 'Failed to update sleep session', details: updateResult.error.message },
        { status: 500 }
      )
    }

    if (!updateResult.data) {
      return NextResponse.json({ error: 'Sleep session not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, session: updateResult.data }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/sessions/:id PATCH] FATAL ERROR:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sleep/sessions/[id]
 * Delete a sleep session
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    // Always use service role client to bypass RLS (consistent with other sleep routes)
    const supabase = supabaseServer
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Basic UUID format guard
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[api/sleep/sessions/:id DELETE] error:', error)
      return NextResponse.json(
        { error: 'Failed to delete sleep session', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/sessions/:id DELETE] FATAL ERROR:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

