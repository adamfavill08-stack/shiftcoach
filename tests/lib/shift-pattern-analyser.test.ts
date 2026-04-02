import { describe, it, expect } from 'vitest'
import {
  analyseShiftPattern,
  circularHourDelta,
  idealSleepMidpointHour,
} from '@/lib/shift-pattern-analyser/shiftPatternAnalyser'

describe('shiftPatternAnalyser', () => {
  it('day 7–7 to night 7–7 same handoff: zero recovery, critical, nap, forward rotate', () => {
    const shifts = [
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
    const r = analyseShiftPattern(shifts, '2025-06-16')
    expect(r.transitions).toHaveLength(1)
    const t = r.transitions[0]
    expect(t.recoveryHours).toBe(0)
    expect(t.transitionSeverity).toBe('critical')
    expect(t.napRecommended).toBe(true)
    expect(t.rotationDirection).toBe('forward')
    expect(t.fromType).toBe('morning')
    expect(t.toType).toBe('night')
    expect(t.sleepAnchorShift).toBeGreaterThan(0)
  })

  it('8h rotating forward (6–2, 2–10, 10–6 style): forward deltas, pattern rotating_forward', () => {
    const shifts = [
      {
        date: '2025-01-06',
        label: 'DAY',
        start_ts: '2025-01-06T06:00:00.000Z',
        end_ts: '2025-01-06T14:00:00.000Z',
      },
      {
        date: '2025-01-07',
        label: 'DAY',
        start_ts: '2025-01-07T14:00:00.000Z',
        end_ts: '2025-01-07T22:00:00.000Z',
      },
      {
        date: '2025-01-08',
        label: 'DAY',
        start_ts: '2025-01-08T22:00:00.000Z',
        end_ts: '2025-01-09T06:00:00.000Z',
      },
      {
        date: '2025-01-10',
        label: 'DAY',
        start_ts: '2025-01-10T06:00:00.000Z',
        end_ts: '2025-01-10T14:00:00.000Z',
      },
      {
        date: '2025-01-11',
        label: 'DAY',
        start_ts: '2025-01-11T14:00:00.000Z',
        end_ts: '2025-01-11T22:00:00.000Z',
      },
      {
        date: '2025-01-12',
        label: 'DAY',
        start_ts: '2025-01-12T22:00:00.000Z',
        end_ts: '2025-01-13T06:00:00.000Z',
      },
      {
        date: '2025-01-14',
        label: 'DAY',
        start_ts: '2025-01-14T06:00:00.000Z',
        end_ts: '2025-01-14T14:00:00.000Z',
      },
      {
        date: '2025-01-15',
        label: 'DAY',
        start_ts: '2025-01-15T14:00:00.000Z',
        end_ts: '2025-01-15T22:00:00.000Z',
      },
    ]
    const r = analyseShiftPattern(shifts, '2025-01-15')
    const forwards = r.transitions.filter((x) => x.rotationDirection === 'forward')
    expect(forwards.length).toBeGreaterThanOrEqual(2)
    expect(r.patternType).toBe('rotating_forward')
  })

  it('4 on / 4 off continental: continental pattern', () => {
    const shifts: Array<{ date: string; label: string; start_ts: string; end_ts: string }> = []
    let d = new Date(Date.UTC(2025, 5, 1))
    for (let i = 0; i < 32; i++) {
      const ymd = d.toISOString().slice(0, 10)
      const cycle = i % 8
      if (cycle < 4) {
        shifts.push({
          date: ymd,
          label: 'DAY',
          start_ts: `${ymd}T07:00:00.000Z`,
          end_ts: `${ymd}T19:00:00.000Z`,
        })
      } else {
        shifts.push({
          date: ymd,
          label: 'OFF',
          start_ts: `${ymd}T00:00:00.000Z`,
          end_ts: `${ymd}T23:59:59.000Z`,
        })
      }
      d = new Date(d.getTime() + 24 * 3600000)
    }
    const r = analyseShiftPattern(shifts, shifts[shifts.length - 1]!.date)
    expect(r.patternType).toBe('continental')
  })

  it('irregular on-call style: irregular pattern', () => {
    const shifts = [
      { date: '2025-03-01', label: 'DAY', start_ts: '2025-03-01T07:00:00.000Z', end_ts: '2025-03-01T15:00:00.000Z' },
      { date: '2025-03-02', label: 'NIGHT', start_ts: '2025-03-02T23:00:00.000Z', end_ts: '2025-03-03T08:00:00.000Z' },
      { date: '2025-03-04', label: 'DAY', start_ts: '2025-03-04T11:00:00.000Z', end_ts: '2025-03-04T19:00:00.000Z' },
      { date: '2025-03-06', label: 'CUSTOM', start_ts: '2025-03-06T04:00:00.000Z', end_ts: '2025-03-06T12:00:00.000Z' },
      { date: '2025-03-09', label: 'EVENING', start_ts: '2025-03-09T16:00:00.000Z', end_ts: '2025-03-10T01:00:00.000Z' },
      { date: '2025-03-11', label: 'DAY', start_ts: '2025-03-11T09:00:00.000Z', end_ts: '2025-03-11T17:00:00.000Z' },
    ]
    const r = analyseShiftPattern(shifts, '2025-03-11')
    expect(r.patternType).toBe('irregular')
  })

  it('back-to-back same shift type: stable rotation; 12h gap is critical per thresholds', () => {
    const shifts = [
      {
        date: '2025-04-01',
        label: 'DAY',
        start_ts: '2025-04-01T07:00:00.000Z',
        end_ts: '2025-04-01T19:00:00.000Z',
      },
      {
        date: '2025-04-02',
        label: 'DAY',
        start_ts: '2025-04-02T07:00:00.000Z',
        end_ts: '2025-04-02T19:00:00.000Z',
      },
    ]
    const r = analyseShiftPattern(shifts, '2025-04-02')
    expect(r.transitions).toHaveLength(1)
    const t = r.transitions[0]
    expect(t.rotationDirection).toBe('stable')
    expect(t.recoveryHours).toBe(12)
    expect(t.transitionSeverity).toBe('critical')
    expect(t.napRecommended).toBe(true)
    expect(Math.abs(t.sleepAnchorShift)).toBeLessThanOrEqual(0.75)
  })

  it('same shift family with ≥17h recovery: high severity (nap still recommended)', () => {
    const shifts = [
      {
        date: '2025-04-01',
        label: 'DAY',
        start_ts: '2025-04-01T07:00:00.000Z',
        end_ts: '2025-04-01T19:00:00.000Z',
      },
      {
        date: '2025-04-02',
        label: 'DAY',
        start_ts: '2025-04-02T12:00:00.000Z',
        end_ts: '2025-04-02T22:00:00.000Z',
      },
    ]
    const t = analyseShiftPattern(shifts, '2025-04-02').transitions[0]!
    expect(t.recoveryHours).toBe(17)
    expect(t.transitionSeverity).toBe('high')
    expect(t.napRecommended).toBe(true)
  })

  it('circularHourDelta wraps correctly', () => {
    expect(circularHourDelta(23, 1)).toBe(2)
    expect(circularHourDelta(1, 23)).toBe(-2)
  })

  it('idealSleepMidpoint: night vs day', () => {
    const dayStart = new Date('2025-06-15T07:00:00.000Z')
    const dayEnd = new Date('2025-06-15T19:00:00.000Z')
    const nh = idealSleepMidpointHour(dayStart, dayEnd, 'day')
    expect(nh).toBeGreaterThanOrEqual(0)
    expect(nh).toBeLessThan(24)

    const ns = new Date('2025-06-15T19:00:00.000Z')
    const ne = new Date('2025-06-16T07:00:00.000Z')
    const mh = idealSleepMidpointHour(ns, ne, 'night')
    expect(mh).toBeGreaterThan(8)
    expect(mh).toBeLessThan(18)
  })
})
