import { describe, it, expect } from 'vitest'
import { stepsByHourFromCumulativeLogs } from '@/lib/activity/buildStepsByHour'

describe('stepsByHourFromCumulativeLogs', () => {
  it('treats a drop in cumulative steps as a new-day reset (night shift across midnight)', () => {
    const shiftStart = new Date('2026-05-09T19:00:00.000Z')
    const shiftEnd = new Date('2026-05-10T07:00:00.000Z')
    const now = new Date('2026-05-10T06:00:00.000Z')
    const rows = [
      { steps: 4000, ts: '2026-05-09T23:00:00.000Z' },
      { steps: 800, ts: '2026-05-10T02:00:00.000Z' },
    ]
    const buckets = stepsByHourFromCumulativeLogs(rows, 'UTC', 4800, {
      shiftStart,
      shiftEnd,
      now,
    })
    const sum = buckets.reduce((a, b) => a + b, 0)
    expect(sum).toBe(4800)
    expect(buckets.some((v) => v > 0)).toBe(true)
  })
})
