import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST } from '@/app/api/onboarding/plan/route'
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

function req(selection: unknown) {
  return new NextRequest('http://localhost/api/onboarding/plan', {
    method: 'POST',
    body: JSON.stringify({ selection }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/onboarding/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when user is missing', async () => {
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: {} as any,
      userId: null,
      isDevFallback: false,
    })

    const res = await POST(req('free'))
    const json = await res.json()

    expect(buildUnauthorizedResponse).toHaveBeenCalled()
    expect(res.status).toBe(401)
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('calls grant_free_trial_once for free selection and returns trial payload', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          granted: true,
          reason: 'granted',
          trial_ends_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: { rpc } as any,
      userId: 'user-1',
      isDevFallback: false,
    })

    const res = await POST(req('free'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('grant_free_trial_once', {
      p_user_id: 'user-1',
      p_days: 7,
      p_source: 'onboarding_free',
    })
    expect(json).toEqual({
      success: true,
      selection: 'free',
      trial: {
        granted: true,
        reason: 'granted',
        trialEndsAt: '2026-05-15T12:00:00.000Z',
      },
    })
  })

  it('returns not granted trial state when already claimed', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          granted: false,
          reason: 'already_claimed',
          trial_ends_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: { rpc } as any,
      userId: 'user-1',
      isDevFallback: false,
    })

    const res = await POST(req('free'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.trial).toEqual({
      granted: false,
      reason: 'already_claimed',
      trialEndsAt: '2026-05-15T12:00:00.000Z',
    })
  })

  it('returns bad request for invalid selection', async () => {
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: {} as any,
      userId: 'user-1',
      isDevFallback: false,
    })

    const res = await POST(req('weekly'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ error: 'Invalid selection' })
  })

  it('upserts profile and retries trial grant when rpc returns profile_not_found', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ granted: false, reason: 'profile_not_found', trial_ends_at: null }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ granted: true, reason: 'granted', trial_ends_at: '2026-05-15T12:00:00.000Z' }],
        error: null,
      })

    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(getServerSupabaseAndUserId).mockResolvedValue({
      supabase: { rpc, from: vi.fn(() => ({ upsert })) } as any,
      userId: 'user-1',
      isDevFallback: false,
    })

    const res = await POST(req('free'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(upsert).toHaveBeenCalledWith({ user_id: 'user-1', onboarding_completed: true }, { onConflict: 'user_id' })
    expect(json.trial).toEqual({
      granted: true,
      reason: 'granted',
      trialEndsAt: '2026-05-15T12:00:00.000Z',
    })
  })
})
