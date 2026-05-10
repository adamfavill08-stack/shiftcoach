import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { rateLimitByIp } from '@/lib/api/security'
import { upsertActivityLogDailySteps } from '@/lib/activity/upsertActivityLogDailySteps'
import {
  fetchWearableDailyStepsForSource,
  supersedeManualLogsAfterWearableDelta,
} from '@/lib/activity/manualWearableSupersede'
import { mergeHealthConnectDailyStepsByDate } from '@/lib/health-connect/mergeHealthConnectDailyStepsByDate'
import { healthConnectSleepItemSchema } from '@/lib/health-connect/healthConnectSleepItemSchema'
import { withSyntheticHcSampleIds } from '@/lib/health-connect/withSyntheticHcSampleIds'

const ANDROID_HEALTH_PROVIDER = 'android_health_connect'

const YMD = /^\d{4}-\d{2}-\d{2}$/

const DailyStepItemSchema = z.object({
  activityDate: z.string(),
  steps: z.number(),
})

const StepSampleItemSchema = z.object({
  timestamp: z.string(),
  steps: z.number(),
  endTimestamp: z.string().optional(),
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
  /** Last N local days from Health Connect (typically 7), one row per activity_date. */
  dailySteps: z.array(DailyStepItemSchema).optional().default([]),
  /** Fine-grained wearable buckets (expected 15-minute windows). */
  stepSamples: z.array(StepSampleItemSchema).optional().default([]),
  /** Native: count of Steps interval records read for `activityDate` (same-day sum). */
  stepRecordsReadToday: z.number().int().optional(),
  firstStepRecordAt: z.string().optional(),
  lastStepRecordAt: z.string().optional(),
  /** Preferred `logged_at` for today's row (latest sample end or sync time). */
  loggedAt: z.string().optional(),
  sleep: z.array(healthConnectSleepItemSchema).optional().default([]),
  heartRate: z.array(HeartRateItemSchema).optional().default([]),
  syncedAt: z.string().optional(),
})

function formatYmdFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function dedupeStepSamplesByStart<T extends { bucket_start_utc: string; steps: number }>(rows: T[]): T[] {
  const map = new Map<string, T>()
  for (const row of rows) {
    const key = row.bucket_start_utc
    const prev = map.get(key)
    if (!prev || row.steps >= prev.steps) map.set(key, row)
  }
  return [...map.values()].sort((a, b) => a.bucket_start_utc.localeCompare(b.bucket_start_utc))
}

