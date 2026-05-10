import { z } from 'zod'

/** One Health Connect sleep session from the Android bridge (flexible field names). */
export const healthConnectSleepItemSchema = z
  .object({
    sampleId: z.string().trim().min(1).optional(),
    external_id: z.string().trim().min(1).optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    started_at: z.string().optional(),
    ended_at: z.string().optional(),
    duration_minutes: z.number().optional(),
    source: z.string().optional(),
    stages: z.array(z.record(z.string(), z.unknown())).optional(),
    stage: z.string().optional(),
    quality: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .transform((raw) => {
    const start = String(raw.start ?? raw.started_at ?? '').trim()
    const end = String(raw.end ?? raw.ended_at ?? '').trim()
    const id = raw.sampleId?.trim() || raw.external_id?.trim()
    const extraMeta: Record<string, unknown> = { ...(raw.meta ?? {}) }
    if (id) {
      extraMeta.sample_id = id
      extraMeta.external_id = id
    }
    if (typeof raw.duration_minutes === 'number' && Number.isFinite(raw.duration_minutes)) {
      extraMeta.hc_reported_duration_minutes = raw.duration_minutes
    }
    if (raw.source?.trim()) {
      extraMeta.hc_origin_package = raw.source.trim()
    }
    extraMeta.stages = Array.isArray(raw.stages) ? raw.stages : []
    extraMeta.ingest_source = 'health_connect'
    return {
      sampleId: id,
      start,
      end,
      stage: raw.stage ?? 'asleep',
      quality: raw.quality ?? null,
      meta: extraMeta,
    }
  })

export type HealthConnectSleepItemParsed = z.infer<typeof healthConnectSleepItemSchema>
