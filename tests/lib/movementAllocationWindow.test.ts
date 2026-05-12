import { describe, expect, it } from 'vitest'
import { movementAllocationWindowFromShiftInstants } from '@/lib/sleep/utils'

describe('movementAllocationWindowFromShiftInstants', () => {
  it('covers both civil days touched by an overnight shift (UTC)', () => {
    const w = movementAllocationWindowFromShiftInstants(
      new Date('2026-05-09T18:00:00.000Z'),
      new Date('2026-05-10T06:00:00.000Z'),
      'UTC',
    )
    expect(w).not.toBeNull()
    if (!w) return
    expect(new Date(w.startMs).toISOString()).toBe('2026-05-09T00:00:00.000Z')
    expect(new Date(w.endExclusiveMs).toISOString()).toBe('2026-05-11T00:00:00.000Z')
  })
})