const isDevServer = process.env.NODE_ENV === 'development'

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
    const {
      steps: rawSteps,
      activityDate,
      dailySteps: rawDailySteps,
      stepSamples: rawStepSamples,
      stepRecordsReadToday,
      firstStepRecordAt,
      lastStepRecordAt,
      loggedAt: rawLoggedAt,
      sleep,
      heartRate,
      syncedAt: rawSyncedAt,
    } = parsed.data
    const steps = typeof rawSteps === 'number' ? Math.max(0, Math.round(rawSteps)) : null
    const syncedAt = typeof rawSyncedAt === 'string' ? rawSyncedAt : new Date().toISOString()
    const sleepForPersist = withSyntheticHcSampleIds(userId, sleep)

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    await supabase
      .from('device_sources')
      .upsert(
        { user_id: userId, platform: ANDROID_HEALTH_PROVIDER, last_synced_at: syncedAt },
        { onConflict: 'user_id,platform' },
      )

    let activityLogUpsertOk = false
    let stepSamplesPersisted = 0
    let persistedDailyStepsCount = 0
    let dailyStepsTotalReceived = 0
    const datesPersisted: string[] = []
    const normalizedDaily = (rawDailySteps ?? [])
      .filter((d) => YMD.test(String(d.activityDate ?? '').trim()) && Number.isFinite(d.steps))
      .map((d) => ({
        activityDate: String(d.activityDate).trim().slice(0, 10),
        steps: Math.max(0, Math.round(d.steps)),
      }))
    const dailyLimited = mergeHealthConnectDailyStepsByDate(normalizedDaily).slice(0, 14)

    const clientToday =
      typeof activityDate === 'string' && YMD.test(String(activityDate).trim())
        ? String(activityDate).trim().slice(0, 10)
        : null
    const loggedAtForToday =
      typeof lastStepRecordAt === 'string' && lastStepRecordAt.trim()
        ? lastStepRecordAt.trim()
        : typeof rawLoggedAt === 'string' && rawLoggedAt.trim()
          ? rawLoggedAt.trim()
          : syncedAt

    let todayPersisted = false
    let todayStepsWritten: number | null = null
    let todayUpsertError: string | null = null

    for (const row of dailyLimited) {
      dailyStepsTotalReceived += row.steps
      const prevSteps = await fetchWearableDailyStepsForSource(supabase, userId, row.activityDate, 'health_connect')
      const loggedAtForRow = clientToday != null && row.activityDate === clientToday ? loggedAtForToday : syncedAt
      const { error: actErr } = await upsertActivityLogDailySteps(supabase, userId, {
        steps: row.steps,
        syncedAt,
        source: 'health_connect',
        activityDate: row.activityDate,
        loggedAt: loggedAtForRow,
      })
      if (actErr) {
        console.error('[health-connect/sync] activity_logs daily upsert:', row.activityDate, actErr.message ?? actErr)
        if (clientToday != null && row.activityDate === clientToday) {
          todayUpsertError = actErr.message ?? String(actErr)
        }
      } else {
        persistedDailyStepsCount += 1
        datesPersisted.push(row.activityDate)
        if (clientToday != null && row.activityDate === clientToday) {
          todayPersisted = true
          todayStepsWritten = row.steps
        }
        if (prevSteps != null) {
          const delta = row.steps - prevSteps
          if (delta > 0) {
            await supersedeManualLogsAfterWearableDelta(supabase, userId, row.activityDate, delta, 'health_connect')
          }
        }
      }
    }

    activityLogUpsertOk = persistedDailyStepsCount > 0

    if (dailyLimited.length === 0 && steps != null) {
      const ad = typeof activityDate === 'string' && YMD.test(String(activityDate).trim()) ? String(activityDate).trim().slice(0, 10) : null
      const prevSteps = ad ? await fetchWearableDailyStepsForSource(supabase, userId, ad, 'health_connect') : null
      const { error: actErr } = await upsertActivityLogDailySteps(supabase, userId, {
        steps,
        syncedAt,
        source: 'health_connect',
        activityDate,
        loggedAt: loggedAtForToday,
      })
      if (actErr) {
        console.error('[health-connect/sync] activity_logs upsert:', actErr.message ?? actErr)
        activityLogUpsertOk = false
        if (ad && clientToday === ad) {
          todayUpsertError = actErr.message ?? String(actErr)
        }
      } else {
        activityLogUpsertOk = true
        if (ad && clientToday === ad) {
          todayPersisted = true
          todayStepsWritten = steps
        }
        if (ad && prevSteps != null) {
          const delta = steps - prevSteps
          if (delta > 0) {
            await supersedeManualLogsAfterWearableDelta(supabase, userId, ad, delta, 'health_connect')
          }
        }
      }
    }

    const normalizedSamples = (rawStepSamples ?? [])
      .map((sample) => {
        const startMs = Date.parse(String(sample.timestamp ?? ''))
        const endMs = sample.endTimestamp ? Date.parse(String(sample.endTimestamp)) : NaN
        const stepsInBucket = Number.isFinite(sample.steps) ? Math.max(0, Math.round(sample.steps)) : 0
        if (!Number.isFinite(startMs)) return null
        const startIso = new Date(startMs).toISOString()
        const endIso = Number.isFinite(endMs) ? new Date(endMs).toISOString() : null
        return {
          user_id: userId,
          source: 'health_connect',
          activity_date: formatYmdFromIso(startIso),
          bucket_start_utc: startIso,
          bucket_end_utc: endIso,
          steps: stepsInBucket,
        }
      })
      .filter((row): row is {
        user_id: string
        source: string
        activity_date: string
        bucket_start_utc: string
        bucket_end_utc: string | null
        steps: number
      } => row != null)

    if (normalizedSamples.length > 0) {
      // 4 days of 15-minute samples = 384 rows. Keep headroom for retries.
      const deduped = dedupeStepSamplesByStart(normalizedSamples).slice(0, 576)
      const { error: stepSamplesErr } = await supabase
        .from('wearable_step_samples')
        .upsert(deduped, { onConflict: 'user_id,source,bucket_start_utc' })
      if (stepSamplesErr) {
        console.error('[health-connect/sync] wearable_step_samples upsert:', stepSamplesErr.message ?? stepSamplesErr)
      } else {
        stepSamplesPersisted = deduped.length
      }
    }

    let sleepSessionsPersisted = 0
    let sleepUpsertErrors = 0
    let heartRateSamplesPersisted = 0
    let heartRateUpsertOk = true

    if (sleepForPersist.length > 0) {
      console.info('[HC-sleep-sync] received=', sleep.length, 'normalized=', sleepForPersist.length)
      const rows = sleepForPersist
        .map((s) => ({
          user_id: userId,
          source: 'health_connect',
          start_at: new Date(s.start).toISOString(),
          end_at: new Date(s.end).toISOString(),
          stage: s.stage ?? 'asleep',
          quality: s.quality ?? null,
          meta: {
            ...(s.meta ?? {}),
            ...(s.sampleId ? { sample_id: s.sampleId } : {}),
          },
        }))
        .filter((r) => !Number.isNaN(new Date(r.start_at).getTime()) && !Number.isNaN(new Date(r.end_at).getTime()))

      if (rows.length > 0) {
        // Dedupe: sample_id path + upsert on (user_id, source, start_at, end_at). source is always
        // 'health_connect' here — manual sleep rows use source 'manual' and are never selected/updated.
        const rowsWithSampleId = rows.filter((r) => typeof (r.meta as { sample_id?: string })?.sample_id === 'string')
        const rowsWithoutSampleId = rows.filter(
          (r) => typeof (r.meta as { sample_id?: string })?.sample_id !== 'string',
        )

        for (const row of rowsWithSampleId) {
          const sampleId = (row.meta as { sample_id: string }).sample_id
          const { data: existingBySample, error: selErr } = await supabase
            .from('sleep_records')
            .select('id')
            .eq('user_id', row.user_id)
            .eq('source', row.source)
            .contains('meta', { sample_id: sampleId })
            .limit(1)
            .maybeSingle()

          if (selErr) {
            sleepUpsertErrors += 1
            continue
          }

          if (existingBySample?.id) {
            const { error: upErr } = await supabase
              .from('sleep_records')
              .update({
                start_at: row.start_at,
                end_at: row.end_at,
                stage: row.stage,
                quality: row.quality,
                meta: row.meta,
              })
              .eq('id', existingBySample.id)
            if (upErr) sleepUpsertErrors += 1
            else sleepSessionsPersisted += 1
          } else {
            const { error: insErr } = await supabase
              .from('sleep_records')
              .upsert([row], { onConflict: 'user_id,source,start_at,end_at' })
            if (insErr) sleepUpsertErrors += 1
            else sleepSessionsPersisted += 1
          }
        }

        if (rowsWithoutSampleId.length > 0) {
          const { error: batchErr } = await supabase
            .from('sleep_records')
            .upsert(rowsWithoutSampleId, { onConflict: 'user_id,source,start_at,end_at' })
          if (batchErr) {
            sleepUpsertErrors += rowsWithoutSampleId.length
          } else {
            sleepSessionsPersisted += rowsWithoutSampleId.length
          }
        }
      }
      console.info('[HC-sleep-sync] persisted=', sleepSessionsPersisted, 'errors=', sleepUpsertErrors)
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
        const { error: hrErr } = await supabase
          .from('wearable_heart_rate_samples')
          .upsert(hrRows, { onConflict: 'user_id,source,recorded_at,bpm', ignoreDuplicates: true })
        if (hrErr) {
          heartRateUpsertOk = false
          console.error('[health-connect/sync] wearable_heart_rate_samples upsert:', hrErr.message ?? hrErr)
        } else {
          heartRateSamplesPersisted = hrRows.length
        }
      }
    }

    const persisted = {
      stepsPersisted: activityLogUpsertOk,
      persistedDailyStepsCount,
      dailyStepsCount: dailyLimited.length,
      dailyStepsTotal: dailyStepsTotalReceived,
      stepSamplesPersisted,
      datesPersisted: [...new Set(datesPersisted)].sort(),
      sleepSessionsPersisted,
      heartRateSamplesPersisted: heartRateUpsertOk ? heartRateSamplesPersisted : 0,
    }

    const stepsRead =
      clientToday != null
        ? (dailyLimited.find((d) => d.activityDate === clientToday)?.steps ?? steps ?? 0)
        : (steps ?? 0)
    const stepRecordsRead = typeof stepRecordsReadToday === 'number' ? stepRecordsReadToday : 0
    const stepsSaved = todayPersisted && todayStepsWritten != null ? todayStepsWritten : 0

    const syncResult = {
      stepsRead,
      stepRecordsRead,
      stepsSaved,
      activityDate: clientToday ?? '',
      saved: todayPersisted,
      source: 'health_connect' as const,
    }

    const jsonBody: Record<string, unknown> = {
      ok: true,
      provider: ANDROID_HEALTH_PROVIDER,
      lastSyncedAt: syncedAt,
      accepted: {
        steps: steps != null,
        dailyStepsCount: dailyLimited.length,
        stepSamplesCount: normalizedSamples.length,
        sleepCount: sleepForPersist.length,
        heartRateCount: heartRate.length,
      },
      persisted,
      syncResult,
    }

    if (isDevServer) {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const latestActivityRes = await supabase
        .from('activity_logs')
        .select('activity_date, steps, ts, source')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle()

      const latestSleepRes = await supabase
        .from('sleep_records')
        .select('start_at, end_at, source, stage')
        .eq('user_id', userId)
        .eq('source', 'health_connect')
        .order('end_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const latestHrRes = await supabase
        .from('wearable_heart_rate_samples')
        .select('recorded_at, bpm, source')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: hrCount24h } = await supabase
        .from('wearable_heart_rate_samples')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('recorded_at', since24h)

      const deviceSrcRes = await supabase
        .from('device_sources')
        .select('last_synced_at')
        .eq('user_id', userId)
        .eq('platform', ANDROID_HEALTH_PROVIDER)
        .maybeSingle()

      const la = latestActivityRes.data
      const ls = latestSleepRes.data
      const lh = latestHrRes.data

      jsonBody._devSyncDiagnostics = {
        authenticatedUserIdPresent: true,
        received: {
          stepsTotal: steps,
          activityDate: activityDate ?? null,
          dailyStepsCount: dailyLimited.length,
          dailyStepsTotalReceived,
          stepRecordsReadToday: stepRecordsReadToday ?? null,
          firstStepRecordAt: firstStepRecordAt ?? null,
          lastStepRecordAt: lastStepRecordAt ?? null,
          loggedAt: rawLoggedAt ?? null,
          sleepSessionCount: sleepForPersist.length,
          heartRateSampleCount: heartRate.length,
        },
        todayPersist: {
          todayPersisted,
          todayStepsWritten,
          todayUpsertError,
        },
        persistedDetails: {
          activityLogUpsertOk,
          persistedDailyStepsCount,
          datesPersisted: [...new Set(datesPersisted)].sort(),
          sleepSessionsPersisted,
          sleepUpsertErrors,
          heartRateSamplesReceived: heartRate.length,
          heartRateUpsertOk,
        },
        latestSaved: {
          activityLog: la
            ? {
                activity_date: la.activity_date ?? null,
                steps: la.steps ?? null,
                ts: la.ts ?? null,
                source: la.source ?? null,
              }
            : null,
          sleepRecord: ls
            ? {
                start_at: ls.start_at,
                end_at: ls.end_at,
                source: ls.source,
                stage: ls.stage,
              }
            : null,
          heartRate: lh
            ? { recorded_at: lh.recorded_at, bpm: lh.bpm, source: lh.source }
            : null,
          heartRateRowsLast24h: typeof hrCount24h === 'number' ? hrCount24h : null,
          deviceSourceLastSyncedAt: deviceSrcRes.data?.last_synced_at ?? null,
        },
        queryErrors: {
          latestActivity: latestActivityRes.error?.message ?? null,
          latestSleep: latestSleepRes.error?.message ?? null,
          latestHr: latestHrRes.error?.message ?? null,
          deviceSource: deviceSrcRes.error?.message ?? null,
        },
      }
    }

    return NextResponse.json(jsonBody)
  } catch (err: unknown) {
    console.error('[health-connect/sync] fatal', err)
    return apiServerError('unexpected_error', 'Server error')
  }
}
