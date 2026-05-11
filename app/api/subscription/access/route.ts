import { NextResponse } from 'next/server'
import { buildUnauthorizedResponse, getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { deriveSubscriptionAccess } from '@/lib/subscription/access'

export const dynamic = 'force-dynamic'
const DEV_OVERRIDE_USER_IDS = new Set(['333dd216-62fb-49a0-916e-304b84673310'])
const DEV_OVERRIDE_EMAILS = new Set(['adam.favill@outlook.com'])

export async function GET() {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { data: authData } = await supabase.auth.getUser()
    const userEmail = authData?.user?.email?.toLowerCase() ?? null
    if (DEV_OVERRIDE_USER_IDS.has(userId) || (userEmail && DEV_OVERRIDE_EMAILS.has(userEmail))) {
      return NextResponse.json({
        isPro: true,
        plan: 'tester',
        isActive: true,
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'subscription_status, subscription_plan, trial_ends_at, created_at, revenuecat_entitlements, revenuecat_subscription_id',
      )
      .eq('user_id', userId)
      .maybeSingle()
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'Failed to read profile for subscription access' },
        { status: 500 },
      )
    }

    const access = deriveSubscriptionAccess({
      subscriptionStatus: profile?.subscription_status ?? null,
      subscriptionPlan: profile?.subscription_plan ?? null,
      trialEndsAt: profile?.trial_ends_at ?? null,
      profileCreatedAt: profile?.created_at ?? null,
      authUserCreatedAt: authData?.user?.created_at ?? null,
      revenuecatEntitlements: profile?.revenuecat_entitlements ?? null,
      revenuecatSubscriptionId: profile?.revenuecat_subscription_id ?? null,
    })

    return NextResponse.json({
      isPro: access.isPro,
      plan: access.plan,
      isActive: access.isPro,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to read subscription access' },
      { status: 500 },
    )
  }
}
