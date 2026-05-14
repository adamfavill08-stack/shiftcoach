import { describe, it, expect } from 'vitest'
import { estimateShiftRowBounds } from '@/lib/shift-context/resolveShiftContext'
import { buildForwardPostNightPreviewSession } from '@/lib/sleep/forwardPostNightPlanPreview'

const TZ = 'Europe/London'

describe('buildForwardPostNightPreviewSession', () => {
  const nightRow = {
    date: '2026-05-11',
    label: 'NIGHT' as const,
    start_ts: '2026-05-11T21:30:00.000Z',
    end_ts: '2026-05-11T05:45:00.000Z',
  }

  it('returns synthetic main_sleep after duty end + commute + wind-down when night not ended and no post-duty log', () => {
    const { end } = estimateShiftRowBounds(nightRow, new Date(), TZ)
    const endMs = end.getTime()
    const nowMs = Date.parse('2026-05-11T13:00:00.000Z')
    expect(endMs).toBeGreaterThan(nowMs)

    const out = buildForwardPostNightPreviewSession({
      scopeYmd: '2026-05-11',
      shifts: [nightRow],
      timeZone: TZ,
      nowMs,
      commuteMinutes: 25,
      targetSleepMinutes: 420,
      rosterNightOnScope: true,
      existingSessionLikes: [
        {
          start_at: '2026-05-10T22:00:00.000Z',
          end_at: '2026-05-11T05:45:00.000Z',
          type: 'main_sleep',
        },
      ],
    })
    expect(out).not.toBeNull()
    expect(out!.type).toBe('main_sleep')
    const synStart = Date.parse(out!.start_at)
    const expectedFloor = endMs + 25 * 60 * 1000 + 30 * 60 * 1000 + 1
    expect(synStart).toBe(expectedFloor)
    const durMin = (Date.parse(out!.end_at) - synStart) / (60 * 1000)
    expect(durMin).toBeGreaterThanOrEqual(420)
  })

  it('returns null when a primary session already ends after this duty end', () => {
    const { end } = estimateShiftRowBounds(nightRow, new Date(), TZ)
    const endMs = end.getTime()
    const nowMs = Date.parse('2026-05-11T13:00:00.000Z')

    const out = buildForwardPostNightPreviewSession({
      scopeYmd: '2026-05-11',
      shifts: [nightRow],
      timeZone: TZ,
      nowMs,
      commuteMinutes: 25,
      targetSleepMinutes: 420,
      rosterNightOnScope: true,
      existingSessionLikes: [
        {
          start_at: new Date(endMs + 60 * 60 * 1000).toISOString(),
          end_at: new Date(endMs + 9 * 60 * 60 * 1000).toISOString(),
          type: 'main_sleep',
        },
      ],
    })
    expect(out).toBeNull()
  })

  it('returns synthetic main_sleep when duty recently ended and no post-duty log exists', () => {
    const { end } = estimateShiftRowBounds(nightRow, new Date(), TZ)
    const endMs = end.getTime()
    const nowMs = endMs + 60 * 60 * 1000

    const out = buildForwardPostNightPreviewSession({
      scopeYmd: '2026-05-11',
      shifts: [nightRow],
      timeZone: TZ,
      nowMs,
      commuteMinutes: 25,
      targetSleepMinutes: 420,
      rosterNightOnScope: true,
      existingSessionLikes: [],
    })
    expect(out).not.toBeNull()
    expect(Date.parse(out!.start_at)).toBe(endMs + 25 * 60 * 1000 + 30 * 60 * 1000 + 1)
  })

  it('returns null when duty ended outside the recovery preview horizon', () => {
    const { end } = estimateShiftRowBounds(nightRow, new Date(), TZ)
    const nowMs = end.getTime() + 19 * 60 * 60 * 1000

    const out = buildForwardPostNightPreviewSession({
      scopeYmd: '2026-05-11',
      shifts: [nightRow],
      timeZone: TZ,
      nowMs,
      commuteMinutes: 25,
      targetSleepMinutes: 420,
      rosterNightOnScope: true,
      existingSessionLikes: [],
    })
    expect(out).toBeNull()
  })

  it('returns null when rosterNightOnScope is false', () => {
    const nowMs = Date.parse('2026-05-11T13:00:00.000Z')
    const out = buildForwardPostNightPreviewSession({
      scopeYmd: '2026-05-11',
      shifts: [nightRow],
      timeZone: TZ,
      nowMs,
      commuteMinutes: 25,
      targetSleepMinutes: 420,
      rosterNightOnScope: false,
      existingSessionLikes: [],
    })
    expect(out).toBeNull()
  })
})
