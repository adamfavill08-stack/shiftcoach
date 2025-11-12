import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

type SleepTodayPayload = {
  sleep: {
    id: string
    start_ts: string | null
    end_ts: string | null
    quality: number | null
    naps: number | null
    duration_min: number | null
  } | null
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    const now = new Date()
    const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id, start_ts, end_ts, quality, naps')
      .eq('user_id', userId)
      .gte('start_ts', sinceIso)
      .order('start_ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[/api/sleep/today] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch sleep', details: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ sleep: null } satisfies SleepTodayPayload, { status: 200 })
    }

    let durationMinutes: number | null = null
    if (data.start_ts && data.end_ts) {
      const start = new Date(data.start_ts as string)
      const end = new Date(data.end_ts as string)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime()
        if (diffMs > 0) {
          durationMinutes = Math.round(diffMs / 60000)
        }
      }
    }

    return NextResponse.json({
      sleep: {
        id: data.id,
        start_ts: data.start_ts,
        end_ts: data.end_ts,
        quality: data.quality ?? null,
        naps: data.naps ?? null,
        duration_min: durationMinutes,
      },
    } satisfies SleepTodayPayload)
  } catch (err: any) {
    console.error('[/api/sleep/today] FATAL ERROR:', err)
    return NextResponse.json({ error: 'Internal server error', details: err?.message ?? null }, { status: 500 })
  }
}
