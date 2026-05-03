import { describe, expect, it } from 'vitest'
import { buildManualInsertPayloadPhases } from '@/lib/activity/insertManualActivityLog'

const baseInput = {
  userId: '11111111-1111-1111-1111-111111111111',
  activityDate: '2026-05-03',
  steps: 2000,
  activityType: 'walk' as const,
  reason: 'wearable_sync_missing' as const,
  startTimeIso: '2026-05-03T10:00:00.000Z',
  endTimeIso: '2026-05-03T11:00:00.000Z',
  syncedAtIso: '2026-05-03T10:30:00.000Z',
}

describe('buildManualInsertPayloadPhases', () => {
  it('never puts bare-only rows in the session phase (regression: bare used to win before bareNoMerge)', () => {
    const { sessionAttempts, minimalAttempts } = buildManualInsertPayloadPhases(baseInput)
    expect(sessionAttempts.length).toBeGreaterThan(0)
    expect(minimalAttempts.length).toBeGreaterThan(0)

    const bareOnlyInSession = sessionAttempts.some(
      (p) =>
        p.source === 'manual' &&
        p.steps === 2000 &&
        p.activity_date === '2026-05-03' &&
        !('merge_status' in p) &&
        !('activity_type' in p),
    )
    expect(bareOnlyInSession).toBe(false)
    expect(sessionAttempts.every((p) => p.merge_status === 'active')).toBe(true)
  })

  it('includes merge_status, activity_type, start_time, end_time, and reason on the first rich session payload', () => {
    const { sessionAttempts } = buildManualInsertPayloadPhases(baseInput)
    const richLike = sessionAttempts.find(
      (p) =>
        p.merge_status === 'active' &&
        p.activity_type === 'walk' &&
        p.reason === 'wearable_sync_missing' &&
        p.start_time === baseInput.startTimeIso &&
        p.end_time === baseInput.endTimeIso,
    )
    expect(richLike).toBeDefined()
  })

  it('includes merge_status on bareNoMerge-derived payloads', () => {
    const { sessionAttempts } = buildManualInsertPayloadPhases(baseInput)
    const noMergeLike = sessionAttempts.filter((p) => p.activity_type === 'walk' && p.merge_status === 'active')
    expect(noMergeLike.length).toBeGreaterThan(0)
  })
})
