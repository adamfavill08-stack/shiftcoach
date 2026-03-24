import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

/**
 * GET /api/wearables/heart-rate
 *
 * Provider-agnostic heart-rate endpoint.
 * Reads provider-ingested rows from wearable_heart_rate_samples.
 * Google Fit live API fallback is intentionally removed.
 */
export async function GET() {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // First: provider-agnostic ingested samples.
    const hrRows = await supabase
      .from('wearable_heart_rate_samples')
      .select('bpm, recorded_at, source')
      .eq('user_id', userId)
      .gte('recorded_at', sinceIso)
      .order('recorded_at', { ascending: false })
      .limit(500)

    if (!hrRows.error && hrRows.data && hrRows.data.length > 0) {
      const vals = hrRows.data
        .map((r: any) => (typeof r?.bpm === 'number' ? r.bpm : null))
        .filter((n: number | null): n is number => n != null && n > 0)

      if (vals.length > 0) {
        const resting = Math.min(...vals)
        const avg = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length)
        return NextResponse.json({
          resting_bpm: resting,
          avg_bpm: avg,
          source: hrRows.data[0]?.source ?? 'wearable',
          samples: vals.length,
        })
      }
    }

    return NextResponse.json(
      { error: 'no_wearable_connection' },
      { status: 404 }
    )
  } catch (err) {
    console.error('[wearables/heart-rate] Unexpected error:', err)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}

