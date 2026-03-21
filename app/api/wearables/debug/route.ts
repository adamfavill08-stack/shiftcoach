import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    // Token connection status
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_fit_tokens')
      .select('user_id, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    // Recent activity logs (try ts first, then created_at fallback)
    let activityRows: any[] = []
    let activityError: string | null = null
    const activityTs = await supabase
      .from('activity_logs')
      .select('id, steps, active_minutes, source, ts, created_at')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(10)

    if (activityTs.error && (activityTs.error.code === '42703' || activityTs.error.message?.includes('ts'))) {
      const activityCreatedAt = await supabase
        .from('activity_logs')
        .select('id, steps, active_minutes, source, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      activityRows = activityCreatedAt.data ?? []
      activityError = activityCreatedAt.error?.message ?? null
    } else {
      activityRows = activityTs.data ?? []
      activityError = activityTs.error?.message ?? null
    }

    // Recent sleep logs (support old/new schemas)
    let sleepRows: any[] = []
    let sleepError: string | null = null
    const sleepOld = await supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps, type, created_at')
      .eq('user_id', userId)
      .order('start_ts', { ascending: false })
      .limit(10)

    if (sleepOld.error && (sleepOld.error.code === '42703' || sleepOld.error.message?.includes('start_ts'))) {
      const sleepNew = await supabase
        .from('sleep_logs')
        .select('id, date, start_at, end_at, sleep_hours, quality, naps, type, created_at')
        .eq('user_id', userId)
        .order('start_at', { ascending: false })
        .limit(10)
      sleepRows = sleepNew.data ?? []
      sleepError = sleepNew.error?.message ?? null
    } else {
      sleepRows = sleepOld.data ?? []
      sleepError = sleepOld.error?.message ?? null
    }

    return NextResponse.json(
      {
        userId,
        wearableConnection: {
          connected: !!tokenRow,
          tokenUpdatedAt: tokenRow?.updated_at ?? null,
          tokenError: tokenError?.message ?? null,
        },
        rawData: {
          activityLogsRecent: activityRows,
          sleepLogsRecent: sleepRows,
          activityError,
          sleepError,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'wearables_debug_failed',
        details: err?.message || String(err),
      },
      { status: 500 }
    )
  }
}
