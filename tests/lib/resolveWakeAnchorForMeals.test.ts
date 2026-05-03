import { describe, it, expect } from 'vitest'
import {
  inferWakeAnchorRhythm,
  resolveWakeAnchorForMeals,
  resolveDiurnalWakeAnchor,
} from '@/lib/nutrition/resolveDiurnalWakeAnchor'

describe('resolveWakeAnchorForMeals', () => {
  const noon = new Date(2026, 3, 15, 12, 0, 0, 0)

  it('day_rhythm: trusts morning wake; rejects afternoon → 07:00', () => {
    const wMorning = new Date(2026, 3, 15, 7, 30, 0, 0)
    const r1 = resolveWakeAnchorForMeals(wMorning, noon, 'day_rhythm')
    expect(r1.getHours()).toBe(7)
    expect(r1.getMinutes()).toBe(30)

    const wAfternoon = new Date(2026, 3, 15, 15, 30, 0, 0)
    const r2 = resolveWakeAnchorForMeals(wAfternoon, noon, 'day_rhythm')
    expect(r2.getHours()).toBe(7)
    expect(r2.getMinutes()).toBe(0)
  })

  it('night_rhythm: trusts afternoon wake; rejects 03:00 → 15:00 fallback', () => {
    const w = new Date(2026, 3, 15, 15, 30, 0, 0)
    const r = resolveWakeAnchorForMeals(w, noon, 'night_rhythm')
    expect(r.getHours()).toBe(15)
    expect(r.getMinutes()).toBe(30)

    const night = new Date(2026, 3, 15, 3, 0, 0, 0)
    const r2 = resolveWakeAnchorForMeals(night, noon, 'night_rhythm')
    expect(r2.getHours()).toBe(15)
    expect(r2.getMinutes()).toBe(0)
  })

  it('recovery_from_night: trusts 10:00–17:00 band', () => {
    const w = new Date(2026, 3, 15, 11, 0, 0, 0)
    const r = resolveWakeAnchorForMeals(w, noon, 'recovery_from_night')
    expect(r.getHours()).toBe(11)
    expect(r.getMinutes()).toBe(0)
  })

  it('resolveDiurnalWakeAnchor matches day_rhythm for legacy callers', () => {
    const w = new Date(2026, 3, 15, 15, 0, 0, 0)
    expect(resolveDiurnalWakeAnchor(w, noon).getHours()).toBe(7)
  })
})

describe('inferWakeAnchorRhythm', () => {
  it('maps transition_day_to_night and pre_night_shift', () => {
    expect(
      inferWakeAnchorRhythm({
        shiftType: 'night',
        guidanceMode: 'transition_day_to_night',
        transitionState: 'day_to_night',
      }),
    ).toBe('transition_to_night')
    expect(
      inferWakeAnchorRhythm({
        shiftType: 'off',
        guidanceMode: 'pre_night_shift',
        transitionState: 'stable',
      }),
    ).toBe('transition_to_night')
  })

  it('maps night_shift to night_rhythm', () => {
    expect(
      inferWakeAnchorRhythm({
        shiftType: 'day',
        guidanceMode: 'night_shift',
        transitionState: 'stable',
      }),
    ).toBe('night_rhythm')
  })

  it('maps off + day_to_night to transition_to_night', () => {
    expect(
      inferWakeAnchorRhythm({
        shiftType: 'off',
        guidanceMode: 'off_day',
        transitionState: 'day_to_night',
      }),
    ).toBe('transition_to_night')
  })
})
