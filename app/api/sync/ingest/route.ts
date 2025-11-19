import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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

    const body = await req.json()
    const { platform, lastSyncedAt, sleep } = body as {
      platform: 'ios_healthkit' | 'android_googlefit',
      lastSyncedAt?: string | null,
      sleep: Array<{
        start: string, // ISO
        end: string,   // ISO
        stage?: 'asleep'|'inbed'|'light'|'deep'|'rem'|'awake',
        quality?: string,
        meta?: Record<string, any>
      }>
    }

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
        source: platform.includes('ios') ? 'healthkit' : 'googlefit',
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

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ingest] fatal', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

