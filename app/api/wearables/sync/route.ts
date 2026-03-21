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

    // Shift workers: aggregate steps from the rota shift start - 1h -> shift end + 1h.
    // This avoids midnight resets for night shifts.
    const SHIFT_WINDOW_BUFFER_MS = 60 * 60 * 1000
    const now = new Date()
    const nowIso = now.toISOString()
    const nowPlusBufferAfterIso = new Date(now.getTime() + SHIFT_WINDOW_BUFFER_MS).toISOString()
    const nowMinusBufferBeforeIso = new Date(now.getTime() - SHIFT_WINDOW_BUFFER_MS).toISOString()

    let shift:
      | { start_ts: string | null; end_ts: string | null }
      | null = null

    const { data: shiftInProgress } = await supabase
      .from('shifts')
      .select('start_ts,end_ts')
      .eq('user_id', userId)
      // Include shifts whose start is up to 1 hour in the future (travel buffer).
      .lte('start_ts', nowPlusBufferAfterIso)
      // And still consider it active for 1 hour after the shift ends.
      .gt('end_ts', nowMinusBufferBeforeIso)
      .maybeSingle()

    if (shiftInProgress) {
      shift = shiftInProgress as any
    } else {
      const { data: lastStartedShift } = await supabase
        .from('shifts')
        .select('start_ts,end_ts')
        .eq('user_id', userId)
        .lte('start_ts', nowPlusBufferAfterIso)
        .gt('end_ts', nowMinusBufferBeforeIso)
        .order('start_ts', { ascending: false })
        .limit(1)
        .maybeSingle()

      shift = (lastStartedShift as any) ?? null
    }

    const fallbackStartOfDay = new Date()
    fallbackStartOfDay.setHours(0, 0, 0, 0)

    const windowStartDate = shift?.start_ts
      ? new Date(new Date(shift.start_ts).getTime() - SHIFT_WINDOW_BUFFER_MS)
      : fallbackStartOfDay
    let windowEndDate = shift?.end_ts
      ? new Date(new Date(shift.end_ts).getTime() + SHIFT_WINDOW_BUFFER_MS)
      : now

    // If shift end is in the future (shouldn't happen for "in progress"), cap it to now.
    if (windowEndDate.getTime() > now.getTime()) windowEndDate = now
    // Safety: ensure a positive range
    if (windowEndDate.getTime() <= windowStartDate.getTime()) {
      windowStartDate.setHours(0, 0, 0, 0)
      windowEndDate = now
    }

    const startTimeMillis = windowStartDate.getTime()
    const endTimeMillis = windowEndDate.getTime()

    const aggregateBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
      ],
      bucketByTime: {
        durationMillis: Math.max(1, endTimeMillis - startTimeMillis),
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
      // Google Fit tokens often expire. This sync endpoint is also used to notify
      // the UI that wearable data ingestion is done, so treat Google Fit failures
      // as non-fatal and return 200 to keep the "wearables-synced" event flowing.
      console.warn('[wearables/sync] Google Fit error (steps):', fitJson)
      return NextResponse.json(
        {
          lastSyncedAt: new Date().toISOString(),
          steps: 0,
          error: 'google_fit_api_error',
          details: fitJson,
        },
        { status: 200 }
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

    // Upsert the activity_logs entry for the current shift window
    const startIso = windowStartDate.toISOString()
    const endIso = windowEndDate.toISOString()

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
          // Keep ts stable for this shift so we don't create multiple rows
          // during long shifts that cross midnight.
          ts: startIso,
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