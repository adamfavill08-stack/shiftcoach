import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { deriveSubscriptionAccess, getPlanFromProductId } from '@/lib/subscription/access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/revenuecat/status
 * Gets current subscription status from RevenueCat
 * 
 * This queries RevenueCat REST API to get the latest subscription status
 * Useful for checking subscription on app load
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) return buildUnauthorizedResponse()

    // Get user's RevenueCat user ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('revenuecat_user_id, subscription_platform, subscription_status, subscription_plan, trial_ends_at, revenuecat_entitlements, revenuecat_subscription_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({
        isActive: false,
        plan: 'free',
        platform: null,
      })
    }

    // If user doesn't have RevenueCat subscription, return current status from profile
    if (!profile.revenuecat_user_id || !profile.subscription_platform?.startsWith('revenuecat_')) {
      const access = deriveSubscriptionAccess({
        subscriptionStatus: profile?.subscription_status,
        subscriptionPlan: profile?.subscription_plan,
        trialEndsAt: profile?.trial_ends_at,
        revenuecatEntitlements: profile?.revenuecat_entitlements,
        revenuecatSubscriptionId: profile?.revenuecat_subscription_id,
      })
      return NextResponse.json({
        isActive: access.isPro,
        plan: access.plan,
        platform: profile?.subscription_platform || null,
      })
    }

    const revenuecatApiKey = process.env.REVENUECAT_API_KEY
    if (!revenuecatApiKey) {
      // RevenueCat API is not configured, but we still return profile-derived access.
      const access = deriveSubscriptionAccess({
        subscriptionStatus: profile?.subscription_status,
        subscriptionPlan: profile?.subscription_plan,
        trialEndsAt: profile?.trial_ends_at,
        revenuecatEntitlements: profile?.revenuecat_entitlements,
        revenuecatSubscriptionId: profile?.revenuecat_subscription_id,
      })
      return NextResponse.json({
        isActive: access.isPro,
        plan: access.plan,
        platform: profile?.subscription_platform || null,
      })
    }

    // Query RevenueCat REST API for current subscriber info
    // Documentation: https://www.revenuecat.com/reference/get-subscriber
    const revenuecatResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(profile.revenuecat_user_id)}`,
      {
        headers: {
          'Authorization': `Bearer ${revenuecatApiKey}`,
        },
      }
    )

    if (!revenuecatResponse.ok) {
      console.error('[api/revenuecat/status] RevenueCat API error:', revenuecatResponse.status)
      // Fall back to profile data if RevenueCat query fails
      const access = deriveSubscriptionAccess({
        subscriptionStatus: profile.subscription_status,
        subscriptionPlan: profile.subscription_plan,
        trialEndsAt: profile?.trial_ends_at,
        revenuecatEntitlements: profile.revenuecat_entitlements,
        revenuecatSubscriptionId: profile.revenuecat_subscription_id,
      })
      return NextResponse.json({
        isActive: access.isPro,
        plan: access.plan,
        platform: profile.subscription_platform,
      })
    }

    const revenuecatData = await revenuecatResponse.json()
    const subscriber = revenuecatData.subscriber
    
    // Check if subscription is active + normalize plan for app use.
    const activeEntitlements = subscriber?.entitlements?.active ?? {}
    const activeEntitlement = Object.values(activeEntitlements)[0] as any
    const productId = activeEntitlement?.product_identifier ?? profile.revenuecat_subscription_id ?? null
    const nextPlan = getPlanFromProductId(productId)
    const rcEntitlementActive = Object.keys(activeEntitlements).length > 0

    // Update profile if status changed
    if (rcEntitlementActive && (profile.subscription_status !== 'active' || (nextPlan && profile.subscription_plan !== nextPlan))) {
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: nextPlan ?? profile.subscription_plan,
          revenuecat_subscription_id: productId ?? profile.revenuecat_subscription_id,
          revenuecat_entitlements: subscriber.entitlements,
        })
        .eq('user_id', userId)
    }

    // Merge RevenueCat entitlements with profile (e.g. trialing + trial_ends_at on profile when stores sync it).
    const access = deriveSubscriptionAccess({
      subscriptionStatus: profile.subscription_status,
      subscriptionPlan: profile.subscription_plan,
      trialEndsAt: profile.trial_ends_at,
      revenuecatEntitlements: subscriber?.entitlements ?? profile.revenuecat_entitlements,
      revenuecatSubscriptionId: productId ?? profile.revenuecat_subscription_id,
    })

    return NextResponse.json({
      isActive: access.isPro,
      plan: access.plan,
      platform: profile.subscription_platform,
      productId,
      expiresAt: activeEntitlement?.expires_date,
      entitlements: subscriber?.entitlements,
    })
  } catch (error: any) {
    console.error('[api/revenuecat/status] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
