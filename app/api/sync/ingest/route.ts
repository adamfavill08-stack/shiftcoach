import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiUnauthorized, apiBadRequest, apiServerError } from '@/lib/api/response'
import { getBearerToken } from '@/lib/api/auth'
import { rateLimitByIp } from '@/lib/api/security'

const IngestSleepItemSchema = z.object({
  sampleId: z.string().trim().min(1).optional(),
  start: z.string(),
  end: z.string(),
  stage: z.enum(['asleep', 'inbed', 'light', 'deep', 'rem', 'awake']).optional(),
  quality: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

const IngestHeartRateItemSchema = z.object({
  bpm: z.number(),
  ts: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

const IngestPayloadSchema = z.object({
  platform: z.enum(['ios_healthkit', 'android_health_connect', 'health_connect', 'android_googlefit']),
  lastSyncedAt: z.string().nullable().optional(),
  sleep: z.array(IngestSleepItemSchema),
  heartRate: z.array(IngestHeartRateItemSchema).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const rateLimited = rateLimitByIp(req, 'api_sync_ingest_post', 60, 60_000)
    if (rateLimited) return rateLimited

    const token = getBearerToken(req)
    if (!token) return apiUnauthorized('Missing access token')

    // Verify token to get user id using service role client
    const { data: userInfo, error: verifyErr } = await supabaseServer.auth.getUser(token)
    if (verifyErr || !userInfo.user) {
      return apiUnauthorized('Invalid token')
    }
    const user_id = userInfo.user.id

    const parsed = await parseJsonBody(req, IngestPayloadSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
    const { platform, sleep } = body

    if (!platform || !Array.isArray(sleep)) {
      return apiBadRequest('invalid_payload', 'Bad payload')
    }

    // Upsert device_sources row
    await supabaseServer.from('device_sources').upsert({
      user_id,
      platform,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'user_id,platform' })

    // Sleep dedupe precedence:
    // 1) provider-native sampleId (stored in meta.sample_id) when present
    // 2) timestamp-window identity fallback via upsert on user/source/start/end
    if (sleep.length) {
      const rows = sleep.map(s => ({
        user_id,
        source: platform.includes('ios')
          ? 'apple_health'
          : (platform.includes('health_connect') ? 'health_connect' : 'google_fit'),
        start_at: new Date(s.start).toISOString(),
        end_at: new Date(s.end).toISOString(),
        stage: s.stage ?? 'asleep',
        quality: s.quality ?? null,
        meta: s.sampleId ? { ...(s.meta ?? {}), sample_id: s.sampleId } : (s.meta ?? {})
      }))
      .filter((r) => !Number.isNaN(new Date(r.start_at).getTime()) && !Number.isNaN(new Date(r.end_at).getTime()))

      const rowsWithSampleId = rows.filter((r) => typeof (r.meta as any)?.sample_id === 'string')
      const rowsWithoutSampleId = rows.filter((r) => typeof (r.meta as any)?.sample_id !== 'string')

      // Sample-id-first reconciliation.
      for (const row of rowsWithSampleId) {
        const sampleId = (row.meta as any).sample_id as string
        const { data: existingBySample } = await supabaseServer
          .from('sleep_records')
          .select('id')
          .eq('user_id', row.user_id)
          .eq('source', row.source)
          .contains('meta', { sample_id: sampleId })
          .limit(1)
          .maybeSingle()

        if (existingBySample?.id) {
          const { error: updateError } = await supabaseServer
            .from('sleep_records')
            .update({
              start_at: row.start_at,
              end_at: row.end_at,
              stage: row.stage,
              quality: row.quality,
              meta: row.meta,
            })
            .eq('id', existingBySample.id)
          if (updateError) {
            console.error('[ingest] sleep update-by-sample error', updateError)
          }
        } else {
          const { error: insertError } = await supabaseServer
            .from('sleep_records')
            .upsert([row], { onConflict: 'user_id,source,start_at,end_at' })
          if (insertError) {
            console.error('[ingest] sleep insert-by-sample error', insertError)
          }
        }
      }

      if (rowsWithoutSampleId.length > 0) {
        const { error } = await supabaseServer
          .from('sleep_records')
          .upsert(rowsWithoutSampleId, { onConflict: 'user_id,source,start_at,end_at' })
        if (error) {
          console.error('[ingest] insert error', error)
        }
      }
    }

    // Optional heart-rate ingestion for provider-agnostic pipeline.
    if (Array.isArray(body.heartRate) && body.heartRate.length > 0) {
      const source = platform.includes('ios')
        ? 'apple_health'
        : (platform.includes('health_connect') ? 'health_connect' : 'google_fit')

      const heartRows = body.heartRate
        .filter((h) => typeof h?.bpm === 'number' && typeof h?.ts === 'string')
        .map((h) => ({
          user_id,
          source,
          bpm: Math.max(1, Math.min(299, Math.round(h.bpm))),
          recorded_at: new Date(h.ts).toISOString(),
          meta: h.meta ?? {},
        }))
        .filter((r) => !Number.isNaN(new Date(r.recorded_at).getTime()))

      if (heartRows.length > 0) {
        const { error: hrError } = await supabaseServer
          .from('wearable_heart_rate_samples')
          .upsert(heartRows, { onConflict: 'user_id,source,recorded_at,bpm', ignoreDuplicates: true })

        if (hrError) {
          console.error('[ingest] heart-rate upsert error', hrError)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ingest] fatal', e)
    return apiServerError('unexpected_error', 'Server error')
  }
}

