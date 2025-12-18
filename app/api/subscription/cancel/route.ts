import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import Stripe from 'stripe'

let stripe: Stripe | null = null

function getStripeClient(): Stripe | null {
  if (!stripe) {
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) {
      console.warn(
        '[api/subscription/cancel] STRIPE_SECRET_KEY is not set. Subscription cancel is disabled in this environment.',
      )
      return null
    }
    stripe = new Stripe(secret)
  }
  return stripe
}

/**
 * POST /api/subscription/cancel
 * Cancels the user's Stripe subscription and schedules account deletion
 * at the end of their current paid period
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            'Subscription cancellation is temporarily unavailable. Please contact support or try again later.',
        },
        { status: 503 },
      )
    }

    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile with Stripe subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id, subscription_plan')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[api/subscription/cancel] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user has an active subscription
    if (!profile.stripe_subscription_id) {
      // If no Stripe subscription, check if it's a tester account
      if (profile.subscription_plan === 'tester') {
        // For tester accounts, schedule immediate deletion (or within 24 hours)
        const deletionDate = new Date()
        deletionDate.setHours(deletionDate.getHours() + 24) // Give 24 hours notice
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            scheduled_deletion_at: deletionDate.toISOString(),
            subscription_status: 'canceled'
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('[api/subscription/cancel] Error scheduling deletion:', updateError)
          return NextResponse.json(
            { error: 'Failed to schedule account deletion' },
            { status: 500 }
          )
        }

        return NextResponse.json({ 
          success: true,
          message: 'Subscription canceled. Account will be deleted in 24 hours.',
          scheduled_deletion_at: deletionDate.toISOString()
        })
      }
      
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Cancel the Stripe subscription (but keep it active until period end)
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      
      // Cancel the subscription at period end (don't cancel immediately)
      const canceledSubscription = (await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          // This cancels future renewals but keeps access until period end
          cancel_at_period_end: true,
        },
      )) as unknown as Stripe.Subscription

      // Get the period end date (when subscription will actually end)
      const periodEndUnix = (canceledSubscription as any).current_period_end as number | undefined
      const periodEndDate = periodEndUnix ? new Date(periodEndUnix * 1000) : new Date()
      
      // Schedule account deletion for just before the period ends (1 hour before to be safe)
      const deletionDate = new Date(periodEndDate)
      deletionDate.setHours(deletionDate.getHours() - 1)

      // Update profile with scheduled deletion date
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          scheduled_deletion_at: deletionDate.toISOString(),
          subscription_status: 'canceled'
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('[api/subscription/cancel] Error updating profile:', updateError)
        return NextResponse.json(
          { error: 'Failed to schedule account deletion' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true,
        message: 'Subscription canceled. Your account will remain active until the end of your paid period.',
        period_end: periodEndDate.toISOString(),
        scheduled_deletion_at: deletionDate.toISOString()
      })
    } catch (stripeError: any) {
      console.error('[api/subscription/cancel] Stripe error:', stripeError)
      return NextResponse.json(
        { error: stripeError.message || 'Failed to cancel subscription' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[api/subscription/cancel] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

