import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/google-fit/sleep
 *
 * Debug endpoint to pull sleep from Google Fit for roughly the last 24 hours
 * and write it into sleep_logs. For now we treat the entire window of
 * com.google.sleep.segment points as one main sleep.
 */
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()

    // Use service-role client so RLS doesn't block writes
    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    // Load Google Fit tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_fit_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (tokenError) {
      console.error('[google-fit/sleep] Error loading tokens:', tokenError)
      return NextResponse.json(
        { error: 'google_fit_token_error' },
        { status: 500 }
      )
    }

    if (!tokenRow) {
      return NextResponse.json(
        { error: 'no_google_fit_connection' },
        { status: 404 }
      )
    }

    const accessToken = tokenRow.access_token as string

    // Look back 3 days from now to be more forgiving if sync is delayed
    const endTimeMillis = Date.now()
    const startTimeMillis = endTimeMillis - 3 * 24 * 60 * 60 * 1000

    const aggregateBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.sleep.segment' },
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
      console.error('[google-fit/sleep] Google Fit error:', fitJson)
      return NextResponse.json(
        { error: 'google_fit_api_error', details: fitJson },
        { status: 500 }
      )
    }

    // Flatten points
    const buckets = fitJson.bucket || []
    const points: any[] = []
    for (const bucket of buckets) {
      const datasets = bucket.dataset || []
      for (const ds of datasets) {
        const pts = ds.point || []
        pts.forEach((p: any) => points.push(p))
      }
    }

    if (!points.length) {
      console.log('[google-fit/sleep] No sleep points in lookback window')
      return NextResponse.json(
        { message: 'no_sleep_data', inserted: false },
        { status: 200 }
      )
    }

    // Use earliest start and latest end across all points
    const nanosToDate = (nanos: string | number) =>
      new Date(Number(nanos) / 1_000_000) // nanos → ms

    const sorted = points
      .filter((p) => p.startTimeNanos && p.endTimeNanos)
      .sort(
        (a, b) =>
          Number(a.startTimeNanos) - Number(b.startTimeNanos)
      )

    if (!sorted.length) {
      console.log('[google-fit/sleep] Points missing time data')
      return NextResponse.json(
        { message: 'no_valid_sleep_points', inserted: false },
        { status: 200 }
      )
    }

    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    const startAt = nanosToDate(first.startTimeNanos).toISOString()
    const endAt = nanosToDate(last.endTimeNanos).toISOString()

    console.log('[google-fit/sleep] Detected sleep window:', {
      startAt,
      endAt,
      pointCount: sorted.length,
    })

    // Insert into sleep_logs using new schema (start_at/end_at/type/source)
    const insertData: any = {
      user_id: userId,
      type: 'sleep',
      start_at: startAt,
      end_at: endAt,
      quality: null,
      notes: 'Imported from Google Fit',
      source: 'google_fit',
    }

    const { data: insertRes, error: insertError } = await supabase
      .from('sleep_logs')
      .insert(insertData)
      .select()

    if (insertError) {
      console.error('[google-fit/sleep] Insert error:', insertError)
      return NextResponse.json(
        { error: 'sleep_insert_failed', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('[google-fit/sleep] Inserted sleep row:', insertRes)

    return NextResponse.json(
      {
        inserted: true,
        startAt,
        endAt,
        rows: insertRes,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[google-fit/sleep] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json(
      { error: 'unexpected', details: err?.message },
      { status: 500 }
    )
  }
}


