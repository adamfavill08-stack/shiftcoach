import { describe, expect, it } from 'vitest'
import { healthConnectSleepItemSchema } from '@/lib/health-connect/healthConnectSleepItemSchema'
import { withSyntheticHcSampleIds } from '@/lib/health-connect/withSyntheticHcSampleIds'

describe('withSyntheticHcSampleIds', () => {
  it('adds stable sample_id when HC metadata id is missing', () => {
    const raw = {
      start: '2026-05-08T22:00:00.000Z',
      end: '2026-05-09T06:00:00.000Z',
      source: 'com.example.sleep',
    }
    const s = healthConnectSleepItemSchema.parse(raw)
    const u = 'user-uuid-test'
    const [a, b] = [withSyntheticHcSampleIds(u, [s])[0], withSyntheticHcSampleIds(u, [s])[0]]
    expect(a.sampleId).toMatch(/^hc_synth_[a-f0-9]{40}$/)
    expect(a.sampleId).toBe(b.sampleId)
    expect((a.meta as { synthetic_sample_id?: boolean }).synthetic_sample_id).toBe(true)
  })

  it('does not replace native sampleId', () => {
    const s = healthConnectSleepItemSchema.parse({
      sampleId: 'native-id',
      start: '2026-05-08T22:00:00.000Z',
      end: '2026-05-09T06:00:00.000Z',
    })
    const out = withSyntheticHcSampleIds('u', [s])[0]
    expect(out.sampleId).toBe('native-id')
  })
})
