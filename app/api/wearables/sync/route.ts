import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * POST /api/wearables/sync
 *
 * Uses Google Fit tokens (if connected) to pull today's steps and
 * upsert them into activity_logs. Also triggers a background sleep sync.
 * Returns lastSyncedAt + steps.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    // Load Google Fit tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_fit_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (tokenError) {
      console.error('[wearables/sync] Error loading Google Fit tokens:', tokenError)
      return NextResponse.json(
        { lastSyncedAt: null, error: 'google_fit_token_error' },
        { status: 500 }
      )
    }

    if (!tokenRow) {
      console.warn('[wearables/sync] No Google Fit tokens for user, skipping sync')
      return NextResponse.json(
        { lastSyncedAt: null, error: 'no_google_fit_connection' },
        { status: 200 }
      )
    }

    const accessToken = tokenRow.access_token as string

    // Build aggregate request for today's steps
    const endTimeMillis = Date.now()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTimeMillis = startOfDay.getTime()

    const aggregateBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
      ],
      bucketByTime: {
        durationMillis: endTimeMillis - startTimeMillis,
      },
      startTimeMillis,
      endTimeMillis,
    }

    const fitResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(aggregateBody),
      }
    )

    const fitJson = await fitResponse.json()

    if (!fitResponse.ok) {
      console.error('[wearables/sync] Google Fit error:', fitJson)
      return NextResponse.json(
        { lastSyncedAt: null, error: 'google_fit_api_error', details: fitJson },
        { status: 500 }
      )
    }

    // Sum steps from the aggregate response
    let totalSteps = 0
    const buckets = fitJson.bucket || []
    for (const bucket of buckets) {
      const datasets = bucket.dataset || []
      for (const ds of datasets) {
        const points = ds.point || []
        for (const pt of points) {
          const v = pt.value?.[0]
          const n =
            (typeof v?.intVal === 'number' ? v.intVal : 0) ||
            (typeof v?.fpVal === 'number' ? Math.round(v.fpVal) : 0)
          totalSteps += n
        }
      }
    }

    console.log('[wearables/sync] Google Fit total steps today:', totalSteps)

    // Upsert today's activity_logs entry
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

    // Fallback to created_at if ts doesn't exist
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

    const sourceLabel = 'Google Fit'

    if (!existingQuery.error && existingQuery.data) {
      // Update existing row
      const { error: updateError } = await supabase
        .from('activity_logs')
        .update({ steps: totalSteps, source: sourceLabel })
        .eq('id', existingQuery.data.id)

      if (updateError) {
        console.error('[wearables/sync] Error updating activity_logs:', updateError)
      }
    } else if (!existingQuery.error && !existingQuery.data) {
      // No existing row – insert new
      let insertQuery = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          steps: totalSteps,
          source: sourceLabel,
          ts: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertQuery.error && (insertQuery.error.code === '42703' || insertQuery.error.message?.includes('ts'))) {
        // Fallback without ts
        insertQuery = await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            steps: totalSteps,
            source: sourceLabel,
          })
          .select('id')
          .single()
      }

      if (insertQuery.error) {
        console.error('[wearables/sync] Error inserting activity_logs:', insertQuery.error)
      }
    } else if (existingQuery.error) {
      console.warn('[wearables/sync] activity_logs query error (non-fatal):', existingQuery.error.message)
    }

    const nowIso = new Date().toISOString()

    // Fire-and-forget sleep sync in the background (best effort)
    try {
      const url = new URL(req.url)
      const base = url.origin
      // Use absolute URL to avoid Next.js middleware issues
      fetch(`${base}/api/google-fit/sleep`).catch((sleepErr) => {
        console.warn('[wearables/sync] Sleep sync error (ignored):', sleepErr)
      })
    } catch (sleepErr) {
      console.warn('[wearables/sync] Failed to trigger sleep sync:', sleepErr)
    }

    return NextResponse.json(
      {
        lastSyncedAt: nowIso,
        steps: totalSteps,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[wearables/sync] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json(
      { lastSyncedAt: null, error: 'unexpected' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ lastSyncedAt: new Date().toISOString() })
}