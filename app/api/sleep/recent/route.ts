import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  try {
    // Get most recent sleep log
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps')
      .eq('user_id', userId)
      .order('start_ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[/api/sleep/recent] fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sleep data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sleep: data ?? null,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/recent] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err?.message,
      },
      { status: 500 }
    )
  }
}

