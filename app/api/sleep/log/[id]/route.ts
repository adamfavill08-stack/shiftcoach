import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .eq('id', params.id)
      .eq('user_id', user.id)
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
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[/api/sleep/log/:id DELETE] auth error:', authError)
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[/api/sleep/log/:id DELETE] delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete sleep log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/log/:id DELETE] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

