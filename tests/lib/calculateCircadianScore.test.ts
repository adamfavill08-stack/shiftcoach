import { describe, it, expect, vi, afterEach } from 'vitest'
import type { UserShiftState } from '@/lib/shift-agent/types'
import {
  calculateCircadianScore,
  type SleepLog,
  type CircadianUserProfile,
} from '@/lib/circadian/calculateCircadianScore'

const profileUtc: CircadianUserProfile = { sleep_goal_h: 7.5, timezone: 'UTC' }

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
    expect(night.score).toBe(baseline.score + 5)
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
      profileUtc,
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
      profileUtc,
    )

    expect(improving.trend).toBe('improving')
    expect(improving.score).toBeGreaterThan(flat.score)
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
})
