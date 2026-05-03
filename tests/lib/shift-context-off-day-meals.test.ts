import { describe, it, expect } from 'vitest'
import { mealGuidanceFromContext } from '@/lib/shift-context/mealGuidanceFromContext'
import { resolveShiftContextFromRows, type ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'

describe('shift context — off day meal template', () => {
  it('off_day keeps meal template off when sandwiched between nights', () => {
    const rows: ShiftRowInput[] = [
      {
        date: '2026-06-09',
        label: 'Night',
        start_ts: '2026-06-09T22:00:00.000Z',
        end_ts: '2026-06-10T07:00:00.000Z',
      },
      { date: '2026-06-10', label: 'OFF' },
      {
        date: '2026-06-10',
        label: 'Night',
        start_ts: '2026-06-10T22:00:00.000Z',
        end_ts: '2026-06-11T07:00:00.000Z',
      },
    ]
    const now = new Date(2026, 5, 10, 12, 0)
    const ctx = resolveShiftContextFromRows(rows, now)
    expect(ctx.guidanceMode).toBe('off_day')
    expect(ctx.offDayContext).toBe('between_nights')
    expect(ctx.offDayNightAnchor?.standardType).toBe('night')
    expect(mealGuidanceFromContext(ctx).template).toBe('off')
  })

  it('off_day before_first_night when next night is soon and last was not night', () => {
    const rows: ShiftRowInput[] = [
      {
        date: '2026-06-09',
        label: 'DAY',
        start_ts: '2026-06-09T14:00:00.000Z',
        end_ts: '2026-06-09T22:00:00.000Z',
      },
      { date: '2026-06-10', label: 'OFF' },
      {
        date: '2026-06-10',
        label: 'Night',
        start_ts: '2026-06-10T22:00:00.000Z',
        end_ts: '2026-06-11T07:00:00.000Z',
      },
    ]
    const now = new Date(2026, 5, 10, 14, 0)
    const ctx = resolveShiftContextFromRows(rows, now)
    expect(ctx.guidanceMode).toBe('off_day')
    expect(ctx.offDayContext).toBe('before_first_night')
    expect(mealGuidanceFromContext(ctx).template).toBe('off')
  })
})
