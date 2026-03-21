import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/google-fit/steps
 *
 * Debug endpoint: fetches the user's Google Fit steps for today using the
 * stored tokens in google_fit_tokens. For now it just returns raw data.
 */
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()

    // Use service-role Supabase client to bypass RLS for token lookup
    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    // Load tokens from Supabase
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_fit_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (tokenError) {
      console.error('[google-fit/steps] Error loading tokens:', tokenError)
      return NextResponse.json(
        { error: 'Failed to load Google Fit tokens' },
        { status: 500 }
      )
    }

    if (!tokenRow) {
      return NextResponse.json(
        { error: 'No Google Fit connection found for this user' },
        { status: 404 }
      )
    }

    const accessToken = tokenRow.access_token as string

    // Build a simple aggregate request for steps today
    const endTimeMillis = Date.now()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTimeMillis = startOfDay.getTime()

    const aggregateBody = {
      aggregateBy: [
        {
          dataTypeName: 'com.google.step_count.delta',
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
      console.error('[google-fit/steps] Google Fit error:', fitJson)
      return NextResponse.json(
        { error: 'Failed to fetch steps from Google Fit', details: fitJson },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        userId,
        startTimeMillis,
        endTimeMillis,
        raw: fitJson,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[google-fit/steps] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    )
  }
}


