import { describe, it, expect } from 'vitest'
import {
  computeUserShiftState,
  filterShiftsIn72hWindow,
} from '@/lib/shift-agent/computeUserShiftState'
import type { AnalyserShiftInput } from '@/lib/shift-pattern-analyser/types'

const MS_H = 3600000

describe('computeUserShiftState', () => {
  const now = new Date('2025-06-15T10:00:00.000Z')
  const wake = new Date('2025-06-15T06:00:00.000Z')

  it('computes meal and nap windows from wake + next shift', () => {
    const shifts: AnalyserShiftInput[] = [
      {
        date: '2025-06-15',
        label: 'DAY',
        start_ts: '2025-06-15T07:00:00.000Z',
        end_ts: '2025-06-15T19:00:00.000Z',
      },
      {
        date: '2025-06-15',
        label: 'NIGHT',
        start_ts: '2025-06-15T19:00:00.000Z',
        end_ts: '2025-06-16T07:00:00.000Z',
      },
    ]
    const windowed = filterShiftsIn72hWindow(shifts, now)
    expect(windowed.length).toBeGreaterThan(0)

    const { state } = computeUserShiftState({
      now,
      wakeTime: wake,
      shiftsForPattern: shifts,
      shifts72h: windowed,
    })

    expect(state.mealWindows.meal1.getTime()).toBe(wake.getTime() + MS_H)
    expect(state.mealWindows.meal2.getTime()).toBe(wake.getTime() + 4 * MS_H)

    const nextStart = new Date('2025-06-15T19:00:00.000Z')
    expect(state.mealWindows.anchorMeal.getTime()).toBe(nextStart.getTime() - 2 * MS_H)
    expect(state.mealWindows.shiftSnack1.getTime()).toBe(nextStart.getTime() + 3 * MS_H)

    expect(state.sleepWindows.primarySleep.end.getTime()).toBe(wake.getTime())
    expect(state.sleepWindows.napWindow).not.toBeNull()
    expect(state.sleepWindows.napWindow!.start.getTime()).toBe(nextStart.getTime() - 5 * MS_H)
    expect(state.sleepWindows.napWindow!.end.getTime()).toBe(nextStart.getTime() - 2.5 * MS_H)
  })

  it('filterShiftsIn72hWindow excludes shifts entirely after window', () => {
    const now2 = new Date('2025-06-15T10:00:00.000Z')
    const shifts: AnalyserShiftInput[] = [
      {
        date: '2025-06-20',
        label: 'DAY',
        start_ts: '2025-06-20T07:00:00.000Z',
        end_ts: '2025-06-20T19:00:00.000Z',
      },
    ]
    expect(filterShiftsIn72hWindow(shifts, now2)).toHaveLength(0)
  })
})
