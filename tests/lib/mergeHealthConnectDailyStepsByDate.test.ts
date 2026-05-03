import { describe, it, expect } from 'vitest'
import { mergeHealthConnectDailyStepsByDate } from '@/lib/health-connect/mergeHealthConnectDailyStepsByDate'

describe('mergeHealthConnectDailyStepsByDate', () => {
  it('sums multiple Health Connect payloads for the same civil day', () => {
    const merged = mergeHealthConnectDailyStepsByDate([
      { activityDate: '2026-05-01', steps: 100 },
      { activityDate: '2026-05-01', steps: 200 },
      { activityDate: '2026-05-01', steps: 207 },
      { activityDate: '2026-04-30', steps: 50 },
    ])
    expect(merged.find((d) => d.activityDate === '2026-05-01')?.steps).toBe(507)
    expect(merged.find((d) => d.activityDate === '2026-04-30')?.steps).toBe(50)
  })

  it('ignores invalid dates', () => {
    expect(
      mergeHealthConnectDailyStepsByDate([
        { activityDate: 'not-a-date', steps: 999 },
        { activityDate: '2026-01-02', steps: 1 },
      ]),
    ).toEqual([{ activityDate: '2026-01-02', steps: 1 }])
  })

  it('returns empty array when there are no valid rows', () => {
    expect(mergeHealthConnectDailyStepsByDate([])).toEqual([])
  })
})
