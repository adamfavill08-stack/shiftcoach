import { describe, expect, it } from 'vitest'
import {
  baselineRestingOutsideGap,
  computeRecoveryComposite,
  overlapAsleepHoursInWindow,
} from '@/lib/wearables/shiftGapRecoverySignals'

describe('overlapAsleepHoursInWindow', () => {
  it('sums overlap for asleep stages only', () => {
    const ws = new Date('2026-05-01T07:00:00.000Z')
    const we = new Date('2026-05-01T19:00:00.000Z')
    const { hours, sessionCount } = overlapAsleepHoursInWindow(
      [
        { start_at: '2026-05-01T08:00:00.000Z', end_at: '2026-05-01T10:00:00.000Z', stage: 'deep' },
        { start_at: '2026-05-01T10:00:00.000Z', end_at: '2026-05-01T10:30:00.000Z', stage: 'awake' },
      ],
      ws,
      we,
    )
    expect(sessionCount).toBe(1)
    expect(hours).toBeCloseTo(2, 5)
  })
})

describe('baselineRestingOutsideGap', () => {
  it('excludes samples inside the gap window', () => {
    const gapStart = new Date('2026-05-05T07:00:00.000Z')
    const gapEnd = new Date('2026-05-05T19:00:00.000Z')
    const lookback = new Date('2026-04-20T12:00:00.000Z').getTime()
    const nowMs = new Date('2026-05-05T20:00:00.000Z').getTime()
    const samples = [
      { bpm: 80, recorded_at: '2026-05-04T12:00:00.000Z' },
      { bpm: 82, recorded_at: '2026-05-04T12:05:00.000Z' },
      { bpm: 120, recorded_at: '2026-05-05T10:00:00.000Z' },
      ...Array.from({ length: 20 }, (_, i) => ({
        bpm: 78 + (i % 3),
        recorded_at: new Date(Date.UTC(2026, 3, 22, 8, i, 0)).toISOString(),
      })),
    ]
    const r = baselineRestingOutsideGap(samples, gapStart, gapEnd, lookback, nowMs)
    expect(r.sample_count).toBeGreaterThanOrEqual(12)
    expect(r.resting_bpm).not.toBeNull()
  })
})

describe('computeRecoveryComposite', () => {
  it('returns good when sleep and HR align', () => {
    const r = computeRecoveryComposite({
      sleepHoursInWindow: 7.5,
      restingInWindow: 58,
      baselineResting: 60,
      baselineSufficient: true,
      recoveryDeltaBpm: 8,
      primarySufficient: true,
    })
    expect(r.recovery_band).toBe('good')
    expect(r.resting_vs_baseline_bpm).toBe(-2)
  })
})
