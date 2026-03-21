import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/google-fit/heart-rate
 *
 * Debug endpoint: fetches heart rate from Google Fit for the last 24h
 * and returns resting (min) and average bpm. For now it does not write
 * to the database – this is for inspection and planning.
 */
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_fit_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (tokenError) {
      console.error('[google-fit/heart-rate] Error loading tokens:', tokenError)
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

    const endTimeMillis = Date.now()
    const startTimeMillis = endTimeMillis - 24 * 60 * 60 * 1000

    const aggregateBody = {
      aggregateBy: [
        {
          dataTypeName: 'com.google.heart_rate.bpm',
        },
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
      console.error('[google-fit/heart-rate] Google Fit error:', fitJson)
      return NextResponse.json(
        { error: 'google_fit_api_error', details: fitJson },
        { status: 500 }
      )
    }

    const buckets = fitJson.bucket || []
    const bpmValues: number[] = []

    for (const bucket of buckets) {
      const datasets = bucket.dataset || []
      for (const ds of datasets) {
        const points = ds.point || []
        for (const pt of points) {
          const v = pt.value?.[0]
          const n =
            (typeof v?.fpVal === 'number' ? v.fpVal : undefined) ??
            (typeof v?.intVal === 'number' ? v.intVal : undefined)
          if (typeof n === 'number' && n > 0) {
            bpmValues.push(n)
          }
        }
      }
    }

    if (!bpmValues.length) {
      console.log('[google-fit/heart-rate] No heart rate data in last 24h')
      return NextResponse.json(
        { message: 'no_heart_rate_data', resting_bpm: null, avg_bpm: null },
        { status: 200 }
      )
    }

    const restingBpm = Math.min(...bpmValues)
    const avgBpm =
      bpmValues.reduce((sum, v) => sum + v, 0) / bpmValues.length

    return NextResponse.json(
      {
        userId,
        resting_bpm: Math.round(restingBpm),
        avg_bpm: Math.round(avgBpm),
        count: bpmValues.length,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[google-fit/heart-rate] Unexpected error:', {
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


