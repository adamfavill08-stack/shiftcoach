import { createHash } from 'node:crypto'
import type { HealthConnectSleepItemParsed } from '@/lib/health-connect/healthConnectSleepItemSchema'

/** Stable id when Health Connect metadata id is missing: user + origin package + start + end (SHA-256 prefix). */
function syntheticHcSampleId(userId: string, originPackage: string, startIso: string, endIso: string): string {
  const h = createHash('sha256')
    .update(`${userId}\0${originPackage}\0${startIso}\0${endIso}`, 'utf8')
    .digest('hex')
  return `hc_synth_${h.slice(0, 40)}`
}

/**
 * Ensures every persisted HC sleep row has `sample_id` for upsert/dedupe.
 * Does not replace native-provided ids. Manual rows are unaffected (different `source`).
 */
export function withSyntheticHcSampleIds(
  userId: string,
  items: HealthConnectSleepItemParsed[],
): HealthConnectSleepItemParsed[] {
  return items.map((s) => {
    const existing = s.sampleId?.trim()
    if (existing) return s
    const startMs = Date.parse(s.start)
    const endMs = Date.parse(s.end)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return s
    const startIso = new Date(startMs).toISOString()
    const endIso = new Date(endMs).toISOString()
    const pkg = String((s.meta as { hc_origin_package?: string } | undefined)?.hc_origin_package ?? 'unknown_pkg')
    const sid = syntheticHcSampleId(userId, pkg, startIso, endIso)
    return {
      ...s,
      sampleId: sid,
      meta: {
        ...(s.meta ?? {}),
        sample_id: sid,
        external_id: sid,
        synthetic_sample_id: true,
      },
    }
  })
}
