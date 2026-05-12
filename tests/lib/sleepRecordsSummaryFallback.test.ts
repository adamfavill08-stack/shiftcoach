import { describe, it, expect, vi } from 'vitest'
import {
  mergeSleepRecordSegments,
  loadPhoneHealthSleepForSummary,
  fetchMergedPhoneHealthSleepSessionsOverlapping,
  sleepIntervalsOverlapIso,
  type PhoneHealthSleepRecordRow,
} from '@/lib/sleep/sleepRecordsSummaryFallback'

function mockSupabaseForSleepRecords(rows: PhoneHealthSleepRecordRow[] | null, error: unknown = null) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    lte: () => chain,
    gte: () => chain,
    order: () => chain,
    then(onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) {
      return Promise.resolve({ data: rows, error }).then(onFulfilled, onRejected)
    },
    catch(onRejected: (e: unknown) => unknown) {
      return Promise.resolve({ data: rows, error }).catch(onRejected)
    },
  }
  return { from: vi.fn(() => chain) } as any
}

describe('sleepIntervalsOverlapIso', () => {
  it('detects overlap', () => {
    expect(
      sleepIntervalsOverlapIso(
        { start_at: '2025-01-01T22:00:00.000Z', end_at: '2025-01-02T06:00:00.000Z' },
        { start_at: '2025-01-02T05:00:00.000Z', end_at: '2025-01-02T07:00:00.000Z' },
      ),
    ).toBe(true)
  })
  it('returns false for adjacent non-overlap', () => {
    expect(
      sleepIntervalsOverlapIso(
        { start_at: '2025-01-01T22:00:00.000Z', end_at: '2025-01-02T06:00:00.000Z' },
        { start_at: '2025-01-02T06:00:00.000Z', end_at: '2025-01-02T08:00:00.000Z' },
      ),
    ).toBe(false)
  })
})

describe('mergeSleepRecordSegments', () => {
  it('returns one session when OS sends contiguous fragments (gap under 45m)', () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-10T23:00:00.000Z', stage: 'light' },
      { start_at: '2025-03-10T23:00:00.000Z', end_at: '2025-03-11T06:00:00.000Z', stage: 'deep' },
    ]
    const merged = mergeSleepRecordSegments(rows)
    expect(merged).toHaveLength(1)
    expect(merged[0].start_at).toBe('2025-03-10T22:00:00.000Z')
    expect(merged[0].end_at).toBe('2025-03-11T06:00:00.000Z')
  })

  it('splits into two sessions when gap exceeds 45 minutes', () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-10T23:00:00.000Z', stage: 'light' },
      {
        start_at: '2025-03-11T00:00:00.000Z',
        end_at: '2025-03-11T06:00:00.000Z',
        stage: 'light',
      },
    ]
    const merged = mergeSleepRecordSegments(rows)
    expect(merged).toHaveLength(2)
  })

  it('drops awake and inbed rows; keeps asleep and stage buckets', () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T21:00:00.000Z', end_at: '2025-03-10T22:00:00.000Z', stage: 'awake' },
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-11T06:00:00.000Z', stage: 'asleep' },
    ]
    const merged = mergeSleepRecordSegments(rows)
    expect(merged).toHaveLength(1)
    expect(merged[0].end_at).toBe('2025-03-11T06:00:00.000Z')
  })

  it('filters sessions shorter than 30 minutes after merge', () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-10T22:20:00.000Z', stage: 'light' },
    ]
    expect(mergeSleepRecordSegments(rows)).toHaveLength(0)
  })

  it('returns empty when only awake/inbed remain', () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-10T23:00:00.000Z', stage: 'inbed' },
    ]
    expect(mergeSleepRecordSegments(rows)).toHaveLength(0)
  })

  it('sorts out-of-order rows before merging', () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T23:00:00.000Z', end_at: '2025-03-11T06:00:00.000Z', stage: 'light' },
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-10T23:00:00.000Z', stage: 'light' },
    ]
    const merged = mergeSleepRecordSegments(rows)
    expect(merged).toHaveLength(1)
    expect(merged[0].start_at).toBe('2025-03-10T22:00:00.000Z')
  })
})

describe('fetchMergedPhoneHealthSleepSessionsOverlapping + loadPhoneHealthSleepForSummary', () => {
  it('returns [] when Supabase returns error (same as no rows)', async () => {
    const db = mockSupabaseForSleepRecords([], { message: 'rls' })
    const got = await fetchMergedPhoneHealthSleepSessionsOverlapping(db, 'u1', '2025-01-01', '2025-01-08')
    expect(got).toEqual([])
  })

  it('loadPhoneHealthSleepForSummary: no data → null lastNight and empty map', async () => {
    const db = mockSupabaseForSleepRecords([])
    const now = new Date('2025-03-12T12:00:00.000Z')
    const r = await loadPhoneHealthSleepForSummary(db, 'u1', '2025-03-04T00:00:00.000Z', now)
    expect(r.lastNight).toBeNull()
    expect(r.minutesByShiftedDay.size).toBe(0)
  })

  it('loadPhoneHealthSleepForSummary: picks most recently ended completed session as lastNight', async () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-09T22:00:00.000Z', end_at: '2025-03-10T06:00:00.000Z', stage: 'light' },
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-11T06:00:00.000Z', stage: 'light' },
    ]
    const db = mockSupabaseForSleepRecords(rows)
    const now = new Date('2025-03-11T10:00:00.000Z')
    const r = await loadPhoneHealthSleepForSummary(db, 'u1', '2025-03-01T00:00:00.000Z', now)
    expect(r.lastNight).not.toBeNull()
    expect(r.lastNight!.end_at).toBe('2025-03-11T06:00:00.000Z')
    expect(r.lastNight!.quality).toBeNull()
  })

  it('loadPhoneHealthSleepForSummary: excludes sessions that have not ended yet', async () => {
    const rows: PhoneHealthSleepRecordRow[] = [
      { start_at: '2025-03-10T22:00:00.000Z', end_at: '2025-03-11T14:00:00.000Z', stage: 'light' },
      { start_at: '2025-03-09T22:00:00.000Z', end_at: '2025-03-10T06:00:00.000Z', stage: 'light' },
    ]
    const db = mockSupabaseForSleepRecords(rows)
    const now = new Date('2025-03-11T08:00:00.000Z')
    const r = await loadPhoneHealthSleepForSummary(db, 'u1', '2025-03-01T00:00:00.000Z', now)
    expect(r.lastNight!.end_at).toBe('2025-03-10T06:00:00.000Z')
  })

})
