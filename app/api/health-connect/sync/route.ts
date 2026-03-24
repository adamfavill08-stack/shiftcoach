import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

/**
 * POST /api/health-connect/sync
 *
 * Session-authenticated Android ingestion path for Health Connect.
 * This reduces reliance on Google Fit for Android users.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const body = await req.json().catch(() => ({} as any))
    const steps = typeof body?.steps === 'number' ? Math.max(0, Math.round(body.steps)) : null
    const sleep = Array.isArray(body?.sleep) ? body.sleep : []
    const heartRate = Array.isArray(body?.heartRate) ? body.heartRate : []
    const syncedAt = typeof body?.syncedAt === 'string' ? body.syncedAt : new Date().toISOString()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    await supabase
      .from('device_sources')
      .upsert(
        { user_id: userId, platform: 'android_health_connect', last_synced_at: syncedAt },
        { onConflict: 'user_id,platform' }
      )

    if (steps != null) {
      const today = new Date().toISOString().slice(0, 10)
      const startIso = new Date(today + 'T00:00:00Z').toISOString()
      const endIso = new Date(today + 'T23:59:59Z').toISOString()

      const existing = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing.data?.id) {
        await supabase
          .from('activity_logs')
          .update({ steps, source: 'Health Connect' })
          .eq('id', existing.data.id)
      } else {
        await supabase
          .from('activity_logs')
          .insert({ user_id: userId, steps, source: 'Health Connect' })
      }
    }

    if (sleep.length > 0) {
      const rows = sleep
        .filter((s: any) => typeof s?.start === 'string' && typeof s?.end === 'string')
        .map((s: any) => ({
          user_id: userId,
          source: 'health_connect',
          start_at: s.start,
          end_at: s.end,
          stage: typeof s?.stage === 'string' ? s.stage : 'asleep',
          quality: typeof s?.quality === 'string' ? s.quality : null,
          meta: s?.meta ?? {},
        }))

      if (rows.length > 0) {
        await supabase.from('sleep_records').insert(rows)
      }
    }

    if (heartRate.length > 0) {
      const hrRows = heartRate
        .filter((h: any) => typeof h?.bpm === 'number' && typeof h?.ts === 'string')
        .map((h: any) => ({
          user_id: userId,
          source: 'health_connect',
          bpm: Math.max(1, Math.min(299, Math.round(h.bpm))),
          recorded_at: new Date(h.ts).toISOString(),
          meta: h?.meta ?? {},
        }))
        .filter((r: any) => !Number.isNaN(new Date(r.recorded_at).getTime()))

      if (hrRows.length > 0) {
        await supabase
          .from('wearable_heart_rate_samples')
          .upsert(hrRows, { onConflict: 'user_id,source,recorded_at,bpm', ignoreDuplicates: true })
      }
    }

    return NextResponse.json({
      ok: true,
      provider: 'health_connect',
      lastSyncedAt: syncedAt,
      accepted: {
        steps: steps != null,
        sleepCount: sleep.length,
        heartRateCount: heartRate.length,
      },
    })
  } catch (err: any) {
    console.error('[health-connect/sync] fatal', err)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

