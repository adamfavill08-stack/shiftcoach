import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/wearables/status
 *
 * Returns whether the current user has Google Fit connected (tokens stored).
 * When connected, verifies by calling Google Fit for today's steps and returns
 * stepsToday so the UI can show concrete proof the wearable is working.
 */
export async function GET() {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const { data: tokenRow, error } = await supabase
      .from('google_fit_tokens')
      .select('user_id, access_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[wearables/status] Error loading tokens:', error)
      return NextResponse.json({ connected: false, error: 'token_error' })
    }

    if (!tokenRow) {
      return NextResponse.json({ connected: false })
    }

    const accessToken = tokenRow.access_token as string
    if (!accessToken) {
      return NextResponse.json({ connected: true, verified: false })
    }

    // Verify: call Google Fit for today's steps so we can show concrete proof
    const endTimeMillis = Date.now()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTimeMillis = startOfDay.getTime()

    const fitResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis,
          endTimeMillis,
        }),
      }
    )

    const fitJson = await fitResponse.json()

    if (!fitResponse.ok) {
      console.error('[wearables/status] Google Fit verify error:', fitJson)
      return NextResponse.json({ connected: true, verified: false })
    }

    let totalSteps = 0
    const buckets = fitJson.bucket || []
    for (const bucket of buckets) {
      for (const ds of bucket.dataset || []) {
        for (const pt of ds.point || []) {
          const v = pt.value?.[0]
          const n =
            (typeof v?.intVal === 'number' ? v.intVal : 0) ||
            (typeof v?.fpVal === 'number' ? Math.round(v.fpVal) : 0)
          totalSteps += n
        }
      }
    }

    return NextResponse.json({
      connected: true,
      verified: true,
      stepsToday: totalSteps,
    })
  } catch (err) {
    console.error('[wearables/status] Unexpected error:', err)
    return NextResponse.json({ connected: false, error: 'unexpected' })
  }
}
