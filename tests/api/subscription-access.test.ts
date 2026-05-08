import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { GET } from '@/app/api/subscription/access/route'
import { buildUnauthorizedResponse, getServerSupabaseAndUserId } from '@/lib/supabase/server'

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

function asQueryResult(data: unknown, error: unknown = null) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => chain,
    then(onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) {
      return Promise.resolve({ data, error }).then(onFulfilled, onRejected)
    },
  }
  return chain
}

describe('GET /api/subscription/access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps unauthorized behavior unchanged', async () => {
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: {} as any,
      userId: null,
      isDevFallback: false,
    })

    const res = await GET()
    const json = await res.json()

    expect(buildUnauthorizedResponse).toHaveBeenCalled()
    expect(res.status).toBe(401)
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns isPro true for trialing profile with future trial_ends_at using minimal schema', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'someone@example.com' } } }),
      },
      from: vi.fn(() =>
        asQueryResult({
          subscription_status: 'trialing',
          subscription_plan: 'free',
          trial_ends_at: '2099-01-01T00:00:00.000Z',
          created_at: '2098-12-25T00:00:00.000Z',
        }),
      ),
    }
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: supabase as any,
      userId: 'user-trial',
      isDevFallback: false,
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ isPro: true, plan: 'free', isActive: true })
  })

  it('returns 500 on profile select error instead of silent free fallback', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'someone@example.com' } } }),
      },
      from: vi.fn(() =>
        asQueryResult(null, {
          message: 'column revenuecat_entitlements does not exist',
        }),
      ),
    }
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: supabase as any,
      userId: 'user-err',
      isDevFallback: false,
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toContain('revenuecat_entitlements does not exist')
  })
})
