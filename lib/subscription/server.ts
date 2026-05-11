import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveSubscriptionAccess, type EffectivePlan } from '@/lib/subscription/access'
import { supabaseServer } from '@/lib/supabase-server'

const DEV_OVERRIDE_USER_IDS = new Set(['333dd216-62fb-49a0-916e-304b84673310'])

export async function getServerSubscriptionAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ isPro: boolean; plan: EffectivePlan }> {
  if (DEV_OVERRIDE_USER_IDS.has(userId)) {
    return { isPro: true, plan: 'tester' }
  }

  const { data: directData } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_plan, trial_ends_at, created_at')
    .eq('user_id', userId)
    .maybeSingle()
  let data = directData

  // Some API contexts can have restrictive RLS/session drift; retry with service role.
  if (!data) {
    const { data: fallbackData } = await supabaseServer
      .from('profiles')
      .select('subscription_status, subscription_plan, trial_ends_at, created_at')
      .eq('user_id', userId)
      .maybeSingle()
    data = fallbackData
  }

  let authUserCreatedAt: string | null = null
  if (supabase.auth && typeof supabase.auth.getUser === 'function') {
    const { data: authData } = await supabase.auth.getUser()
    authUserCreatedAt = authData?.user?.created_at ?? null
  }

  const access = deriveSubscriptionAccess({
    subscriptionStatus: data?.subscription_status ?? null,
    subscriptionPlan: data?.subscription_plan ?? null,
    trialEndsAt: data?.trial_ends_at ?? null,
    profileCreatedAt: data?.created_at ?? null,
    authUserCreatedAt,
    revenuecatEntitlements: null,
    revenuecatSubscriptionId: null,
  })

  return access
}
