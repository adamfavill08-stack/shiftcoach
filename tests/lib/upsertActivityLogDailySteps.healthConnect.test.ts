import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertActivityLogDailySteps } from '@/lib/activity/upsertActivityLogDailySteps'

vi.mock('@/lib/activity/manualWearableSupersede', () => ({
  markAllManualSessionsSupersededForWearableDay: vi.fn().mockResolvedValue(undefined),
}))

function createActivityLogsMock(opts: { existingId: string | null }) {
  const updateMock = vi.fn()
  const insertMock = vi.fn()

  return {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: opts.existingId ? { id: opts.existingId } : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      update: (payload: unknown) => ({
        eq: (_c: string, _id: string) => {
          updateMock(payload, _c, _id)
          return Promise.resolve({ error: null })
        },
      }),
      insert: (row: unknown) => {
        insertMock(row)
        return Promise.resolve({ error: null })
      },
    })),
    updateMock,
    insertMock,
  }
}

describe('upsertActivityLogDailySteps (health_connect daily)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates existing wearable row down to latest Health Connect total (not max)', async () => {
    const db = createActivityLogsMock({ existingId: 'wear-1' })
    const supabase = db as any

    const r = await upsertActivityLogDailySteps(supabase, 'user-1', {
      steps: 507,
      syncedAt: '2026-05-01T12:00:00.000Z',
      source: 'health_connect',
      activityDate: '2026-05-01',
      loggedAt: '2026-05-01T11:59:00.000Z',
    })

    expect(r.error).toBeNull()
    expect(db.updateMock).toHaveBeenCalled()
    const payload = db.updateMock.mock.calls[0][0]
    expect(payload.steps).toBe(507)
    expect(payload.source).toBe('health_connect')
    expect(payload.activity_date).toBe('2026-05-01')
  })

  it('inserts when no existing row', async () => {
    const db = createActivityLogsMock({ existingId: null })
    const supabase = db as any

    const r = await upsertActivityLogDailySteps(supabase, 'user-1', {
      steps: 507,
      syncedAt: '2026-05-01T12:00:00.000Z',
      source: 'health_connect',
      activityDate: '2026-05-01',
    })

    expect(r.error).toBeNull()
    expect(db.insertMock).toHaveBeenCalled()
    const row = db.insertMock.mock.calls[0][0]
    expect(row.user_id).toBe('user-1')
    expect(row.steps).toBe(507)
  })
})
