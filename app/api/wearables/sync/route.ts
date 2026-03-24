import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

const WearablesSyncSchema = z.object({
  provider: z.enum(['health_connect', 'apple_health']).optional(),
})

/**
 * POST /api/wearables/sync
 *
 * Provider-aware sync marker endpoint.
 * Android/iOS native sources (Health Connect / Apple Health) are the primary path.
 * Google Fit is deprecated and no longer used as a required provider.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const parsed = await parseJsonBody(req, WearablesSyncSchema)
    if (!parsed.ok) return parsed.response
    const requestedProvider = parsed.data.provider ?? null

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const sourceRows = await supabase
      .from('device_sources')
      .select('platform,last_synced_at')
      .eq('user_id', userId)

    const platforms = (sourceRows.data ?? []).map((r: any) => String(r.platform || ''))
    const hasHealthConnect = platforms.some((p: string) => p === 'android_health_connect' || p === 'health_connect')
    const hasAppleHealth = platforms.some((p: string) => p === 'ios_healthkit' || p === 'apple_health')

    const provider =
      requestedProvider ??
      (hasHealthConnect ? 'health_connect' : hasAppleHealth ? 'apple_health' : null)

    if (!provider) {
      return NextResponse.json(
        { lastSyncedAt: null, error: 'no_wearable_connection' },
        { status: 200 }
      )
    }

    const latestActivity = await supabase
      .from('activity_logs')
      .select('steps,source,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json(
      {
        lastSyncedAt: new Date().toISOString(),
        provider,
        steps: typeof latestActivity.data?.steps === 'number' ? latestActivity.data.steps : 0,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[wearables/sync] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return apiServerError('unexpected_error', 'Unexpected error')
  }
}

export async function GET() {
  return NextResponse.json({ lastSyncedAt: new Date().toISOString() })
}

