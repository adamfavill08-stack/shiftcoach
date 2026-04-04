import { describe, it, expect, vi, afterEach } from 'vitest'
import type { UserShiftState } from '@/lib/shift-agent/types'
import {
  calculateCircadianScore,
  type SleepIntervalForGap,
  type SleepLog,
  type CircadianUserProfile,
} from '@/lib/circadian/calculateCircadianScore'

const profileUtc: CircadianUserProfile = { sleep_goal_h: 7.5, timezone: 'UTC' }
/** Use when test logs are ~6h so duration logic does not dominate timing comparisons. */
const profile6hGoal: CircadianUserProfile = { sleep_goal_h: 6, timezone: 'UTC' }

function nightWorkerState(): UserShiftState {
  const base = new Date('2026-06-10T12:00:00.000Z')
  return {
    patternType: 'regular',
    currentMode: 'NIGHT_NORMAL',
    activeTransition: null,
    mealWindows: {
      meal1: base,
      meal2: base,
      anchorMeal: base,
      shiftSnack1: base,
      shiftSnack2: null,
    },
    sleepWindows: {
      primarySleep: { start: base, end: base },
      napWindow: null,
    },
    lastCalculated: base,
  }
}

function dayWorkerState(): UserShiftState {
  const s = nightWorkerState()
  return { ...s, currentMode: 'DAY_NORMAL' }
}

