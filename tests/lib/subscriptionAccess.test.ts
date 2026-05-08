import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canUseFeature, getBlogArticleLimit, getHistoryLimitDays } from '@/lib/subscription/features'
import { deriveSubscriptionAccess } from '@/lib/subscription/access'

describe('deriveSubscriptionAccess — trialing + trial_ends_at (e.g. store-synced)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('grants Pro while trialing window is valid (plan free + trialing + future trial_ends_at)', () => {
    const trialEndsAt = '2026-05-08T12:00:00.000Z'
    const access = deriveSubscriptionAccess({
      subscriptionStatus: 'trialing',
      subscriptionPlan: 'free',
      trialEndsAt,
    })
    expect(access).toEqual({ isPro: true, plan: 'free' })
  })

  it('drops to free tier after trial_ends_at (no RevenueCat)', () => {
    const trialEndsAt = '2026-04-30T12:00:00.000Z'
    const access = deriveSubscriptionAccess({
      subscriptionStatus: 'trialing',
      subscriptionPlan: 'free',
      trialEndsAt,
    })
    expect(access).toEqual({ isPro: false, plan: 'free' })
  })

  it('keeps Pro access for new free profiles in first 7 days when trial fields are missing', () => {
    const access = deriveSubscriptionAccess({
      subscriptionStatus: null,
      subscriptionPlan: 'free',
      trialEndsAt: null,
      profileCreatedAt: '2026-04-27T12:00:00.000Z',
    })
    expect(access).toEqual({ isPro: true, plan: 'free' })
  })

  it('does not grant fallback trial after first 7 days when trial fields are missing', () => {
    const access = deriveSubscriptionAccess({
      subscriptionStatus: null,
      subscriptionPlan: 'free',
      trialEndsAt: null,
      profileCreatedAt: '2026-04-20T12:00:00.000Z',
    })
    expect(access).toEqual({ isPro: false, plan: 'free' })
  })

  it('maps paid plan when trialing on monthly/yearly', () => {
    const access = deriveSubscriptionAccess({
      subscriptionStatus: 'trialing',
      subscriptionPlan: 'yearly',
      trialEndsAt: '2026-05-10T00:00:00.000Z',
    })
    expect(access).toEqual({ isPro: true, plan: 'yearly' })
  })

  it('treats subscription_plan pro + active as Pro', () => {
    const access = deriveSubscriptionAccess({
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro',
    })
    expect(access).toEqual({ isPro: true, plan: 'pro' })
  })

  it('treats subscription_plan pro without active status as free unless entitlement payload is active', () => {
    const access = deriveSubscriptionAccess({
      subscriptionStatus: 'canceled',
      subscriptionPlan: 'pro',
    })
    expect(access).toEqual({ isPro: false, plan: 'free' })
  })

  it('does not drop Pro access when status is active even if profile plan says free', () => {
    const access = deriveSubscriptionAccess({
      subscriptionStatus: 'active',
      subscriptionPlan: 'free',
      trialEndsAt: null,
    })
    expect(access.isPro).toBe(true)
  })
})

describe('canUseFeature / limits by tier', () => {
  const freeTier = { isPro: false, plan: 'free' as const }
  const proAccessFreePlanLabel = { isPro: true, plan: 'free' as const }

  it('allows free users to edit calorie profile settings (full profile completion)', () => {
    expect(canUseFeature('calorie_profile_settings', freeTier)).toBe(true)
  })

  it('blocks Pro-only features on free tier', () => {
    expect(canUseFeature('adjusted_calories', freeTier)).toBe(false)
    expect(getHistoryLimitDays(freeTier)).toBe(31)
    expect(getBlogArticleLimit(freeTier)).toBe(1)
  })

  it('allows Pro-only features when isPro (e.g. active subscription or valid trialing window)', () => {
    expect(canUseFeature('adjusted_calories', proAccessFreePlanLabel)).toBe(true)
    expect(getHistoryLimitDays(proAccessFreePlanLabel)).toBeNull()
    expect(getBlogArticleLimit(proAccessFreePlanLabel)).toBeNull()
  })
})
