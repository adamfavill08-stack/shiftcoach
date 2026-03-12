import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/revenuecat/webhook
 * Handles RevenueCat webhook events
 * 
 * RevenueCat sends webhooks for subscription events:
 * - INITIAL_PURCHASE: User first purchases subscription
 * - RENEWAL: Subscription renews
 * - CANCELLATION: User cancels (but still has access until period end)
 * - BILLING_ISSUE: Payment failed
 * - SUBSCRIPTION_PAUSED: Subscription paused (if applicable)
 * - SUBSCRIPTION_RESUMED: Subscription resumed
 * 
 * Documentation: https://www.revenuecat.com/docs/webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (if configured)
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = req.headers.get('authorization')
      const body = await req.text()
      
      // RevenueCat webhook signature verification
      // Format: "Bearer {signature}"
      if (signature) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(body)
          .digest('hex')
        
        const receivedSignature = signature.replace('Bearer ', '')
        
        if (receivedSignature !== expectedSignature) {
          console.error('[api/revenuecat/webhook] Invalid webhook signature')
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          )
        }
      }
    }

    const event = await req.json()
    
    console.log('[api/revenuecat/webhook] Received event:', {
      type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id,
    })

    // Extract user ID from RevenueCat app_user_id (format: shiftcoach_{userId})
    const appUserId = event.app_user_id
    if (!appUserId || !appUserId.startsWith('shiftcoach_')) {
      console.warn('[api/revenuecat/webhook] Invalid app_user_id format:', appUserId)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const userId = appUserId.replace('shiftcoach_', '')

    // Get user's profile to update
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('user_id, subscription_plan, subscription_status')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[api/revenuecat/webhook] Profile not found:', profileError)
      return NextResponse.json({ received: true }, { status: 200 }) // Don't fail webhook
    }

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Subscription is active
        const productId = event.product_id || ''
        let plan: 'monthly' | 'yearly' | null = null
        if (productId.includes('monthly')) {
          plan = 'monthly'
        } else if (productId.includes('yearly')) {
          plan = 'yearly'
        }

        await supabaseServer
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_plan: plan || profile.subscription_plan,
            revenuecat_subscription_id: productId,
            revenuecat_entitlements: event.entitlements || {},
          })
          .eq('user_id', userId)

        console.log('[api/revenuecat/webhook] Subscription activated/renewed:', { userId, plan })
        break

      case 'CANCELLATION':
        // User canceled, but still has access until period end
        // Schedule account deletion for end of period
        const periodEnd = event.expiration_at_ms 
          ? new Date(event.expiration_at_ms)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: 30 days

        await supabaseServer
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            scheduled_deletion_at: periodEnd.toISOString(),
          })
          .eq('user_id', userId)

        console.log('[api/revenuecat/webhook] Subscription canceled, deletion scheduled:', { userId, periodEnd })
        break

      case 'BILLING_ISSUE':
        // Payment failed
        await supabaseServer
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('user_id', userId)

        console.log('[api/revenuecat/webhook] Billing issue detected:', { userId })
        break

      case 'SUBSCRIPTION_PAUSED':
        await supabaseServer
          .from('profiles')
          .update({
            subscription_status: 'canceled', // Treat paused as canceled for now
          })
          .eq('user_id', userId)
        break

      case 'SUBSCRIPTION_RESUMED':
        await supabaseServer
          .from('profiles')
          .update({
            subscription_status: 'active',
          })
          .eq('user_id', userId)
        break

      default:
        console.log('[api/revenuecat/webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error('[api/revenuecat/webhook] Unexpected error:', error)
    // Always return 200 to RevenueCat to prevent retries for our errors
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
