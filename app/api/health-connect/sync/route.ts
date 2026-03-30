import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { rateLimitByIp } from '@/lib/api/security'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Aligns with /api/activity/today: some DBs use `ts`, others `created_at`. */
async function upsertTodayActivitySteps(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  syncedAt: string,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const today = new Date().toISOString().slice(0, 10)
  const startIso = new Date(today + 'T00:00:00Z').toISOString()
  const endIso = new Date(today + 'T23:59:59Z').toISOString()

  const attempt = async (timeCol: 'ts' | 'created_at') => {
    const { data: existing, error: selErr } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', userId)
      .gte(timeCol, startIso)
      .lt(timeCol, endIso)
      .order(timeCol, { ascending: false })
      .limit(1)
      .maybeSingle()
    if (selErr) return { error: selErr }
    const updatePayload =
      timeCol === 'ts'
        ? { steps, source: 'Health Connect', ts: syncedAt }
        : { steps, source: 'Health Connect' }
    const insertPayload =
      timeCol === 'ts'
        ? { user_id: userId, steps, source: 'Health Connect', ts: syncedAt }
        : { user_id: userId, steps, source: 'Health Connect' }
    if (existing?.id) {
      const { error } = await supabase.from('activity_logs').update(updatePayload).eq('id', existing.id)
      return { error: error ?? null }
    }
    const { error } = await supabase.from('activity_logs').insert(insertPayload)
    return { error: error ?? null }
  }

  let r = await attempt('ts')
  if (
    r.error &&
    (r.error.code === '42703' ||
      String(r.error.message ?? '').includes('ts') ||
      String(r.error.message ?? '').includes('column'))
  ) {
    r = await attempt('created_at')
  }
  return r
}

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
  sleep: z.array(SleepItemSchema).optional().default([]),
  heartRate: z.array(HeartRateItemSchema).optional().default([]),
  syncedAt: z.string().optional(),
})

/**
 * POST /api/health-connect/sync
 *
 * Session-authenticated Android ingestion path for Health Connect.
 * This reduces reliance on Google Fit for Android users.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimited = rateLimitByIp(req, 'api_health_connect_sync_post', 60, 60_000)
    if (rateLimited) return rateLimited

    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const parsed = await parseJsonBody(req, HealthConnectSyncSchema)
    if (!parsed.ok) return parsed.response
    const { steps: rawSteps, sleep, heartRate, syncedAt: rawSyncedAt } = parsed.data
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
      const { error: actErr } = await upsertTodayActivitySteps(supabase, userId, steps, syncedAt)
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

