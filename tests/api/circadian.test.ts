import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { getSleepDeficitForCircadian } from '@/lib/circadian/sleep'
import { GET } from '@/app/api/circadian/calculate/route'

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {},
}))

vi.mock('@/lib/supabase/server', () => ({
  getServerSupabaseAndUserId: vi.fn(),
  buildUnauthorizedResponse: vi.fn(
    () =>
      new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
  ),
}))

vi.mock('@/lib/circadian/sleep', () => ({
  getSleepDeficitForCircadian: vi.fn(),
}))

/** Minimal thenable chain so `await db.from(...).select()...` resolves like @supabase/supabase-js */
function asQueryResult(data: unknown, error: unknown = null) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => chain,
    insert: () => chain,
    then(onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) {
      return Promise.resolve({ data, error }).then(onFulfilled, onRejected)
    },
    catch(onRejected: (e: unknown) => unknown) {
      return Promise.resolve({ data, error }).catch(onRejected)
    },
  }
  return chain
}

function insertChain(error: unknown = null) {
  const tail: any = {
    then(onFulfilled: (v: unknown) => unknown) {
      return Promise.resolve({ error }).then(onFulfilled)
    },
  }
  return { insert: () => tail }
}

type CircadianDbConfig = {
  precomputed?: { data: Record<string, unknown> | null; error?: unknown }
  sleepNew?: { data: unknown[]; error?: unknown }
  sleepOld?: { data: unknown[]; error?: unknown }
  shifts?: { data: unknown[]; error?: unknown }
  logInsertError?: unknown
}

function createCircadianMockDb(config: CircadianDbConfig) {
  let circadianFrom = 0
  let sleepFrom = 0

  return {
    from(table: string) {
      if (table === 'circadian_logs') {
        circadianFrom += 1
        if (circadianFrom === 1) {
          const { data = null, error = null } = config.precomputed ?? {}
          return asQueryResult(data, error)
        }
        return insertChain(config.logInsertError ?? null)
      }
      if (table === 'sleep_logs') {
        sleepFrom += 1
        if (sleepFrom === 1) {
          const { data = [], error = null } = config.sleepNew ?? {}
          return asQueryResult(data, error)
        }
        const { data = [], error = null } = config.sleepOld ?? {}
        return asQueryResult(data, error)
      }
      if (table === 'shifts') {
        const { data = [], error = null } = config.shifts ?? {}
        return asQueryResult(data, error)
      }
      return asQueryResult(null, { message: `unexpected table ${table}` })
    },
  }
}

function req() {
  return new NextRequest('http://localhost/api/circadian/calculate')
}

describe('GET /api/circadian/calculate — response contract', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getSleepDeficitForCircadian).mockResolvedValue({
      weeklyDeficit: 0,
      category: 'ok',
    } as unknown as Awaited<ReturnType<typeof getSleepDeficitForCircadian>>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok status with circadian payload when today’s cached row exists', async () => {
    const now = new Date()
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: createCircadianMockDb({
        precomputed: {
          data: {
            created_at: now.toISOString(),
            circadian_phase: 72,
            alignment_score: 68,
            latest_shift: 1,
            sleep_duration: 2,
            sleep_timing: 3,
            sleep_debt: 4,
            inconsistency: 5,
          },
        },
      }) as any,
      userId: 'user-test-1',
      isDevFallback: false,
    })

    const res = await GET(req())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(json.circadian).toBeTruthy()
    expect(json.circadian.circadianPhase).toBe(72)
    expect(json.source).toBe('cached_today')
  })

  it('returns non-ok status, null circadian, and reason when there is no sleep data', async () => {
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: createCircadianMockDb({
        precomputed: { data: null },
        sleepNew: { data: [] },
        sleepOld: { data: [] },
      }) as any,
      userId: 'user-test-1',
      isDevFallback: false,
    })

    const res = await GET(req())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).not.toBe('ok')
    expect(json.status).toBe('insufficient_data')
    expect(json.circadian).toBeNull()
    expect(json.reason || json.error).toBeDefined()
    expect(String(json.reason || json.error).length).toBeGreaterThan(0)
  })

  it('sets sleepDebtAssumedZero when sleep deficit helper throws (recalculated path)', async () => {
    vi.mocked(getSleepDeficitForCircadian).mockRejectedValue(new Error('deficit unavailable'))

    const sleepRow = {
      type: 'sleep',
      start_at: '2026-03-20T22:30:00.000Z',
      end_at: '2026-03-21T06:30:00.000Z',
    }

    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: createCircadianMockDb({
        precomputed: { data: null },
        sleepNew: { data: [sleepRow] },
        shifts: {
          data: [{ label: 'DAY', start_ts: '2026-03-21T08:00:00.000Z', date: '2026-03-21' }],
        },
      }) as any,
      userId: 'user-test-1',
      isDevFallback: false,
    })

    const res = await GET(req())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(json.circadian).toBeTruthy()
    expect(json.source).toBe('recalculated')
    expect(json.sleepDebtAssumedZero).toBe(true)
  })

  it('omits sleepDebtAssumedZero when deficit helper succeeds', async () => {
    vi.mocked(getSleepDeficitForCircadian).mockResolvedValue({
      weeklyDeficit: 0.5,
      category: 'mild',
    } as unknown as Awaited<ReturnType<typeof getSleepDeficitForCircadian>>)

    const sleepRow = {
      type: 'sleep',
      start_at: '2026-03-20T22:30:00.000Z',
      end_at: '2026-03-21T06:30:00.000Z',
    }

    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: createCircadianMockDb({
        precomputed: { data: null },
        sleepNew: { data: [sleepRow] },
        shifts: {
          data: [{ label: 'DAY', start_ts: '2026-03-21T08:00:00.000Z', date: '2026-03-21' }],
        },
      }) as any,
      userId: 'user-test-1',
      isDevFallback: false,
    })

    const res = await GET(req())
    const json = await res.json()

    expect(json.status).toBe('ok')
    expect(json).not.toHaveProperty('sleepDebtAssumedZero')
  })
})
