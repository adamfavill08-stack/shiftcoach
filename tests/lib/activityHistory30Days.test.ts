import { describe, expect, it } from 'vitest'
import { buildActivityHistory30Days, formatRosterTimeRange } from '@/lib/activity/activityHistory30Days'

describe('formatRosterTimeRange', () => {
  it('shows local wall times for cross-midnight roster (e.g. 17:30–02:30 Europe/London)', () => {
    const startMs = Date.parse('2026-05-11T16:30:00.000Z')
    const endMs = Date.parse('2026-05-12T01:30:00.000Z')
    const s = formatRosterTimeRange(startMs, endMs, 'Europe/London')
    expect(s).toContain('17:30')
    expect(s).toContain('02:30')
    expect(s).toMatch(/–|-/)
  })
})

describe('buildActivityHistory30Days — roster windows (no clock heuristics)', () => {
  const tz = 'Europe/London'
  /** Wed 6 May 2026 midday UTC (BST +1 locally). */
  const now = new Date('2026-05-06T12:00:00.000Z')

  it('anchors one roster block on the shift start civil day only; spill day is Recovery when roster crosses calendar dates', () => {
    // Roster Tue 22:30 – Wed 06:45 local (BST), not tied to legacy 19–07 examples.
    const shiftRows = [
      {
        date: '2026-05-04',
        label: 'NIGHT',
        start_ts: '2026-05-04T21:30:00.000Z',
        end_ts: '2026-05-05T05:45:00.000Z',
      },
    ]
    const res = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows,
      sampleRows: [],
    })

    const shiftCards = res.items.filter((i) => i.key.startsWith('shift:'))
    expect(shiftCards).toHaveLength(1)
    expect(shiftCards[0]?.rosterTimeRange).toBeTruthy()

    expect(res.items.some((i) => i.key === 'recovery-spill:2026-05-05')).toBe(true)
  })

  it('counts During steps across full roster span for 20:00–08:00 local', () => {
    const shiftRows = [
      {
        date: '2026-05-04',
        label: 'NIGHT',
        start_ts: '2026-05-04T19:00:00.000Z', // 20:00 BST
        end_ts: '2026-05-05T07:00:00.000Z', // 08:00 BST
      },
    ]
    const sampleRows = [
      { bucket_start_utc: '2026-05-04T21:30:00.000Z', bucket_end_utc: '2026-05-04T21:45:00.000Z', steps: 100 },
      { bucket_start_utc: '2026-05-05T04:00:00.000Z', bucket_end_utc: '2026-05-05T04:15:00.000Z', steps: 50 },
    ]
    const card = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows,
      sampleRows,
    }).items.find((i) => i.type === 'night_shift')

    expect(card?.duringShiftSteps).toBe(150)
    expect(card?.rosterTimeRange).toContain('20:00')
    expect(card?.rosterTimeRange).toContain('08:00')
  })

  it('does not create a spill Recovery row after same-calendar day roster (06:00–14:00 local)', () => {
    const shiftRows = [
      {
        date: '2026-05-05',
        label: 'DAY',
        start_ts: '2026-05-05T05:00:00.000Z', // 06:00 BST
        end_ts: '2026-05-05T13:00:00.000Z', // 14:00 BST
      },
    ]
    const res = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows,
      sampleRows: [],
    })
    expect(res.items.some((i) => i.key === 'recovery-spill:2026-05-06')).toBe(false)
    const card = res.items.find((i) => i.key.startsWith('shift:') && i.rosterTimeRange?.includes('06:00'))
    expect(card).toBeDefined()
    expect(card?.rosterTimeRange).toContain('14:00')
  })

  it('same for 14:00–22:00 local roster on one civil date', () => {
    const shiftRows = [
      {
        date: '2026-05-05',
        label: 'DAY',
        start_ts: '2026-05-05T13:00:00.000Z', // 14:00 BST
        end_ts: '2026-05-05T21:00:00.000Z', // 22:00 BST
      },
    ]
    const res = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows,
      sampleRows: [],
    })
    expect(res.items.filter((i) => i.key.startsWith('recovery-spill')).length).toBe(0)
    const card = res.items.find((i) => i.type === 'day_shift')
    expect(card?.rosterTimeRange).toContain('14:00')
    expect(card?.rosterTimeRange).toContain('22:00')
  })

  it('accepts start_time/end_time aliases same as *_ts', () => {
    const res = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows: [
        {
          date: '2026-05-04',
          shift_type: 'NIGHT',
          start_time: '2026-05-04T21:30:00.000Z',
          end_time: '2026-05-05T05:45:00.000Z',
        },
      ],
      sampleRows: [],
    })
    expect(res.items.some((i) => i.type === 'night_shift')).toBe(true)
  })
})

