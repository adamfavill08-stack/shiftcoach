import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/revenuecat/cancel
 * Cancels a RevenueCat subscription
 * 
 * Note: RevenueCat doesn't provide a direct API to cancel subscriptions
 * Users must cancel through the App Store/Play Store
 * This endpoint updates our database to reflect the cancellation
 * 
 * For actual cancellation, users should:
 * - iOS: Settings → Apple ID → Subscriptions
 * - Android: Google Play → Subscriptions
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('revenuecat_user_id, revenuecat_subscription_id, subscription_platform, subscription_status')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user has RevenueCat subscription
    if (!profile.revenuecat_user_id || !profile.subscription_platform?.startsWith('revenuecat_')) {
      return NextResponse.json(
        { error: 'No RevenueCat subscription found' },
        { status: 400 }
      )
    }

    // Note: RevenueCat doesn't provide an API to cancel subscriptions
    // Users must cancel through App Store/Play Store
    // We can only mark it as canceled in our database
    // The webhook will handle the actual cancellation event from RevenueCat

    // Mark as canceled (webhook will handle actual cancellation)
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
      })
      .eq('user_id', userId)

    const platform = profile.subscription_platform === 'revenuecat_ios' ? 'iOS' : 'Android'
    
    return NextResponse.json({
      success: true,
      message: `To cancel your subscription, please go to ${platform} Settings → Subscriptions and cancel there. Your access will continue until the end of your current billing period.`,
      platform,
    })
  } catch (error: any) {
    console.error('[api/revenuecat/cancel] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
