import { describe, expect, it, vi } from 'vitest'
import { getServerSubscriptionAccess } from '@/lib/subscription/server'

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: vi.fn(),
  },
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

describe('getServerSubscriptionAccess', () => {
  it('uses service-role fallback when primary profile read is null and preserves valid trial access', async () => {
    const primarySupabase = {
      from: vi.fn(() => asQueryResult(null)),
    }

    const { supabaseServer } = await import('@/lib/supabase-server')
    ;(supabaseServer.from as any).mockImplementation(() =>
      asQueryResult({
        subscription_status: 'trialing',
        subscription_plan: 'free',
        trial_ends_at: '2099-01-01T00:00:00.000Z',
        created_at: '2098-12-25T00:00:00.000Z',
        revenuecat_entitlements: null,
        revenuecat_subscription_id: null,
      }),
    )

    const access = await getServerSubscriptionAccess(primarySupabase as any, 'user-fallback-trial')

    expect(access).toEqual({ isPro: true, plan: 'free' })
  })
})
