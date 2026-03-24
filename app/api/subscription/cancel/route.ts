import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

/**
 * POST /api/subscription/cancel
 * RevenueCat mobile-store cancellation flow.
 * Users cancel in App Store/Google Play; this endpoint marks local status as canceled.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) return buildUnauthorizedResponse()


    // RevenueCat only
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_platform, subscription_status')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[api/subscription/cancel] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (!profile.subscription_platform?.startsWith('revenuecat_')) {
      return NextResponse.json(
        { error: 'Only RevenueCat subscriptions are supported' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subscription_status: 'canceled' })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[api/subscription/cancel] Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      platform: profile.subscription_platform === 'revenuecat_ios' ? 'iOS' : 'Android',
      message: profile.subscription_platform === 'revenuecat_ios'
        ? 'To cancel your subscription, open iOS Settings → Apple ID → Subscriptions → ShiftCoach → Cancel Subscription. Access continues until your billing period ends.'
        : 'To cancel your subscription, open Google Play Store → Subscriptions → ShiftCoach → Cancel Subscription. Access continues until your billing period ends.',
    })
  } catch (error: any) {
    console.error('[api/subscription/cancel] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

