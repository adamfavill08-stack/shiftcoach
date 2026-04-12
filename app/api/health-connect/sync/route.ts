import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { rateLimitByIp } from '@/lib/api/security'
import { upsertActivityLogDailySteps } from '@/lib/activity/upsertActivityLogDailySteps'

const SleepItemSchema = z.object({
  sampleId: z.string().trim().min(1).optional(),
  start: z.string(),
  end: z.string(),
  stage: z.string().optional(),
  quality: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

const HeartRateItemSchema = z.object({
  bpm: z.number(),
  ts: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

const HealthConnectSyncSchema = z.object({
  steps: z.number().optional(),
  /** Device-local civil date (YYYY-MM-DD) for the step total window — not server UTC day. */
  activityDate: z.string().optional(),
  sleep: z.array(SleepItemSchema).optional().default([]),
  heartRate: z.array(HeartRateItemSchema).optional().default([]),
  syncedAt: z.string().optional(),
})

/**
 * POST /api/health-connect/sync
 *
 * Session-authenticated Android ingestion path for Health Connect.
 * Step totals can include watch, phone, and any permitted apps writing to HC;
 * the native client sums records and ShiftCoach stores that unified total.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimited = rateLimitByIp(req, 'api_health_connect_sync_post', 60, 60_000)
    if (rateLimited) return rateLimited

    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const parsed = await parseJsonBody(req, HealthConnectSyncSchema)
    if (!parsed.ok) return parsed.response
    const { steps: rawSteps, activityDate, sleep, heartRate, syncedAt: rawSyncedAt } = parsed.data
    const steps = typeof rawSteps === 'number' ? Math.max(0, Math.round(rawSteps)) : null
    const syncedAt = typeof rawSyncedAt === 'string' ? rawSyncedAt : new Date().toISOString()

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    await supabase
      .from('device_sources')
      .upsert(
        { user_id: userId, platform: 'android_health_connect', last_synced_at: syncedAt },
        { onConflict: 'user_id,platform' }
      )

    if (steps != null) {
      const { error: actErr } = await upsertActivityLogDailySteps(supabase, userId, {
        steps,
        syncedAt,
        source: 'Health Connect',
        activityDate,
      })
      if (actErr) {
        console.error('[health-connect/sync] activity_logs upsert:', actErr.message ?? actErr)
      }
    }

    if (sleep.length > 0) {
      const rows = sleep
        .map((s) => ({
          user_id: userId,
          source: 'health_connect',
          start_at: new Date(s.start).toISOString(),
          end_at: new Date(s.end).toISOString(),
          stage: s.stage ?? 'asleep',
          quality: s.quality ?? null,
          meta: s.sampleId ? { ...(s.meta ?? {}), sample_id: s.sampleId } : (s.meta ?? {}),
        }))
        .filter((r) => !Number.isNaN(new Date(r.start_at).getTime()) && !Number.isNaN(new Date(r.end_at).getTime()))

      if (rows.length > 0) {
        const rowsWithSampleId = rows.filter((r) => typeof (r.meta as any)?.sample_id === 'string')
        const rowsWithoutSampleId = rows.filter((r) => typeof (r.meta as any)?.sample_id !== 'string')

        for (const row of rowsWithSampleId) {
          const sampleId = (row.meta as any).sample_id as string
          const { data: existingBySample } = await supabase
            .from('sleep_records')
            .select('id')
            .eq('user_id', row.user_id)
            .eq('source', row.source)
            .contains('meta', { sample_id: sampleId })
            .limit(1)
            .maybeSingle()

          if (existingBySample?.id) {
            await supabase
              .from('sleep_records')
              .update({
                start_at: row.start_at,
                end_at: row.end_at,
                stage: row.stage,
                quality: row.quality,
                meta: row.meta,
              })
              .eq('id', existingBySample.id)
          } else {
            await supabase
              .from('sleep_records')
              .upsert([row], { onConflict: 'user_id,source,start_at,end_at' })
          }
        }

        if (rowsWithoutSampleId.length > 0) {
          await supabase
            .from('sleep_records')
            .upsert(rowsWithoutSampleId, { onConflict: 'user_id,source,start_at,end_at' })
        }
      }
    }

    if (heartRate.length > 0) {
      const hrRows = heartRate
        .map((h) => ({
          user_id: userId,
          source: 'health_connect',
          bpm: Math.max(1, Math.min(299, Math.round(h.bpm))),
          recorded_at: new Date(h.ts).toISOString(),
          meta: h.meta ?? {},
        }))
        .filter((r) => !Number.isNaN(new Date(r.recorded_at).getTime()))

      if (hrRows.length > 0) {
        await supabase
          .from('wearable_heart_rate_samples')
          .upsert(hrRows, { onConflict: 'user_id,source,recorded_at,bpm', ignoreDuplicates: true })
      }
    }

    return NextResponse.json({
      ok: true,
      provider: 'health_connect',
      lastSyncedAt: syncedAt,
      accepted: {
        steps: steps != null,
        sleepCount: sleep.length,
        heartRateCount: heartRate.length,
      },
    })
  } catch (err: any) {
    console.error('[health-connect/sync] fatal', err)
    return apiServerError('unexpected_error', 'Server error')
  }
}

