import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { fetchMergedPhoneHealthSleepSessionsOverlapping } from '@/lib/sleep/sleepRecordsSummaryFallback'

// Cache for 30 seconds - sleep data updates when logged
export const revalidate = 30

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

function isOldSchemaFallbackError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === 'PGRST204') return true
  const m = err.message ?? ''
  return m.includes('start_at') || m.includes('type')
}

type TodayRow = {
  id: string
  start_ts: string | null
  end_ts: string | null
  quality: number | null
  naps: number | null
}

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    if (!userId) return buildUnauthorizedResponse()

    const now = new Date()
    const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Prefer start_at (matches POST /api/sleep/log). start_ts-first would miss rows that only populate start_at.
    const primary = await supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, quality, type')
      .eq('user_id', userId)
      .gte('start_at', sinceIso)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let data: TodayRow | null = null
    let error = primary.error

    if (primary.error && isOldSchemaFallbackError(primary.error)) {
      const fallback = await supabase
        .from('sleep_logs')
        .select('id, start_ts, end_ts, quality, naps')
        .eq('user_id', userId)
        .gte('start_ts', sinceIso)
        .order('start_ts', { ascending: false })
        .limit(1)
        .maybeSingle()

      error = fallback.error
      if (fallback.data) {
        data = {
          id: fallback.data.id,
          start_ts: fallback.data.start_ts ?? null,
          end_ts: fallback.data.end_ts ?? null,
          quality: fallback.data.quality ?? null,
          naps: fallback.data.naps ?? null,
        }
      }
    } else if (!primary.error && primary.data) {
      const row = primary.data
      data = {
        id: row.id,
        start_ts: row.start_at ?? null,
        end_ts: row.end_at ?? null,
        quality: row.quality ?? null,
        naps: row.type === 'nap' ? 1 : 0,
      }
    }

    if (error) {
      console.error('[/api/sleep/today] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch sleep', details: error.message }, { status: 500 })
    }

    if (!data) {
      const merged = await fetchMergedPhoneHealthSleepSessionsOverlapping(
        supabase,
        userId,
        sinceIso,
        now.toISOString(),
      )
      const pick = merged
        .filter((s) => new Date(s.end_at).getTime() <= now.getTime())
        .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())[0]
      if (!pick) {
        return NextResponse.json({ sleep: null } satisfies SleepTodayPayload, { status: 200 })
      }
      const start = new Date(pick.start_at)
      const end = new Date(pick.end_at)
      const diffMs = end.getTime() - start.getTime()
      const durationMinutes =
        !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && diffMs > 0
          ? Math.round(diffMs / 60000)
          : null
      return NextResponse.json(
        {
          sleep: {
            id: `phone_health:${pick.start_at}:${pick.end_at}`,
            start_ts: pick.start_at,
            end_ts: pick.end_at,
            quality: null,
            naps: 0,
            duration_min: durationMinutes,
          },
        } satisfies SleepTodayPayload,
        { status: 200 },
      )
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
