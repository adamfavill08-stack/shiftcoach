import { describe, expect, it } from 'vitest'
import {
  applyCurrentShiftFallbackBounds,
  isWorkRosterLabel,
  pickCurrentShiftFromOverlapRows,
  syntheticCivilDayShiftBounds,
} from '@/lib/activity/currentShiftForActivityToday'

describe('isWorkRosterLabel', () => {
  it('treats OFF and empty as non-work', () => {
    expect(isWorkRosterLabel(null)).toBe(false)
    expect(isWorkRosterLabel('')).toBe(false)
    expect(isWorkRosterLabel('OFF')).toBe(false)
    expect(isWorkRosterLabel('off')).toBe(false)
    expect(isWorkRosterLabel('ANNUAL_LEAVE')).toBe(false)
    expect(isWorkRosterLabel('SICK')).toBe(false)
  })

  it('treats DAY / NIGHT / CUSTOM as work', () => {
    expect(isWorkRosterLabel('DAY')).toBe(true)
    expect(isWorkRosterLabel('NIGHT')).toBe(true)
    expect(isWorkRosterLabel('CUSTOM')).toBe(true)
    expect(isWorkRosterLabel('MORNING')).toBe(true)
  })
})

describe('pickCurrentShiftFromOverlapRows', () => {
  const buffer = 60 * 60 * 1000

  it('prefers the interval that contains now over buffer-only overlap', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const ended = {
      label: 'DAY',
      date: '2026-06-15',
      start_ts: '2026-06-15T06:00:00.000Z',
      end_ts: '2026-06-15T10:00:00.000Z',
    }
    const active = {
      label: 'DAY',
      date: '2026-06-15',
      start_ts: '2026-06-15T11:00:00.000Z',
      end_ts: '2026-06-15T18:00:00.000Z',
    }
    const picked = pickCurrentShiftFromOverlapRows([ended, active], now, buffer)
    expect(picked).toEqual(active)
  })

  it('when two intervals contain now, picks latest start_ts', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const early = {
      label: 'DAY',
      date: '2026-06-15',
      start_ts: '2026-06-15T08:00:00.000Z',
      end_ts: '2026-06-15T20:00:00.000Z',
    }
    const late = {
      label: 'DAY',
      date: '2026-06-15',
      start_ts: '2026-06-15T10:00:00.000Z',
      end_ts: '2026-06-15T18:00:00.000Z',
    }
    const picked = pickCurrentShiftFromOverlapRows([early, late], now, buffer)
    expect(picked).toEqual(late)
  })

  it('returns null when no row overlaps the buffered window', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const far = {
      label: 'DAY',
      date: '2026-06-14',
      start_ts: '2026-06-14T06:00:00.000Z',
      end_ts: '2026-06-14T08:00:00.000Z',
    }
    expect(pickCurrentShiftFromOverlapRows([far], now, buffer)).toBe(null)
  })

  it('ignores rows with null timestamps', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    expect(
      pickCurrentShiftFromOverlapRows(
        [{ label: 'DAY', date: '2026-06-15', start_ts: null, end_ts: null }],
        now,
        buffer,
      ),
    ).toBe(null)
  })
})

describe('applyCurrentShiftFallbackBounds', () => {
  it('fills civil day bounds for DAY when times are null', () => {
    const row = { label: 'DAY', date: '2026-06-15', start_ts: null, end_ts: null }
    const out = applyCurrentShiftFallbackBounds(row, '2026-06-15', 'UTC')
    expect(out.label).toBe('DAY')
    expect(out.start_ts).toBeTruthy()
    expect(out.end_ts).toBeTruthy()
    expect(new Date(out.start_ts!).getTime()).toBeLessThan(new Date(out.end_ts!).getTime())
  })

  it('does not mutate OFF rows', () => {
    const row = { label: 'OFF', date: '2026-06-15', start_ts: null, end_ts: null }
    expect(applyCurrentShiftFallbackBounds(row, '2026-06-15', 'UTC')).toEqual(row)
  })

  it('leaves existing timestamps unchanged', () => {
    const row = {
      label: 'DAY',
      date: '2026-06-15',
      start_ts: '2026-06-15T07:00:00.000Z',
      end_ts: '2026-06-15T19:00:00.000Z',
    }
    expect(applyCurrentShiftFallbackBounds(row, '2026-06-15', 'UTC')).toEqual(row)
  })
})

describe('syntheticCivilDayShiftBounds', () => {
  it('returns ordered bounds for Europe/London', () => {
    const { start_ts, end_ts } = syntheticCivilDayShiftBounds('2026-01-10', 'Europe/London')
    expect(Date.parse(start_ts)).toBeLessThan(Date.parse(end_ts))
  })
})
