import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveSubscriptionAccess } from '@/lib/subscription/access'
import { supabaseServer } from '@/lib/supabase-server'

const DEV_OVERRIDE_USER_IDS = new Set(['333dd216-62fb-49a0-916e-304b84673310'])

export async function getServerSubscriptionAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ isPro: boolean; plan: 'free' | 'monthly' | 'yearly' | 'tester' }> {
  if (DEV_OVERRIDE_USER_IDS.has(userId)) {
    return { isPro: true, plan: 'tester' }
  }

  const { data: directData } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_plan, revenuecat_entitlements, revenuecat_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()
  let data = directData

  // Some API contexts can have restrictive RLS/session drift; retry with service role.
  if (!data) {
    const { data: fallbackData } = await supabaseServer
      .from('profiles')
      .select('subscription_status, subscription_plan, revenuecat_entitlements, revenuecat_subscription_id')
      .eq('user_id', userId)
      .maybeSingle()
    data = fallbackData
  }

  const access = deriveSubscriptionAccess({
    subscriptionStatus: data?.subscription_status ?? null,
    subscriptionPlan: data?.subscription_plan ?? null,
    revenuecatEntitlements: data?.revenuecat_entitlements ?? null,
    revenuecatSubscriptionId: data?.revenuecat_subscription_id ?? null,
  })

  return access
}
