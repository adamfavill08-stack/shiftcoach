import { describe, it, expect } from 'vitest'
import { inferOffDayContext, inferOffDayNightAnchor } from '@/lib/shift-context/inferOffDayContext'
import type { ShiftContextSnapshot } from '@/lib/shift-context/types'

function snap(partial: Partial<ShiftContextSnapshot> & Pick<ShiftContextSnapshot, 'standardType'>): ShiftContextSnapshot {
  return {
    rotaDate: '2026-06-10',
    label: 'N',
    operationalKind: partial.operationalKind ?? 'night',
    startTs: partial.startTs ?? '2026-06-10T22:00:00.000Z',
    endTs: partial.endTs ?? '2026-06-11T07:00:00.000Z',
    isActive: false,
    hoursUntilStart: partial.hoursUntilStart ?? 10,
    usedEstimatedTimes: partial.usedEstimatedTimes ?? false,
    ...partial,
  } as ShiftContextSnapshot
}

describe('inferOffDayContext', () => {
  const noon = new Date(2026, 5, 10, 12, 0, 0, 0)

  it('returns normal_off when not an off-day guidance', () => {
    expect(
      inferOffDayContext(
        {
          guidanceMode: 'day_shift',
          lastCompletedShift: null,
          nextShift: snap({ standardType: 'night' }),
        },
        noon,
      ),
    ).toBe('normal_off')
  })

  it('classifies before_first_night when next night is within 24h and last was not night', () => {
    expect(
      inferOffDayContext(
        {
          guidanceMode: 'off_day',
          lastCompletedShift: snap({ standardType: 'day', operationalKind: 'day' }),
          nextShift: snap({
            standardType: 'night',
            startTs: '2026-06-10T22:00:00.000Z',
            endTs: '2026-06-11T07:00:00.000Z',
          }),
        },
        noon,
      ),
    ).toBe('before_first_night')
  })

  it('classifies between_nights when last and next are both night', () => {
    expect(
      inferOffDayContext(
        {
          guidanceMode: 'off_day',
          lastCompletedShift: snap({
            standardType: 'night',
            operationalKind: 'night',
            startTs: '2026-06-09T22:00:00.000Z',
            endTs: '2026-06-10T07:00:00.000Z',
          }),
          nextShift: snap({
            standardType: 'night',
            startTs: '2026-06-10T22:00:00.000Z',
            endTs: '2026-06-11T07:00:00.000Z',
          }),
        },
        noon,
      ),
    ).toBe('between_nights')
  })

  it('classifies after_final_night when last was night and next is not night', () => {
    expect(
      inferOffDayContext(
        {
          guidanceMode: 'off_day',
          lastCompletedShift: snap({ standardType: 'night', operationalKind: 'night' }),
          nextShift: snap({
            standardType: 'day',
            operationalKind: 'day',
            startTs: '2026-06-12T09:00:00.000Z',
            endTs: '2026-06-12T17:00:00.000Z',
          }),
        },
        noon,
      ),
    ).toBe('after_final_night')
  })
})

describe('inferOffDayNightAnchor', () => {
  const next = {
    rotaDate: '2026-06-10',
    label: 'N',
    standardType: 'night' as const,
    operationalKind: 'night' as const,
    startTs: '2026-06-10T22:00:00.000Z',
    endTs: '2026-06-11T07:00:00.000Z',
    isActive: false,
    hoursUntilStart: 8,
    usedEstimatedTimes: false,
  }

  it('returns next night for before_first_night', () => {
    expect(inferOffDayNightAnchor({ nextShift: next, mealPlanningShift: null }, 'before_first_night')).toEqual(next)
  })

  it('returns null for normal_off', () => {
    expect(inferOffDayNightAnchor({ nextShift: next, mealPlanningShift: null }, 'normal_off')).toBeNull()
  })
})
