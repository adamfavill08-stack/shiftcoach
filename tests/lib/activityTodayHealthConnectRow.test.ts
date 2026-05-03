import { describe, it, expect } from 'vitest'
import { filterActivityLogRowsToCivilYmd } from '@/lib/activity/activityLogCivilDay'
import { computeActivityTotalsBreakdown } from '@/lib/activity/activityLogStepSum'

/**
 * After Health Connect sync, activity_logs holds one wearable row for civil today;
 * /api/activity/today uses civil-day filtering + breakdown — this mirrors that total path.
 */
describe('activity today total after Health Connect daily row', () => {
  it('counts health_connect daily row for local civil today', () => {
    const tz = 'Europe/London'
    const today = '2026-05-01'
    const rows: Record<string, unknown>[] = [
      {
        id: 'hc1',
        steps: 507,
        source: 'health_connect',
        activity_date: today,
        ts: '2026-05-01T20:00:00.000Z',
      },
    ]
    const filtered = filterActivityLogRowsToCivilYmd(rows, today, tz)
    const bd = computeActivityTotalsBreakdown(filtered as any)
    expect(bd.totalSteps).toBe(507)
    expect(bd.sourceOfTruth).toBe('wearable')
  })
})
