import { describe, it, expect } from 'vitest'
import { calculateFatigueRisk } from '@/lib/fatigue/calculateFatigueRisk'

describe('calculateFatigueRisk', () => {
  it('high-risk scenario lands in 72-95 with medium/high confidence', () => {
    const result = calculateFatigueRisk({
      sleepLogs: [
        { durationHours: 4.2, quality: 2 },
        { durationHours: 4.8, quality: 2 },
        { durationHours: 5.1, quality: 2 },
      ],
      shifts: [{ type: 'night' }, { type: 'night' }, { type: 'night' }, { type: 'day' }],
      weeklySleepDebtHours: 12.5,
      socialJetlag: { currentMisalignmentHours: 4.2, category: 'high' },
      now: new Date('2026-04-01T03:30:00.000Z'),
      restingHeartRateDeltaBpm: 8,
    })

    expect(result.score).toBeGreaterThanOrEqual(72)
    expect(result.score).toBeLessThanOrEqual(95)
    expect(result.level).toBe('high')
    expect(['medium', 'high']).toContain(result.confidenceLabel)
  })

  it('low-risk stable scenario lands in 8-28 with medium/high confidence', () => {
    const result = calculateFatigueRisk({
      sleepLogs: [
        { durationHours: 7.8, quality: 4 },
        { durationHours: 7.6, quality: 4 },
        { durationHours: 7.4, quality: 4 },
        { durationHours: 7.7, quality: 4 },
        { durationHours: 7.5, quality: 4 },
      ],
      shifts: [{ type: 'day' }, { type: 'day' }, { type: 'off' }, { type: 'day' }],
      weeklySleepDebtHours: 0.6,
      socialJetlag: { currentMisalignmentHours: 0.6, category: 'low' },
      now: new Date('2026-04-01T12:00:00.000Z'),
    })

    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(result.score).toBeLessThanOrEqual(28)
    expect(result.level).toBe('low')
    expect(['medium', 'high']).toContain(result.confidenceLabel)
  })

  it('moderate mixed scenario lands in 35-60', () => {
    const result = calculateFatigueRisk({
      sleepLogs: [
        { durationHours: 6.1, quality: 3 },
        { durationHours: 6.4, quality: 3 },
        { durationHours: 6.0, quality: 3 },
        { durationHours: 6.5, quality: 3 },
      ],
      shifts: [{ type: 'afternoon' }, { type: 'morning' }, { type: 'day' }],
      weeklySleepDebtHours: 5.2,
      socialJetlag: { currentMisalignmentHours: 2.1, category: 'moderate' },
      now: new Date('2026-04-01T17:00:00.000Z'),
    })

    expect(result.score).toBeGreaterThanOrEqual(35)
    expect(result.score).toBeLessThanOrEqual(60)
    expect(result.level).toBe('moderate')
  })

  it('circadian sensitivity: 03:30 is at least +10 vs 13:30', () => {
    const base = {
      sleepLogs: [
        { durationHours: 6.0, quality: 3 },
        { durationHours: 6.2, quality: 3 },
        { durationHours: 6.1, quality: 3 },
      ],
      shifts: [{ type: 'night' }, { type: 'night' }, { type: 'off' }, { type: 'day' }] as const,
      weeklySleepDebtHours: 5,
      socialJetlag: { currentMisalignmentHours: 2.2, category: 'moderate' as const },
    }
    const trough = calculateFatigueRisk({ ...base, now: new Date('2026-04-01T03:30:00.000Z') })
    const daytime = calculateFatigueRisk({ ...base, now: new Date('2026-04-01T13:30:00.000Z') })

    expect(trough.score - daytime.score).toBeGreaterThanOrEqual(10)
    expect(trough.score).toBeGreaterThanOrEqual(0)
    expect(trough.score).toBeLessThanOrEqual(100)
    expect(daytime.score).toBeGreaterThanOrEqual(0)
    expect(daytime.score).toBeLessThanOrEqual(100)
  })

  it('sequence escalation: 3+ consecutive nights is >= +12 vs non-consecutive control', () => {
    const common = {
      sleepLogs: [
        { durationHours: 5.8, quality: 3 },
        { durationHours: 6.0, quality: 3 },
        { durationHours: 6.1, quality: 3 },
      ],
      weeklySleepDebtHours: 6.5,
      socialJetlag: { currentMisalignmentHours: 2.0, category: 'moderate' as const },
      now: new Date('2026-04-01T03:30:00.000Z'),
    }

    const consecutive = calculateFatigueRisk({
      ...common,
      shifts: [{ type: 'night' }, { type: 'night' }, { type: 'night' }, { type: 'day' }],
    })
    const control = calculateFatigueRisk({
      ...common,
      shifts: [{ type: 'day' }, { type: 'off' }, { type: 'day' }, { type: 'off' }],
    })

    expect(consecutive.score - control.score).toBeGreaterThanOrEqual(12)
  })

  it('recovery improvement: recovered state drops score by at least 8', () => {
    const strained = calculateFatigueRisk({
      sleepLogs: [
        { durationHours: 4.9, quality: 2 },
        { durationHours: 5.1, quality: 2 },
        { durationHours: 5.0, quality: 2 },
      ],
      shifts: [{ type: 'night' }, { type: 'night' }, { type: 'afternoon' }],
      weeklySleepDebtHours: 8.5,
      socialJetlag: { currentMisalignmentHours: 3.2, category: 'high' },
      now: new Date('2026-04-01T03:30:00.000Z'),
    })
    const recovered = calculateFatigueRisk({
      sleepLogs: [
        { durationHours: 8.2, quality: 4 },
        { durationHours: 8.0, quality: 4 },
        { durationHours: 7.8, quality: 4 },
      ],
      shifts: [{ type: 'off' }, { type: 'day' }, { type: 'off' }],
      weeklySleepDebtHours: 1.2,
      socialJetlag: { currentMisalignmentHours: 0.8, category: 'low' },
      now: new Date('2026-04-01T13:30:00.000Z'),
    })

    expect(strained.score - recovered.score).toBeGreaterThanOrEqual(8)
  })

  it('sparse-data conservatism caps <=64 and marks low confidence', () => {
    const result = calculateFatigueRisk({
      sleepLogs: [{ durationHours: 3.8, quality: 2 }],
      shifts: [],
      weeklySleepDebtHours: 14,
      socialJetlag: null,
      now: new Date('2026-04-01T06:00:00.000Z'),
    })

    expect(result.confidenceLabel).toBe('low')
    expect(result.score).toBeLessThanOrEqual(64)
  })

  it('clamps score and keeps valid level boundaries', () => {
    const result = calculateFatigueRisk({
      sleepLogs: [{ durationHours: 0.5, quality: 1 }, { durationHours: 1.5, quality: 1 }],
      shifts: [{ type: 'night' }, { type: 'night' }, { type: 'night' }, { type: 'morning' }],
      weeklySleepDebtHours: 40,
      socialJetlag: { currentMisalignmentHours: 8, category: 'high' },
      now: new Date('2026-04-01T03:00:00.000Z'),
      restingHeartRateDeltaBpm: 20,
      hrvSuppressionPct: 45,
    })
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(['low', 'moderate', 'high']).toContain(result.level)
  })
})
