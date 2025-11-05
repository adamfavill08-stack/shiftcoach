import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: NextRequest) {
  // Use cookies from the incoming request instead of next/headers
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[/api/sleep/log] auth error:', authError)
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Please sign in to log sleep.' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to log sleep.' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const { startTime, endTime, quality, naps } = body

    // Validate required fields
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required', message: 'Please provide startTime and endTime.' },
        { status: 400 }
      )
    }

    // Convert to Date objects and validate
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', message: 'startTime and endTime must be valid dates.' },
        { status: 400 }
      )
    }

    // Calculate duration in minutes
    const durationMin = (endDate.getTime() - startDate.getTime()) / 60000

    if (durationMin < 0) {
      return NextResponse.json(
        { error: 'Invalid time range', message: 'endTime must be after startTime.' },
        { status: 400 }
      )
    }

    // Get date from startDate (YYYY-MM-DD)
    const date = startDate.toISOString().slice(0, 10)

    // Calculate sleep hours
    const sleepHours = durationMin / 60

    // Sanitize quality (1-5, default 3)
    const qualityValue = quality != null ? Math.max(1, Math.min(5, Math.round(quality))) : 3

    // Sanitize naps (>= 0, default 0)
    const napsValue = naps != null ? Math.max(0, Math.round(naps)) : 0

    // Insert into Supabase with correct column names
    const { data: inserted, error: insertError } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        date,
        start_ts: startDate.toISOString(),
        end_ts: endDate.toISOString(),
        // duration_min is a generated column in the DB, so DO NOT insert it
        sleep_hours: sleepHours,
        quality: qualityValue,
        naps: napsValue,
      })
      .select()
      .maybeSingle()

    if (insertError) {
      console.error('[/api/sleep/log] insert error:', insertError)
      
      // Check for specific database errors
      if (insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Sleep logs table not found. Please run the database migration.',
            details: insertError.message,
          },
          { status: 500 }
        )
      }

      // Return friendly error message
      return NextResponse.json(
        {
          error: 'Failed to log sleep',
          message: 'Could not log sleep right now, please try again.',
          details: insertError.message,
        },
        { status: 500 }
      )
    }

    // Success
    return NextResponse.json(
      {
        success: true,
        sleep_log: inserted,
        message: 'Sleep logged successfully',
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[/api/sleep/log] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Could not log sleep right now, please try again.',
        details: err?.message,
      },
      { status: 500 }
    )
  }
}

