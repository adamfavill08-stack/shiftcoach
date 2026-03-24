import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  try {
    // Get most recent sleep log
    let result = await supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps')
      .eq('user_id', userId)
      .order('start_ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('start_ts'))) {
      const fallback = await supabase
        .from('sleep_logs')
        .select('id, date, start_at, end_at, sleep_hours, quality, type')
        .eq('user_id', userId)
        .order('start_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      result = {
        data: fallback.data
          ? {
              id: fallback.data.id,
              date: fallback.data.date ?? null,
              start_ts: fallback.data.start_at ?? null,
              end_ts: fallback.data.end_at ?? null,
              sleep_hours: fallback.data.sleep_hours ?? null,
              quality: fallback.data.quality ?? null,
              naps: fallback.data.type === 'nap' ? 1 : 0,
            }
          : null,
        error: fallback.error,
      } as any
    }
    const { data, error } = result

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

