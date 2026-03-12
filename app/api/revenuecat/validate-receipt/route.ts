import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/revenuecat/validate-receipt
 * Validates a native purchase receipt with RevenueCat
 * 
 * This endpoint receives a receipt/transaction ID from the frontend
 * (after a native purchase completes) and validates it with RevenueCat REST API
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { receipt, platform, productId } = body

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt is required' },
        { status: 400 }
      )
    }

    if (!platform || (platform !== 'ios' && platform !== 'android')) {
      return NextResponse.json(
        { error: 'Platform must be "ios" or "android"' },
        { status: 400 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const revenuecatApiKey = process.env.REVENUECAT_API_KEY
    if (!revenuecatApiKey) {
      console.error('[api/revenuecat/validate-receipt] REVENUECAT_API_KEY not set')
      return NextResponse.json(
        { error: 'RevenueCat configuration error' },
        { status: 500 }
      )
    }

    // Create RevenueCat app user ID (format: shiftcoach_{userId})
    const revenuecatUserId = `shiftcoach_${userId}`

    // Call RevenueCat REST API to validate receipt
    // Documentation: https://www.revenuecat.com/reference/receipts
    const revenuecatResponse = await fetch('https://api.revenuecat.com/v1/receipts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revenuecatApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_user_id: revenuecatUserId,
        fetch_token: receipt, // Receipt data from StoreKit/Play Billing
        platform: platform, // 'ios' or 'android'
      }),
    })

    if (!revenuecatResponse.ok) {
      const errorData = await revenuecatResponse.json().catch(() => ({ error: 'Unknown error' }))
      console.error('[api/revenuecat/validate-receipt] RevenueCat API error:', errorData)
      return NextResponse.json(
        { error: errorData.error || 'Failed to validate receipt with RevenueCat' },
        { status: revenuecatResponse.status }
      )
    }

    const revenuecatData = await revenuecatResponse.json()
    
    // RevenueCat returns subscription info in the response
    // Check if subscription is active
    const subscriber = revenuecatData.subscriber
    const isActive = subscriber?.entitlements?.active?.length > 0
    
    if (!isActive) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Get the active entitlement (subscription)
    const activeEntitlement = Object.values(subscriber.entitlements.active || {})[0] as any
    const subscriptionId = activeEntitlement?.product_identifier || productId
    
    // Determine plan from product ID
    let plan: 'monthly' | 'yearly' | null = null
    if (subscriptionId.includes('monthly')) {
      plan = 'monthly'
    } else if (subscriptionId.includes('yearly')) {
      plan = 'yearly'
    }

    if (!plan) {
      return NextResponse.json(
        { error: 'Could not determine subscription plan from product ID' },
        { status: 400 }
      )
    }

    // Update user's profile with RevenueCat subscription info
    const platformValue = platform === 'ios' ? 'revenuecat_ios' : 'revenuecat_android'
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        revenuecat_user_id: revenuecatUserId,
        revenuecat_subscription_id: subscriptionId,
        revenuecat_entitlements: subscriber.entitlements,
        subscription_platform: platformValue,
        subscription_plan: plan,
        subscription_status: 'active',
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[api/revenuecat/validate-receipt] Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription: {
        plan,
        platform: platformValue,
        isActive: true,
        subscriptionId,
      }
    })
  } catch (error: any) {
    console.error('[api/revenuecat/validate-receipt] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
