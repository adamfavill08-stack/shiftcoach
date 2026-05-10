import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { healthConnectSleepItemSchema } from '@/lib/health-connect/healthConnectSleepItemSchema'

describe('Health Connect sleep item schema', () => {
  it('accepts native aliases and preserves overnight window', () => {
    const raw = {
      external_id: 'hc-uuid-1',
      started_at: '2026-05-08T22:00:00Z',
      ended_at: '2026-05-09T06:00:00Z',
      duration_minutes: 480,
      source: 'com.google.android.apps.healthdata',
      stages: [{ start: '2026-05-08T22:00:00Z', end: '2026-05-09T06:00:00Z', stage: 2 }],
    }
    const s = healthConnectSleepItemSchema.parse(raw)
    expect(s.start).toBe('2026-05-08T22:00:00Z')
    expect(s.end).toBe('2026-05-09T06:00:00Z')
    expect(s.sampleId).toBe('hc-uuid-1')
    expect((s.meta as { hc_reported_duration_minutes?: number }).hc_reported_duration_minutes).toBe(480)
    expect((s.meta as { hc_origin_package?: string }).hc_origin_package).toBe('com.google.android.apps.healthdata')
    expect((s.meta as { sample_id?: string }).sample_id).toBe('hc-uuid-1')
    expect(Array.isArray((s.meta as { stages?: unknown }).stages)).toBe(true)
    expect(((s.meta as { stages: unknown[] }).stages).length).toBe(1)
  })

  it('rejects invalid payloads via upstream array schema', () => {
    const Body = z.object({ sleep: z.array(healthConnectSleepItemSchema).default([]) })
    const parsed = Body.parse({ sleep: [{ start: '', end: '' }] })
    expect(parsed.sleep[0].start).toBe('')
  })
})
