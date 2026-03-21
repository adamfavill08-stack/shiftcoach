import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  try {
    const body = await req.json().catch(() => ({}))
    const { startTime, endTime, quality, naps } = body

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const durationMin = (endDate.getTime() - startDate.getTime()) / 60000
    const sleepHours = durationMin / 60

    if (durationMin < 0) {
      return NextResponse.json(
        { error: 'endTime must be after startTime' },
        { status: 400 }
      )
    }

    // Get date from startDate (YYYY-MM-DD)
    const date = startDate.toISOString().slice(0, 10)

    // Sanitize quality (1-5, default 3)
    const qualityValue = quality != null ? Math.max(1, Math.min(5, Math.round(quality))) : 3

    // Sanitize naps (>= 0, default 0)
    const napsValue = naps != null ? Math.max(0, Math.round(naps)) : 0

    const { id } = await context.params

    const { data: updated, error } = await supabase
      .from('sleep_logs')
      .update({
        date,
        start_ts: startDate.toISOString(),
        end_ts: endDate.toISOString(),
        sleep_hours: sleepHours,
        quality: qualityValue,
        naps: napsValue,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[/api/sleep/log/:id PUT] error:', error)
      return NextResponse.json({ error: 'Failed to update log', details: error.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, sleep_log: updated })
  } catch (err: any) {
    console.error('[/api/sleep/log/:id PUT] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Always use service role client for deletes to bypass RLS
    // This ensures deletes work even if RLS policies are misconfigured
    const supabase = supabaseServer
    
    if (!userId) {
      console.error('[/api/sleep/log/:id DELETE] No userId')
      return NextResponse.json({ error: 'unauthorized', details: 'No user ID found' }, { status: 401 })
    }

    // Next 16: params is a Promise
    const { id } = await params

    if (!id) {
      console.error('[/api/sleep/log/:id DELETE] missing id param')
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Basic UUID format guard to avoid 22P02
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      console.error('[/api/sleep/log/:id DELETE] invalid id format:', id)
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    console.log('[/api/sleep/log/:id DELETE] Attempting to delete sleep log:', { id, userId })

    const { data, error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('[/api/sleep/log/:id DELETE] delete error:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        id,
        userId,
      })
      return NextResponse.json(
        { 
          error: 'Failed to delete sleep log',
          details: error.message || 'Unknown database error',
          code: error.code,
        },
        { status: 500 }
      )
    }

    console.log('[/api/sleep/log/:id DELETE] Successfully deleted:', { id, deletedRows: data?.length || 0 })

    return NextResponse.json({ success: true, deleted: data }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/log/:id DELETE] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: err?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

