export type PaidPlan = 'monthly' | 'yearly'
export type EffectivePlan = 'free' | PaidPlan | 'tester' | 'pro'
export type SubscriptionPlan = EffectivePlan

export const PRODUCT_PLAN_MAP: Record<string, PaidPlan> = {
  pro_monthly: 'monthly',
  pro_annual: 'yearly',
  shiftcoach_monthly: 'monthly',
  shiftcoach_yearly: 'yearly',
}

export function getPlanFromProductId(productId?: string | null): PaidPlan | null {
  if (!productId) return null

  const normalized = productId.toLowerCase()

  if (PRODUCT_PLAN_MAP[normalized]) {
    return PRODUCT_PLAN_MAP[normalized]
  }

  if (normalized.includes('month')) return 'monthly'
  if (normalized.includes('year') || normalized.includes('annual')) return 'yearly'

  return null
}

export function isEntitlementActive(
  entitlements: unknown,
  entitlementId = 'pro',
): boolean {
  if (!entitlements || typeof entitlements !== 'object') return false
  const root = entitlements as Record<string, unknown>
  const active = root.active
  if (!active || typeof active !== 'object') return false
  return Boolean((active as Record<string, unknown>)[entitlementId])
}

export function normalizePlan(
  plan: string | null | undefined,
): EffectivePlan | null {
  if (!plan) return null
  const normalized = plan.toLowerCase()
  if (normalized === 'monthly') return 'monthly'
  if (normalized === 'yearly' || normalized === 'annual') return 'yearly'
  if (normalized === 'tester') return 'tester'
  if (normalized === 'free') return 'free'
  if (normalized === 'pro') return 'pro'
  return null
}

/** Start of “first week” grace: earliest trustworthy anchor (profile row vs auth user). */
function firstWeekAnchorMs(
  profileCreatedAt?: string | null,
  authUserCreatedAt?: string | null,
): number {
  const candidates: number[] = []
  for (const raw of [profileCreatedAt, authUserCreatedAt]) {
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (Number.isFinite(t)) candidates.push(t)
  }
  if (!candidates.length) return NaN
  return Math.min(...candidates)
}

export function deriveSubscriptionAccess(input: {
  subscriptionStatus?: string | null
  subscriptionPlan?: string | null
  trialEndsAt?: string | null
  profileCreatedAt?: string | null
  /** Supabase `auth.users.created_at` when `profiles.created_at` is missing or reset. */
  authUserCreatedAt?: string | null
  revenuecatEntitlements?: unknown
  revenuecatSubscriptionId?: string | null
}): { isPro: boolean; plan: EffectivePlan } {
  const normalizedPlan = normalizePlan(input.subscriptionPlan)
  const status = (input.subscriptionStatus ?? '').toLowerCase()
  const trialEndsAtMs = input.trialEndsAt ? new Date(input.trialEndsAt).getTime() : NaN
  const hasValidTrialWindow = Number.isFinite(trialEndsAtMs) && trialEndsAtMs > Date.now()
  const anchorMs = firstWeekAnchorMs(input.profileCreatedAt, input.authUserCreatedAt)
  const hasValidFirstWeekWindow =
    Number.isFinite(anchorMs) && anchorMs + 7 * 24 * 60 * 60 * 1000 > Date.now()
  const isTrialing = status === 'trialing' && hasValidTrialWindow
  const entitlementActive = isEntitlementActive(input.revenuecatEntitlements)
  const mappedPlan = getPlanFromProductId(input.revenuecatSubscriptionId)

  if (normalizedPlan === 'tester') {
    return { isPro: true, plan: 'tester' }
  }

  /**
   * First 7 days after `profiles.created_at`: unlock Pro UI for everyone **except** users who clearly
   * already have an active paid path (avoids stale `pro`+`canceled`, trialing without `trial_ends_at`
   * synced yet, Play Store / RevenueCat lag vs profile columns).
   */
  const clearlyActivePaid =
    entitlementActive ||
    (normalizedPlan === 'pro' && (status === 'active' || status === 'trialing')) ||
    ((normalizedPlan === 'monthly' || normalizedPlan === 'yearly') &&
      (status === 'active' || (status === 'trialing' && hasValidTrialWindow)))

  if (hasValidFirstWeekWindow && !clearlyActivePaid) {
    return { isPro: true, plan: 'free' }
  }

  if (normalizedPlan === 'pro') {
    if (status === 'active' || status === 'trialing' || entitlementActive) {
      return { isPro: true, plan: 'pro' }
    }
    return { isPro: false, plan: 'free' }
  }

  // trialing + trial_ends_at (e.g. store-managed trial synced to profile): full Pro until window ends.
  if (isTrialing) {
    if (normalizedPlan === 'monthly' || normalizedPlan === 'yearly') {
      return { isPro: true, plan: normalizedPlan }
    }
    if (mappedPlan) {
      return { isPro: true, plan: mappedPlan }
    }
    return { isPro: true, plan: 'free' }
  }

  const statusSuggestsPaid = status === 'active' || isTrialing
  const hasPaidSignal = statusSuggestsPaid || entitlementActive

  if (!hasPaidSignal) {
    return { isPro: false, plan: 'free' }
  }

  if (normalizedPlan === 'monthly' || normalizedPlan === 'yearly') {
    return { isPro: true, plan: normalizedPlan }
  }

  if (mappedPlan) {
    return { isPro: true, plan: mappedPlan }
  }

  // Default paid fallback if active but plan mapping missing.
  return { isPro: true, plan: 'monthly' }
}