describe('buildActivityHistory30Days — verdict bands follow roster type label, not wall clock', () => {
  const tz = 'UTC'
  /** Roster anchored on May 10 in the UTC ladder. */
  const now = new Date('2026-05-11T15:00:00.000Z')

  it('NIGHT label uses night thresholds even when wall times are daytime', () => {
    const shiftRows = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T10:00:00.000Z',
        end_ts: '2026-05-10T18:00:00.000Z',
      },
    ]
    const low = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows,
      sampleRows: [
        { bucket_start_utc: '2026-05-10T12:00:00.000Z', bucket_end_utc: '2026-05-10T12:15:00.000Z', steps: 900 },
      ],
    }).items.find((i) => i.type === 'night_shift')
    expect(low?.verdict).toBe('Low')
  })

  it('DAY label uses day thresholds even when wall times cross midnight', () => {
    const shiftRows = [
      {
        date: '2026-05-10',
        label: 'DAY',
        start_ts: '2026-05-10T22:00:00.000Z',
        end_ts: '2026-05-11T06:00:00.000Z',
      },
    ]
    const low = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows,
      sampleRows: [
        { bucket_start_utc: '2026-05-10T23:00:00.000Z', bucket_end_utc: '2026-05-10T23:15:00.000Z', steps: 900 },
      ],
    }).items.find((i) => i.type === 'day_shift')
    expect(low?.verdict).toBe('Low')
  })

  it('night Good/High bands', () => {
    const base = {
      date: '2026-05-10',
      label: 'NIGHT',
      start_ts: '2026-05-10T10:00:00.000Z',
      end_ts: '2026-05-10T18:00:00.000Z',
    }
    const good = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows: [base],
      sampleRows: [
        { bucket_start_utc: '2026-05-10T12:00:00.000Z', bucket_end_utc: '2026-05-10T12:15:00.000Z', steps: 4000 },
      ],
    }).items.find((i) => i.type === 'night_shift')
    expect(good?.verdict).toBe('Good')

    const high = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows: [base],
      sampleRows: [
        { bucket_start_utc: '2026-05-10T12:00:00.000Z', bucket_end_utc: '2026-05-10T12:15:00.000Z', steps: 6000 },
      ],
    }).items.find((i) => i.type === 'night_shift')
    expect(high?.verdict).toBe('High')
  })
})

describe('buildActivityHistory30Days — non-shift templates', () => {
  const tz = 'UTC'
  const now = new Date('2026-05-05T15:00:00.000Z')

  it('uses Morning / Midday / Evening on a day off row', () => {
    const res = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows: [],
      sampleRows: [],
    })
    const off = res.items.find((i) => i.type === 'day_off')
    expect(off?.segments.map((s) => s.label)).toEqual(['Morning', 'Midday', 'Evening'])
  })

  it('marks missing wearable overlap calmly', () => {
    const res = buildActivityHistory30Days({
      now,
      timeZone: tz,
      shiftRows: [],
      sampleRows: [],
    })
    const off = res.items.find((i) => i.type === 'day_off')
    expect(off?.missingData).toBe(true)
    expect(off?.insight.toLowerCase()).toContain('no step data')
  })
})
