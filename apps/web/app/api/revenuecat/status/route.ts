import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

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
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const revenuecatApiKey = process.env.REVENUECAT_API_KEY
    if (!revenuecatApiKey) {
      return NextResponse.json(
        { error: 'RevenueCat not configured' },
        { status: 503 }
      )
    }

    // Get user's RevenueCat user ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('revenuecat_user_id, subscription_platform, subscription_status')
      .eq('user_id', userId)
      .single()

    // If user doesn't have RevenueCat subscription, return current status from profile
    if (!profile?.revenuecat_user_id || !profile?.subscription_platform?.startsWith('revenuecat_')) {
      return NextResponse.json({
        isActive: false,
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
      return NextResponse.json({
        isActive: profile.subscription_status === 'active',
        platform: profile.subscription_platform,
      })
    }

    const revenuecatData = await revenuecatResponse.json()
    const subscriber = revenuecatData.subscriber
    
    // Check if subscription is active
    const isActive = subscriber?.entitlements?.active?.length > 0
    
    // Get active entitlement info
    const activeEntitlement = subscriber?.entitlements?.active 
      ? Object.values(subscriber.entitlements.active)[0] as any
      : null

    // Update profile if status changed
    if (isActive && profile.subscription_status !== 'active') {
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          revenuecat_entitlements: subscriber.entitlements,
        })
        .eq('user_id', userId)
    }

    return NextResponse.json({
      isActive,
      platform: profile.subscription_platform,
      productId: activeEntitlement?.product_identifier,
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