describe('calculateCircadianScore', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('night shift sleep 08:00–15:00 UTC: large positive offset, very low score, severe/significant status', () => {
    vi.useFakeTimers({ now: new Date('2026-06-10T20:00:00.000Z') })

    const logs: SleepLog[] = [
      { sleep_start: '2026-06-10T08:00:00.000Z', sleep_end: '2026-06-10T15:00:00.000Z' },
    ]

    const r = calculateCircadianScore(logs, null, profileUtc)
    expect(r.sleepMidpointOffset).toBeCloseTo(8.5, 1)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(20)
    expect(['Severely disrupted', 'Significantly disrupted']).toContain(r.status)
    expect(r.dataQuality).toBe('insufficient')
    expect(r.peakAlertnessTime).toBe('17:30')
    expect(r.lowEnergyTime).toBe('08:30')
  })

  it('permanent night worker: consistent midpoints 10d → adaptedPattern true', () => {
    vi.useFakeTimers({ now: new Date('2026-06-19T12:00:00.000Z') })

    const logs: SleepLog[] = []
    for (let d = 10; d <= 19; d += 1) {
      const day = String(d).padStart(2, '0')
      logs.push({
        sleep_start: `2026-06-${day}T08:00:00.000Z`,
        sleep_end: `2026-06-${day}T15:00:00.000Z`,
      })
    }

    const night = calculateCircadianScore(logs, nightWorkerState(), profileUtc)

    expect(night.adaptedPattern).toBe(true)
    expect(night.adaptationDays).toBeGreaterThanOrEqual(7)
  })

  it('night-appropriate bonus when pattern not yet adapted (<7 days)', () => {
    vi.useFakeTimers({ now: new Date('2026-06-16T12:00:00.000Z') })

    const logs: SleepLog[] = []
    for (let d = 11; d <= 16; d += 1) {
      const day = String(d).padStart(2, '0')
      logs.push({
        sleep_start: `2026-06-${day}T08:00:00.000Z`,
        sleep_end: `2026-06-${day}T15:00:00.000Z`,
      })
    }

    const baseline = calculateCircadianScore(logs, null, profileUtc)
    const night = calculateCircadianScore(logs, nightWorkerState(), profileUtc)

    expect(baseline.adaptedPattern).toBe(false)
    expect(baseline.scoreBreakdown.shiftFitBonus).toBe(0)
    expect(night.scoreBreakdown.shiftFitBonus).toBe(5)
    // Final scores can both hit 0 when drift dominates; bonus still shows in breakdown.
    expect(night.score).toBeGreaterThanOrEqual(baseline.score)
    if (baseline.score > 0) {
      expect(night.score - baseline.score).toBe(5)
    }
  })

  it('day worker: near-anchor sleep → score ≥ 90 and strongly/well aligned', () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T14:00:00.000Z') })

    const logs: SleepLog[] = []
    for (let i = 0; i < 5; i += 1) {
      const day = String(11 + i).padStart(2, '0')
      logs.push({
        sleep_start: `2026-06-${day}T23:30:00.000Z`,
        sleep_end: `2026-06-${String(12 + i).padStart(2, '0')}T06:30:00.000Z`,
      })
    }

    const r = calculateCircadianScore(logs, dayWorkerState(), profileUtc)
    expect(Math.abs(r.sleepMidpointOffset)).toBeLessThan(1)
    expect(r.score).toBeGreaterThanOrEqual(90)
    expect(['Strongly aligned', 'Well aligned']).toContain(r.status)
    expect(r.dataQuality).toBe('good')
  })

  it('improving trajectory over last 3 logged days → recovery bonus and trend improving', () => {
    vi.useFakeTimers({ now: new Date('2026-06-17T12:00:00.000Z') })

    const flat = calculateCircadianScore(
      [
        { sleep_start: '2026-06-11T07:00:00.000Z', sleep_end: '2026-06-11T13:00:00.000Z' },
        { sleep_start: '2026-06-12T07:00:00.000Z', sleep_end: '2026-06-12T13:00:00.000Z' },
        { sleep_start: '2026-06-13T07:00:00.000Z', sleep_end: '2026-06-13T13:00:00.000Z' },
        { sleep_start: '2026-06-14T07:00:00.000Z', sleep_end: '2026-06-14T13:00:00.000Z' },
        { sleep_start: '2026-06-15T07:00:00.000Z', sleep_end: '2026-06-15T13:00:00.000Z' },
        { sleep_start: '2026-06-16T07:00:00.000Z', sleep_end: '2026-06-16T13:00:00.000Z' },
      ],
      null,
      profile6hGoal,
    )

    const improving = calculateCircadianScore(
      [
        { sleep_start: '2026-06-11T06:00:00.000Z', sleep_end: '2026-06-11T14:00:00.000Z' },
        { sleep_start: '2026-06-12T06:00:00.000Z', sleep_end: '2026-06-12T14:00:00.000Z' },
        { sleep_start: '2026-06-13T06:00:00.000Z', sleep_end: '2026-06-13T14:00:00.000Z' },
        { sleep_start: '2026-06-14T04:00:00.000Z', sleep_end: '2026-06-14T12:00:00.000Z' },
        { sleep_start: '2026-06-15T03:00:00.000Z', sleep_end: '2026-06-15T10:00:00.000Z' },
        { sleep_start: '2026-06-16T01:30:00.000Z', sleep_end: '2026-06-16T08:30:00.000Z' },
      ],
      null,
      profile6hGoal,
    )

    expect(improving.trend).toBe('improving')
    expect(improving.score).toBeGreaterThan(flat.score)
  })

  it('stable timing but short sleep vs goal: duration penalty pulls score down', () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T14:00:00.000Z') })

    const alignedShort: SleepLog[] = []
    for (let i = 0; i < 5; i += 1) {
      const d0 = String(11 + i).padStart(2, '0')
      alignedShort.push({
        sleep_start: `2026-06-${d0}T01:00:00.000Z`,
        sleep_end: `2026-06-${d0}T05:00:00.000Z`,
      })
    }

    const longLogs: SleepLog[] = []
    for (let i = 0; i < 5; i += 1) {
      const d0 = String(11 + i).padStart(2, '0')
      const d1 = String(12 + i).padStart(2, '0')
      longLogs.push({
        sleep_start: `2026-06-${d0}T23:30:00.000Z`,
        sleep_end: `2026-06-${d1}T06:30:00.000Z`,
      })
    }

    const short = calculateCircadianScore(alignedShort, dayWorkerState(), profileUtc)
    const long = calculateCircadianScore(longLogs, dayWorkerState(), profileUtc)

    expect(Math.abs(short.sleepMidpointOffset)).toBeLessThan(0.6)
    expect(short.scoreBreakdown.durationPenalty).toBeGreaterThan(12)
    expect(short.score).toBeLessThan(long.score - 8)
  })

  it('insufficient data (1 log in window): dataQuality insufficient, still returns score', () => {
    vi.useFakeTimers({ now: new Date('2026-06-10T18:00:00.000Z') })

    const logs: SleepLog[] = [
      { sleep_start: '2026-06-10T22:00:00.000Z', sleep_end: '2026-06-11T06:00:00.000Z' },
    ]

    const r = calculateCircadianScore(logs, null, profileUtc)
    expect(r.dataQuality).toBe('insufficient')
    expect(Number.isFinite(r.score)).toBe(true)
    expect(r.status.length).toBeGreaterThan(0)
    expect(r.sleepMidpointHistory.length).toBeGreaterThanOrEqual(1)
  })

  it('long main→main awake gap applies wakeGapPenalty and lowers score', () => {
    vi.useFakeTimers({ now: new Date('2026-06-21T12:00:00.000Z') })

    const logs: SleepLog[] = [
      { sleep_start: '2026-06-19T08:00:00.000Z', sleep_end: '2026-06-19T16:00:00.000Z' },
      { sleep_start: '2026-06-20T18:00:00.000Z', sleep_end: '2026-06-21T04:00:00.000Z' },
    ]

    const r = calculateCircadianScore(logs, null, profileUtc)
    expect(r.scoreBreakdown.maxInterSleepGapHours).toBeGreaterThanOrEqual(25)
    expect(r.scoreBreakdown.wakeGapPenalty).toBeGreaterThan(20)
    expect(r.scoreBreakdown.goodGapStreakDays).toBeLessThan(3)
  })

  it('nap between main sleeps shortens counted awake gap vs main-only timeline', () => {
    vi.useFakeTimers({ now: new Date('2026-06-21T12:00:00.000Z') })

    const logs: SleepLog[] = [
      { sleep_start: '2026-06-19T08:00:00.000Z', sleep_end: '2026-06-19T16:00:00.000Z' },
      { sleep_start: '2026-06-20T18:00:00.000Z', sleep_end: '2026-06-21T04:00:00.000Z' },
    ]

    const withNap: SleepIntervalForGap[] = [
      { sleep_start: logs[0]!.sleep_start, sleep_end: logs[0]!.sleep_end, kind: 'main' },
      { sleep_start: '2026-06-20T02:00:00.000Z', sleep_end: '2026-06-20T03:00:00.000Z', kind: 'nap' },
      { sleep_start: logs[1]!.sleep_start, sleep_end: logs[1]!.sleep_end, kind: 'main' },
    ]

    const noNap = calculateCircadianScore(logs, null, profileUtc)
    const nap = calculateCircadianScore(logs, null, profileUtc, { allSleepIntervalsForGap: withNap })

    expect(noNap.scoreBreakdown.wakeGapPenalty).toBeGreaterThan(0)
    expect(nap.scoreBreakdown.maxInterSleepGapHours ?? 0).toBeLessThan(
      noNap.scoreBreakdown.maxInterSleepGapHours ?? 999,
    )
    expect(nap.scoreBreakdown.wakeGapPenalty).toBeLessThan(noNap.scoreBreakdown.wakeGapPenalty)
  })

  it('after 3+ consecutive good-gap days, wakeGapPenalty clears despite older long gap in window', () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00.000Z') })

    const logs: SleepLog[] = [
      { sleep_start: '2026-06-03T08:00:00.000Z', sleep_end: '2026-06-03T16:00:00.000Z' },
      { sleep_start: '2026-06-04T18:00:00.000Z', sleep_end: '2026-06-05T04:00:00.000Z' },
    ]
    for (let d = 5; d <= 14; d += 1) {
      const day = String(d).padStart(2, '0')
      const next = String(d + 1).padStart(2, '0')
      logs.push({
        sleep_start: `2026-06-${day}T20:00:00.000Z`,
        sleep_end: `2026-06-${next}T04:00:00.000Z`,
      })
    }

    const r = calculateCircadianScore(logs, null, profileUtc)
    expect(r.scoreBreakdown.maxInterSleepGapHours).toBeGreaterThanOrEqual(25)
    expect(r.scoreBreakdown.goodGapStreakDays).toBeGreaterThanOrEqual(3)
    expect(r.scoreBreakdown.wakeGapPenalty).toBe(0)
  })

  it('forecast applies same wakeGapPenalty as headline score', () => {
    vi.useFakeTimers({ now: new Date('2026-06-21T12:00:00.000Z') })

    const logs: SleepLog[] = [
      { sleep_start: '2026-06-19T08:00:00.000Z', sleep_end: '2026-06-19T16:00:00.000Z' },
      { sleep_start: '2026-06-20T18:00:00.000Z', sleep_end: '2026-06-21T04:00:00.000Z' },
    ]

    const r = calculateCircadianScore(logs, null, profileUtc)
    const p = r.scoreBreakdown.wakeGapPenalty
    expect(p).toBeGreaterThan(0)
    expect(r.forecast.tomorrow).toBe(r.score)
    expect(r.forecast.threeDays).toBe(r.score)
  })
})
