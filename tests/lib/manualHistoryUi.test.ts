import { describe, expect, it } from 'vitest'
import {
  formatManualTimeWindow,
  manualEntryStatusKind,
  manualHistoryRowMuted,
  manualHistoryRowSemantics,
} from '@/lib/activity/manualHistoryUi'
import { parseManualHistoryResponse } from '@/lib/activity/manualHistoryApi'

describe('manualEntryStatusKind', () => {
  it('treats active and null as counted', () => {
    expect(manualEntryStatusKind('active')).toBe('counted')
    expect(manualEntryStatusKind(null)).toBe('counted')
    expect(manualEntryStatusKind(undefined)).toBe('counted')
  })

  it('maps superseded_by_wearable to replaced', () => {
    expect(manualEntryStatusKind('superseded_by_wearable')).toBe('replaced')
  })

  it('maps other merge_status to not_counted', () => {
    expect(manualEntryStatusKind('partially_overlapped')).toBe('not_counted')
  })
})

describe('manualHistoryRowMuted', () => {
  it('mutes only superseded wearable rows', () => {
    expect(manualHistoryRowMuted('superseded_by_wearable')).toBe(true)
    expect(manualHistoryRowMuted('active')).toBe(false)
    expect(manualHistoryRowMuted(null)).toBe(false)
  })
})

describe('manualHistoryRowSemantics', () => {
  it('distinguishes superseded rows from active for UI', () => {
    expect(manualHistoryRowSemantics('superseded_by_wearable')).toEqual({ statusKind: 'replaced', muted: true })
    expect(manualHistoryRowSemantics('active')).toEqual({ statusKind: 'counted', muted: false })
    expect(manualHistoryRowSemantics(null)).toEqual({ statusKind: 'counted', muted: false })
  })
})

describe('formatManualTimeWindow', () => {
  it('joins start and end with en dash', () => {
    const s = formatManualTimeWindow('2026-05-01T14:00:00.000Z', '2026-05-01T15:30:00.000Z', {
      locale: 'en-US',
      timeZone: 'UTC',
    })
    expect(s).toMatch(/2:00/)
    expect(s).toMatch(/3:30/)
    expect(s).toContain('\u2013')
  })

  it('returns em dash when no times', () => {
    expect(formatManualTimeWindow(null, null)).toBe('\u2014')
  })
})

describe('parseManualHistoryResponse', () => {
  it('parses entries without affecting step totals elsewhere', () => {
    const parsed = parseManualHistoryResponse({
      date: '2026-05-01',
      entries: [
        {
          id: 'a1',
          activity_type: 'walk',
          steps: 3200,
          merge_status: 'active',
        },
        {
          id: 'a2',
          activity_type: 'walk',
          steps: 4000,
          merge_status: 'superseded_by_wearable',
        },
      ],
    })
    expect(parsed?.date).toBe('2026-05-01')
    expect(parsed?.entries).toHaveLength(2)
    expect(parsed?.entries[0]?.steps).toBe(3200)
    expect(parsed?.entries[1]?.merge_status).toBe('superseded_by_wearable')
  })

  it('returns null for invalid payload', () => {
    expect(parseManualHistoryResponse(null)).toBeNull()
    expect(parseManualHistoryResponse({})).toBeNull()
    expect(parseManualHistoryResponse({ date: 'bad', entries: [] })).toBeNull()
  })
})
