import { describe, it, expect } from 'vitest'
import {
  analyzeSleepBlockRelativeToShifts,
  findNearestPreviousWorkBlock,
  findNearestUpcomingWorkBlock,
  buildWorkInstantsForClassification,
} from '@/lib/sleep/shiftRelativeSleepClassification'

const TZ = 'Europe/London'

describe('shiftRelativeSleepClassification', () => {
  it('finds nearest previous completed block before sleep start', () => {
    const shifts = [
      { date: '2026-05-10', label: 'NIGHT', start_ts: '2026-05-10T18:00:00.000Z', end_ts: '2026-05-10T06:00:00.000Z' },
    ]
    const instants = buildWorkInstantsForClassification(shifts, TZ)
    const sleepStart = Date.parse('2026-05-11T08:00:00.000Z')
    const prev = findNearestPreviousWorkBlock(sleepStart, instants)
    expect(prev).not.toBeNull()
    expect(prev!.instant.endMs).toBeLessThanOrEqual(sleepStart + 45 * 60 * 1000)
  })

  it('classifies morning sleep after night as post_shift_recovery_sleep', () => {
    const shifts = [
      { date: '2026-05-10', label: 'NIGHT', start_ts: '2026-05-10T18:00:00.000Z', end_ts: '2026-05-10T06:00:00.000Z' },
      { date: '2026-05-11', label: 'OFF', start_ts: null, end_ts: null },
    ]
    const sleepStart = Date.parse('2026-05-11T08:00:00.000Z')
    const sleepEnd = Date.parse('2026-05-11T15:00:00.000Z')
    const a = analyzeSleepBlockRelativeToShifts({
      sleepStartMs: sleepStart,
      sleepEndMs: sleepEnd,
      shifts,
      timeZone: TZ,
      targetSleepMinutes: 7 * 60,
    })
    expect(a.sleepClass).toBe('post_shift_recovery_sleep')
    expect(a.recoveryState).toBeDefined()
    expect(a.nextStepMessage.key.startsWith('sleepPlan.shiftRelative.nextStep.')).toBe(true)
    expect(a.nextStepMessage.params.next.length).toBeGreaterThan(5)
  })

  it('findNearestUpcomingWorkBlock returns first shift at or after sleep end', () => {
    const shifts = [
      { date: '2026-05-10', label: 'DAY', start_ts: '2026-05-10T08:00:00.000Z', end_ts: '2026-05-10T16:00:00.000Z' },
      { date: '2026-05-11', label: 'NIGHT', start_ts: '2026-05-11T20:00:00.000Z', end_ts: '2026-05-11T06:00:00.000Z' },
    ]
    const instants = buildWorkInstantsForClassification(shifts, TZ)
    const sleepEnd = Date.parse('2026-05-10T18:00:00.000Z')
    const next = findNearestUpcomingWorkBlock(sleepEnd, instants)
    expect(next).not.toBeNull()
    expect(next!.instant.startMs).toBeGreaterThanOrEqual(sleepEnd)
  })
})
