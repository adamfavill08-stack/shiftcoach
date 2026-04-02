/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { UserShiftState } from '@/lib/shift-agent/types'
import {
  buildTransitionAlerts,
  scheduleTransitionAlerts,
  cancelScheduledTransitionAlerts,
} from '@/lib/notifications/scheduleTransitionAlerts'

function makeTransitionState(overrides: Partial<UserShiftState> = {}): UserShiftState {
  const nextShiftStart = new Date('2026-04-03T18:00:00.000Z')
  const anchorMeal = new Date('2026-04-03T16:00:00.000Z')
  const base: UserShiftState = {
    patternType: 'irregular',
    currentMode: 'TRANSITIONING',
    activeTransition: {
      from: 'DAY',
      to: 'NIGHT',
      severity: 'critical',
      napRecommended: true,
      sleepAnchorShift: 0,
      recoveryHours: 12,
      nextShiftStart,
      transitionStarted: new Date('2026-04-02T12:00:00.000Z'),
    },
    mealWindows: {
      meal1: new Date('2026-04-02T07:00:00.000Z'),
      meal2: new Date('2026-04-02T10:00:00.000Z'),
      anchorMeal,
      shiftSnack1: new Date('2026-04-03T09:00:00.000Z'),
      shiftSnack2: null,
    },
    sleepWindows: {
      primarySleep: {
        start: new Date('2026-04-02T22:00:00.000Z'),
        end: new Date('2026-04-03T06:00:00.000Z'),
      },
      napWindow: {
        start: new Date('2026-04-03T08:00:00.000Z'),
        end: new Date('2026-04-03T10:30:00.000Z'),
      },
    },
    lastCalculated: new Date('2026-04-02T12:00:00.000Z'),
  }
  return { ...base, ...overrides }
}

describe('buildTransitionAlerts', () => {
  const now = new Date('2026-04-02T12:00:00.000Z')
  const MS_H = 3600000

  it('schedules T-24h, T-9h, T-5h nap, T-2h anchor, T-1h for critical + nap', () => {
    const state = makeTransitionState()
    const alerts = buildTransitionAlerts(state, now)
    expect(alerts.map((a) => a.stableId)).toEqual([
      expect.stringMatching(/-t24h$/),
      expect.stringMatching(/-t9h$/),
      expect.stringMatching(/-t5h-nap$/),
      expect.stringMatching(/-t2h-anchor$/),
      expect.stringMatching(/-t1h$/),
    ])

    const next = state.activeTransition!.nextShiftStart.getTime()
    expect(alerts[0]!.fireAt.getTime()).toBe(next - 24 * MS_H)
    expect(alerts[1]!.fireAt.getTime()).toBe(next - 9 * MS_H)
    expect(alerts[2]!.fireAt.getTime()).toBe(next - 5 * MS_H)
    expect(alerts[2]!.requireInteraction).toBe(true)
    expect(alerts[3]!.fireAt.getTime()).toBe(next - 2 * MS_H)
    expect(alerts[3]!.body).toMatch(/anchor meal/i)
    expect(alerts[4]!.fireAt.getTime()).toBe(next - 1 * MS_H)
  })

  it('omits T-9h when severity is moderate', () => {
    const state = makeTransitionState({
      activeTransition: {
        ...makeTransitionState().activeTransition!,
        severity: 'moderate',
      },
    })
    const alerts = buildTransitionAlerts(state, now)
    expect(alerts.map((a) => a.stableId)).toEqual([
      expect.stringMatching(/-t24h$/),
      expect.stringMatching(/-t5h-nap$/),
      expect.stringMatching(/-t2h-anchor$/),
      expect.stringMatching(/-t1h$/),
    ])
    expect(alerts.find((a) => a.stableId.includes('t5h-nap'))!.requireInteraction).toBe(false)
  })

  it('omits nap alert when nap not recommended', () => {
    const state = makeTransitionState({
      activeTransition: {
        ...makeTransitionState().activeTransition!,
        severity: 'high',
        napRecommended: false,
      },
    })
    const alerts = buildTransitionAlerts(state, now)
    expect(alerts.some((a) => a.stableId.includes('nap'))).toBe(false)
    expect(alerts.map((a) => a.stableId)).toEqual([
      expect.stringMatching(/-t24h$/),
      expect.stringMatching(/-t9h$/),
      expect.stringMatching(/-t2h-anchor$/),
      expect.stringMatching(/-t1h$/),
    ])
  })

  it('returns empty when no active transition', () => {
    const state = makeTransitionState({ activeTransition: null, currentMode: 'DAY_NORMAL' })
    expect(buildTransitionAlerts(state, now)).toEqual([])
  })
})

describe('scheduleTransitionAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00.000Z'))
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'granted'
      },
    )
  })

  afterEach(() => {
    cancelScheduledTransitionAlerts()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('registers one timeout per future alert and clears prior timeouts on reschedule', () => {
    const setSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const state = makeTransitionState()
    scheduleTransitionAlerts(state)
    const firstBatch = setSpy.mock.calls.length
    expect(firstBatch).toBe(5)

    scheduleTransitionAlerts({
      ...state,
      activeTransition: {
        ...state.activeTransition!,
        nextShiftStart: new Date('2026-04-04T18:00:00.000Z'),
      },
    })
    expect(clearSpy.mock.calls.length).toBeGreaterThanOrEqual(5)
    expect(setSpy.mock.calls.length).toBeGreaterThan(firstBatch)
  })
})
