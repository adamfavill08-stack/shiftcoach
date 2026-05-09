import { describe, it, expect } from 'vitest'
import {
  civilYmdRangeInclusive,
  filterActivityLogRowsToCivilYmd,
  filterActivityLogRowsToCivilYmdSet,
  resolveActivityLogCivilYmd,
} from '@/lib/activity/activityLogCivilDay'
import { computeActivityTotalsBreakdown } from '@/lib/activity/activityLogStepSum'
import { filterActivityLogRowsForWearableDedupe } from '@/lib/activity/activityLogWearableDedupe'

describe('activityLogCivilDay', () => {
  it('regression: stale wearable row must not count as today when created_at is today', () => {
    const tz = 'America/Los_Angeles'
    const todayYmd = '2026-05-03'
    const rowA: Record<string, unknown> = {
      id: 'a',
      steps: 4321,
      source: null,
      activity_date: null,
      logged_at: '2026-03-19T12:00:00.000Z',
      created_at: '2026-05-03T08:00:00.000Z',
      ts: null,
    }
    const rowB: Record<string, unknown> = {
      id: 'b',
      steps: 534,
      source: 'health_connect',
      activity_date: todayYmd,
      logged_at: '2026-05-03T10:00:00.000Z',
      ts: '2026-05-03T18:00:00.000Z',
    }
    expect(resolveActivityLogCivilYmd(rowA, tz)).toBe('2026-03-19')
    expect(resolveActivityLogCivilYmd(rowB, tz)).toBe(todayYmd)

    const merged = [rowA, rowB]
    const civilFiltered = filterActivityLogRowsToCivilYmd(merged, todayYmd, tz)
    const kept = filterActivityLogRowsForWearableDedupe(civilFiltered as any[], tz)
    const bd = computeActivityTotalsBreakdown(kept as any[])
    expect(bd.totalSteps).toBe(534)
  })

  it('legacy manual may use created_at when activity day timestamps are missing', () => {
    const tz = 'UTC'
    const row: Record<string, unknown> = {
      id: 'm',
      source: 'manual',
      activity_date: null,
      start_time: null,
      ts: null,
      logged_at: null,
      created_at: '2026-05-03T15:00:00.000Z',
    }
    expect(resolveActivityLogCivilYmd(row, tz)).toBe('2026-05-03')
  })

  it('civilYmdRangeInclusive spans two local dates when window crosses midnight', () => {
    const tz = 'UTC'
    const start = new Date('2026-05-09T22:00:00.000Z')
    const end = new Date('2026-05-10T06:00:00.000Z')
    const range = civilYmdRangeInclusive(start, end, tz)
    expect(range).toEqual(['2026-05-09', '2026-05-10'])
  })

  it('filterActivityLogRowsToCivilYmdSet keeps rows from multiple civil days', () => {
    const tz = 'UTC'
    const rows: Record<string, unknown>[] = [
      { id: '1', source: 'health_connect', activity_date: '2026-05-09', ts: '2026-05-09T22:00:00.000Z', steps: 100 },
      { id: '2', source: 'health_connect', activity_date: '2026-05-10', ts: '2026-05-10T06:00:00.000Z', steps: 200 },
    ]
    const kept = filterActivityLogRowsToCivilYmdSet(rows, ['2026-05-09', '2026-05-10'], tz)
    expect(kept).toHaveLength(2)
    const onlyNine = filterActivityLogRowsToCivilYmdSet(rows, ['2026-05-09'], tz)
    expect(onlyNine).toHaveLength(1)
  })

  it('non-manual does not use created_at when logged_at and ts are missing', () => {
    const tz = 'UTC'
    const row: Record<string, unknown> = {
      id: 'w',
      source: null,
      activity_date: null,
      logged_at: null,
      ts: null,
      created_at: '2026-05-03T15:00:00.000Z',
    }
    expect(resolveActivityLogCivilYmd(row, tz)).toBeNull()
  })
})
