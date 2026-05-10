import { describe, expect, it } from 'vitest'
import { buildConcreteShiftsRows } from '@/lib/rota/buildConcreteShifts'
import { mapOnboardingRotationToPatternSlots } from '@/lib/rota/mapOnboardingRotationToPatternSlots'

describe('mapOnboardingRotationToPatternSlots', () => {
  it('maps off/day/night to O/D/N', () => {
    expect(mapOnboardingRotationToPatternSlots(['day', 'night', 'off'])).toEqual(['D', 'N', 'O'])
  })
})

describe('buildConcreteShiftsRows patternSlotsOverride', () => {
  it('uses override slots instead of preset pattern length', () => {
    const slots = mapOnboardingRotationToPatternSlots(['day', 'off', 'night', 'off'])
    const rows = buildConcreteShiftsRows({
      userId: 'u1',
      patternId: '12h-custom',
      patternSlotsOverride: slots,
      patternStart: new Date('2026-06-01T12:00:00Z'),
      startCycleIndex: 0,
      rangeStart: new Date('2026-06-01T12:00:00Z'),
      dayCount: 4,
      shiftTimes: {
        day: { start: '08:00', end: '16:00' },
        night: { start: '20:00', end: '08:00' },
      },
      commute: { toWork: { minutes: 10, method: 'drive' }, fromWork: { minutes: 15, method: 'drive' } },
    })
    expect(rows).toHaveLength(4)
    expect(rows[0]?.label).toBe('DAY')
    expect(rows[1]?.label).toBe('OFF')
    expect(rows[2]?.label).toBe('NIGHT')
    expect(rows[0]?.notes).toContain('10')
  })
})
