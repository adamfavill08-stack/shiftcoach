import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { upsertActivityLogDailySteps } from '@/lib/activity/upsertActivityLogDailySteps'

const AppleHealthSyncSchema = z.object({
  steps: z.number(),
  source: z.string().trim().min(1).optional(),
  syncedAt: z.string().optional(),
  /** Device-local civil date (YYYY-MM-DD) for the step total — not server UTC day. */
  activityDate: z.string().optional(),
})

/**
 * POST /api/apple-health/sync
 *
 * This endpoint is designed for a native iOS client (or backend worker)
 * that reads Apple Health via HealthKit. HealthKit often aggregates iPhone
 * motion and Apple Watch into one step total—pass that value through; there is
 * no separate phone-only sync path in ShiftCoach.
 *
 * It mirrors the behaviour of /api/wearables/sync (Google Fit):
 * - Upserts daily steps into activity_logs (by activityDate when provided, else legacy UTC-day window)
 * - Records the wearable source as "Apple Health"
 *
 * Request body (JSON):
 * {
 *   steps: number;
 *   source?: string;
 *   syncedAt?: string;
 *   activityDate?: string;  // YYYY-MM-DD logical day for steps (recommended)
 * }
 *
 * This does NOT talk to Apple directly; your iOS app should call this after
 * reading HealthKit, so the rest of the app can treat Apple and Google Fit
 * uniformly.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const parsed = await parseJsonBody(req, AppleHealthSyncSchema)
    if (!parsed.ok) return parsed.response
    const steps = Math.max(0, Math.round(parsed.data.steps))
    const sourceOverride = parsed.data.source ?? null
    const syncedAt = parsed.data.syncedAt ?? new Date().toISOString()
    const activityDate = parsed.data.activityDate

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const sourceLabel = sourceOverride || 'Apple Health'

    const { error: actErr } = await upsertActivityLogDailySteps(supabase, userId, {
      steps,
      syncedAt,
      source: sourceLabel,
      activityDate,
    })
    if (actErr) {
      console.error('[apple-health/sync] activity_logs upsert:', actErr.message ?? actErr)
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
    return apiServerError('unexpected_error', 'Unexpected error')
  }
}
