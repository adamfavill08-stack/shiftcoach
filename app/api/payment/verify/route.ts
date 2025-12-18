import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import Stripe from 'stripe'

let stripe: Stripe | null = null

function getStripeClient(): Stripe | null {
  if (!stripe) {
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) {
      console.warn(
        '[api/payment/verify] STRIPE_SECRET_KEY is not set. Payment verification is disabled in this environment.',
      )
      return null
    }
    stripe = new Stripe(secret)
  }
  return stripe
}

/**
 * POST /api/payment/verify
 * Verifies Stripe payment and updates user's subscription plan
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            'Payment verification is temporarily unavailable. Please contact support or try again later.',
        },
        { status: 503 },
      )
    }

    console.log('[api/payment/verify] Starting verification...')
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      console.error('[api/payment/verify] No userId found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[api/payment/verify] UserId:', userId)

    const body = await req.json()
    const { sessionId } = body

    if (!sessionId) {
      console.error('[api/payment/verify] No sessionId provided')
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    console.log('[api/payment/verify] Retrieving Stripe session:', sessionId)
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
    console.log('[api/payment/verify] Session retrieved:', {
      status: session.status,
      payment_status: session.payment_status,
      has_subscription: !!session.subscription,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 400 }
      )
    }

    // For trial periods, payment_status might be 'unpaid' initially, which is valid
    // Check if session is complete and has a subscription
    if (session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Checkout session not completed' },
        { status: 400 }
      )
    }

    // If there's a subscription, it's valid (even if payment_status is 'unpaid' during trial)
    const hasSubscription = session.subscription !== null
    const isPaid = session.payment_status === 'paid'
    const isUnpaidWithTrial = session.payment_status === 'unpaid' && hasSubscription

    if (!isPaid && !isUnpaidWithTrial) {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Get plan from metadata. Prefer the checkout session metadata, then fall back
    // to the attached subscription's metadata (if it exists).
    const subscriptionObj =
      typeof session.subscription === 'object' && session.subscription
        ? (session.subscription as Stripe.Subscription)
        : null

    const plan =
      (session.metadata?.plan as string | undefined) ??
      (subscriptionObj?.metadata?.plan as string | undefined)
    console.log('[api/payment/verify] Plan from metadata:', plan)

    if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
      console.error('[api/payment/verify] Invalid plan:', plan)
      return NextResponse.json(
        { error: 'Invalid plan in session' },
        { status: 400 }
      )
    }

    // Get subscription ID if available
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription?.id

    // Get customer ID
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id

    // Update user's profile with subscription info
    console.log('[api/payment/verify] Updating profile with:', {
      subscription_plan: plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    
    // Try to update with all fields first
    let updateData: any = {
      subscription_plan: plan,
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscriptionId || null,
      subscription_status: 'active',
    }
    
    let { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
    
    // If update fails due to missing columns, try with just subscription_plan
    if (updateError && (updateError.message?.includes('stripe_customer_id') || updateError.message?.includes('schema cache'))) {
      console.warn('[api/payment/verify] Stripe columns not found, updating with subscription_plan only')
      updateData = {
        subscription_plan: plan,
      }
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
      
      if (fallbackError) {
        updateError = fallbackError
      } else {
        updateError = null
        console.warn('[api/payment/verify] Updated subscription_plan only. Please run migration to add Stripe columns.')
      }
    }

    if (updateError) {
      console.error('[api/payment/verify] Error updating profile:', updateError)
      const errorMessage = updateError?.message || updateError?.toString() || 'Unknown error'
      return NextResponse.json(
        { error: 'Failed to update subscription: ' + errorMessage },
        { status: 500 }
      )
    }

    console.log('[api/payment/verify] Profile updated successfully')
    return NextResponse.json({ 
      success: true,
      plan: plan,
      subscriptionId: subscriptionId,
    })
  } catch (error: any) {
    console.error('[api/payment/verify] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

