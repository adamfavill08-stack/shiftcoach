import { describe, it, expect } from 'vitest'
import { sumHcStepSamplesForLocalCivilDay } from '@/lib/health-connect/reconcileDailyStepsFromHcSamples'

describe('sumHcStepSamplesForLocalCivilDay', () => {
  it('returns null when no samples match the local civil day', () => {
    expect(
      sumHcStepSamplesForLocalCivilDay(
        [{ timestamp: '2026-05-10T12:00:00.000Z', steps: 100 }],
        '2026-05-11',
        'UTC',
      ),
    ).toBeNull()
  })

  it('sums buckets on the requested local day (UTC zone)', () => {
    const samples = [
      { timestamp: '2026-05-11T10:00:00.000Z', steps: 400 },
      { timestamp: '2026-05-11T10:15:00.000Z', steps: 300 },
      { timestamp: '2026-05-12T00:00:00.000Z', steps: 999 },
    ]
    expect(sumHcStepSamplesForLocalCivilDay(samples, '2026-05-11', 'UTC')).toBe(700)
  })

  it('dedupes duplicate bucket starts keeping max steps', () => {
    const samples = [
      { timestamp: '2026-05-11T10:00:00.000Z', steps: 100 },
      { timestamp: '2026-05-11T10:00:00.000Z', steps: 150 },
    ]
    expect(sumHcStepSamplesForLocalCivilDay(samples, '2026-05-11', 'UTC')).toBe(150)
  })
})
