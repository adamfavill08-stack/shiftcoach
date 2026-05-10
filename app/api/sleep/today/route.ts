import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { fetchMergedPhoneHealthSleepSessionsOverlapping } from '@/lib/sleep/sleepRecordsSummaryFallback'
import { rowCountsAsPrimarySleep } from '@/lib/sleep/utils'

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
  return m.includes('start_at') || m.includes('end_at') || m.includes('type')
}

type TodayRow = {
  id: string
  start_ts: string | null
  end_ts: string | null
  quality: number | null
  naps: number | null
}

function mapNewSchemaRow(row: {
  id: string
  start_at?: string | null
  end_at?: string | null
  quality?: number | null
  type?: string | null
}): TodayRow {
  return {
    id: row.id,
    start_ts: row.start_at ?? null,
    end_ts: row.end_at ?? null,
    quality: row.quality ?? null,
    naps: row.type === 'nap' ? 1 : 0,
  }
}

export async function GET(_req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    if (!userId) return buildUnauthorizedResponse()

    const now = new Date()
    // Anchor on wake/end time, not bed/start: a normal night can start >24h before "now" when viewed
    // the next calendar evening, which wrongly hid the row when we only filtered on start_at.
    const sinceEndIso = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()

    let data: TodayRow | null = null
    let error: { code?: string; message?: string } | null = null

    const primary = await supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, quality, type')
      .eq('user_id', userId)
      .gte('end_at', sinceEndIso)
      .not('end_at', 'is', null)
      .order('end_at', { ascending: false })
      .limit(30)

    if (primary.error && isOldSchemaFallbackError(primary.error)) {
      const fallback = await supabase
        .from('sleep_logs')
        .select('id, start_ts, end_ts, quality, naps')
        .eq('user_id', userId)
        .gte('end_ts', sinceEndIso)
        .not('end_ts', 'is', null)
        .order('end_ts', { ascending: false })
        .limit(30)

      error = fallback.error
      if (!fallback.error && fallback.data?.length) {
        const row = (fallback.data as any[]).find((r) => {
          const naps = r.naps
          const isNap = typeof naps === 'number' && naps > 0
          return !isNap
        })
        if (row) {
          data = {
            id: row.id,
            start_ts: row.start_ts ?? null,
            end_ts: row.end_ts ?? null,
            quality: row.quality ?? null,
            naps: row.naps ?? null,
          }
        }
      }
    } else if (primary.error) {
      error = primary.error
    } else {
      const row = (primary.data ?? []).find((r) => rowCountsAsPrimarySleep(r as any))
      if (row) {
        data = mapNewSchemaRow(row as any)
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
        sinceEndIso,
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
