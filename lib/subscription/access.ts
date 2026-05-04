export type PaidPlan = 'monthly' | 'yearly'
export type EffectivePlan = 'free' | PaidPlan | 'tester'
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
  return null
}

export function deriveSubscriptionAccess(input: {
  subscriptionStatus?: string | null
  subscriptionPlan?: string | null
  trialEndsAt?: string | null
  revenuecatEntitlements?: unknown
  revenuecatSubscriptionId?: string | null
}): { isPro: boolean; plan: EffectivePlan } {
  const normalizedPlan = normalizePlan(input.subscriptionPlan)
  const status = (input.subscriptionStatus ?? '').toLowerCase()
  const trialEndsAtMs = input.trialEndsAt ? new Date(input.trialEndsAt).getTime() : NaN
  const hasValidTrialWindow = Number.isFinite(trialEndsAtMs) && trialEndsAtMs > Date.now()
  const isTrialing = status === 'trialing' && hasValidTrialWindow
  const entitlementActive = isEntitlementActive(input.revenuecatEntitlements)
  const mappedPlan = getPlanFromProductId(input.revenuecatSubscriptionId)

  if (normalizedPlan === 'tester') {
    return { isPro: true, plan: 'tester' }
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
