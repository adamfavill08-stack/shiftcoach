import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * POST /api/apple-health/sync
 *
 * This endpoint is designed for a native iOS client (or backend worker)
 * that has access to Apple Health / Apple Watch data via HealthKit.
 *
 * It mirrors the behaviour of /api/wearables/sync (Google Fit):
 * - Upserts today's steps into activity_logs
 * - Records the wearable source as "Apple Health"
 *
 * Request body (JSON):
 * {
 *   steps: number;          // total steps for "today"
 *   syncedAt?: string;      // optional ISO timestamp when sync occurred
 * }
 *
 * This does NOT talk to Apple directly; your iOS app should call this after
 * reading HealthKit, so the rest of the app can treat Apple and Google Fit
 * uniformly.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const steps = typeof body?.steps === 'number' ? Math.max(0, Math.round(body.steps)) : null
    const syncedAt = typeof body?.syncedAt === 'string' ? body.syncedAt : new Date().toISOString()

    if (steps === null) {
      return NextResponse.json(
        { error: 'invalid_payload', details: 'steps (number) is required' },
        { status: 400 },
      )
    }

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const today = new Date().toISOString().slice(0, 10)
    const startIso = new Date(today + 'T00:00:00Z').toISOString()
    const endIso = new Date(today + 'T23:59:59Z').toISOString()

    // Try with ts column first
    let existingQuery = await supabase
      .from('activity_logs')
      .select('id, steps, ts, source')
      .eq('user_id', userId)
      .gte('ts', startIso)
      .lt('ts', endIso)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingQuery.error && (existingQuery.error.code === '42703' || existingQuery.error.message?.includes('ts'))) {
      existingQuery = await supabase
        .from('activity_logs')
        .select('id, steps, created_at, source')
        .eq('user_id', userId)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    }

    const sourceLabel = 'Apple Health'

    if (!existingQuery.error && existingQuery.data) {
      const { error: updateError } = await supabase
        .from('activity_logs')
        .update({ steps, source: sourceLabel })
        .eq('id', existingQuery.data.id)

      if (updateError) {
        console.error('[apple-health/sync] Error updating activity_logs:', updateError)
      }
    } else if (!existingQuery.error && !existingQuery.data) {
      let insertQuery = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          steps,
          source: sourceLabel,
          ts: syncedAt,
        })
        .select('id')
        .single()

      if (insertQuery.error && (insertQuery.error.code === '42703' || insertQuery.error.message?.includes('ts'))) {
        insertQuery = await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            steps,
            source: sourceLabel,
          })
          .select('id')
          .single()
      }

      if (insertQuery.error) {
        console.error('[apple-health/sync] Error inserting activity_logs:', insertQuery.error)
      }
    } else if (existingQuery.error) {
      console.warn('[apple-health/sync] activity_logs query error (non-fatal):', existingQuery.error.message)
    }

    return NextResponse.json(
      {
        lastSyncedAt: syncedAt,
        steps,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('[apple-health/sync] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json(
      { lastSyncedAt: null, error: 'unexpected' },
      { status: 500 },
    )
  }
}


