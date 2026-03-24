import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type IngestSleepItem = {
  start: string
  end: string
  stage?: 'asleep' | 'inbed' | 'light' | 'deep' | 'rem' | 'awake'
  quality?: string
  meta?: Record<string, unknown>
}

type IngestHeartRateItem = {
  bpm: number
  ts: string
  meta?: Record<string, unknown>
}

type IngestPayload = {
  platform: 'ios_healthkit' | 'android_health_connect' | 'health_connect' | 'android_googlefit'
  lastSyncedAt?: string | null
  sleep: IngestSleepItem[]
  heartRate?: IngestHeartRateItem[]
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })

    // Verify token to get user id using service role client
    const { data: userInfo, error: verifyErr } = await supabaseServer.auth.getUser(token)
    if (verifyErr || !userInfo.user) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 })
    }
    const user_id = userInfo.user.id

    const body = (await req.json()) as IngestPayload
    const { platform, sleep } = body

    if (!platform || !Array.isArray(sleep)) {
      return NextResponse.json({ error: 'bad payload' }, { status: 400 })
    }

    // Upsert device_sources row
    await supabaseServer.from('device_sources').upsert({
      user_id,
      platform,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'user_id,platform' })

    // Insert sleep rows (dedupe by hash)
    if (sleep.length) {
      const rows = sleep.map(s => ({
        user_id,
        source: platform.includes('ios')
          ? 'apple_health'
          : (platform.includes('health_connect') ? 'health_connect' : 'google_fit'),
        start_at: s.start,
        end_at: s.end,
        stage: s.stage ?? 'asleep',
        quality: s.quality ?? null,
        meta: s.meta ?? {}
      }))

      const { error } = await supabaseServer.from('sleep_records').insert(rows)
      if (error) {
        // ignore duplicates gracefully if you add unique index later
        console.error('[ingest] insert error', error)
      }
    }

    // Optional heart-rate ingestion for provider-agnostic pipeline.
    if (Array.isArray(body.heartRate) && body.heartRate.length > 0) {
      const source = platform.includes('ios')
        ? 'apple_health'
        : (platform.includes('health_connect') ? 'health_connect' : 'google_fit')

      const heartRows = body.heartRate
        .filter((h: IngestHeartRateItem) => typeof h?.bpm === 'number' && typeof h?.ts === 'string')
        .map((h) => ({
          user_id,
          source,
          bpm: Math.max(1, Math.min(299, Math.round(h.bpm))),
          recorded_at: new Date(h.ts).toISOString(),
          meta: h.meta ?? {},
        }))
        .filter((r) => !Number.isNaN(new Date(r.recorded_at).getTime()))

      if (heartRows.length > 0) {
        const { error: hrError } = await supabaseServer
          .from('wearable_heart_rate_samples')
          .upsert(heartRows, { onConflict: 'user_id,source,recorded_at,bpm', ignoreDuplicates: true })

        if (hrError) {
          console.error('[ingest] heart-rate upsert error', hrError)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ingest] fatal', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

