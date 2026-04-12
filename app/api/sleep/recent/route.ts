import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { fetchMergedPhoneHealthSleepSessionsOverlapping } from '@/lib/sleep/sleepRecordsSummaryFallback'

export async function GET(req: NextRequest) {
  const { supabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const db = isDevFallback ? supabaseServer : supabase

  try {
    // Get most recent sleep log
    let result = await db
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps')
      .eq('user_id', userId)
      .order('start_ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('start_ts'))) {
      const fallback = await db
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

    if (data) {
      return NextResponse.json({ sleep: data }, { status: 200 })
    }

    const sinceIso = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()
    const merged = await fetchMergedPhoneHealthSleepSessionsOverlapping(db, userId, sinceIso, now.toISOString())
    const pick = merged
      .filter((s) => new Date(s.end_at).getTime() <= now.getTime())
      .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())[0]

    if (!pick) {
      return NextResponse.json({ sleep: null }, { status: 200 })
    }

    const startMs = new Date(pick.start_at).getTime()
    const endMs = new Date(pick.end_at).getTime()
    const hrs = !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs ? (endMs - startMs) / 3600000 : 0

    return NextResponse.json(
      {
        sleep: {
          id: `phone_health:${pick.start_at}:${pick.end_at}`,
          date: null,
          start_ts: pick.start_at,
          end_ts: pick.end_at,
          sleep_hours: hrs > 0 ? Math.round(hrs * 10) / 10 : null,
          quality: null,
          naps: 0,
        },
      },
      { status: 200 },
    )
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

