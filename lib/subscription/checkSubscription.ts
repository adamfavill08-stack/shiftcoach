/**
 * Subscription Status Checker
 * Checks if user has active subscription access
 */

import { supabase } from '@/lib/supabase'

export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'canceled' | 'past_due' | 'none'

export interface SubscriptionCheckResult {
  hasAccess: boolean
  status: SubscriptionStatus
  platform: 'stripe' | 'revenuecat_ios' | 'revenuecat_android' | null
  plan: 'monthly' | 'yearly' | 'tester' | null
  needsPayment: boolean
  message?: string
}

/**
 * Check if user has active subscription access
 * 
 * Returns:
 * - hasAccess: true if user can access the app
 * - status: Current subscription status
 * - platform: Payment platform (stripe/revenuecat_ios/revenuecat_android)
 * - plan: Subscription plan (monthly/yearly/tester)
 * - needsPayment: true if user needs to subscribe
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionCheckResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        hasAccess: false,
        status: 'none',
        platform: null,
        plan: null,
        needsPayment: true,
        message: 'Please sign in to continue'
      }
    }

    // Get user's profile with subscription info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status, subscription_platform, trial_ends_at, revenuecat_entitlements')
      .eq('user_id', user.id)
      .single()

    if (error || !profile) {
      console.error('[checkSubscription] Error fetching profile:', error)
      return {
        hasAccess: false,
        status: 'none',
        platform: null,
        plan: null,
        needsPayment: true,
        message: 'Unable to verify subscription'
      }
    }

    // Tester accounts always have access
    if (profile.subscription_plan === 'tester') {
      return {
        hasAccess: true,
        status: 'active',
        platform: null,
        plan: 'tester',
        needsPayment: false
      }
    }

    // No subscription plan selected
    if (!profile.subscription_plan) {
      return {
        hasAccess: false,
        status: 'none',
        platform: null,
        plan: null,
        needsPayment: true,
        message: 'Please select a subscription plan'
      }
    }

    const status = profile.subscription_status as SubscriptionStatus || 'none'
    const platform = profile.subscription_platform as 'stripe' | 'revenuecat_ios' | 'revenuecat_android' | null

    // Check if subscription is active or trialing
    if (status === 'active' || status === 'trialing') {
      // For trialing, check if trial period has ended
      if (status === 'trialing' && profile.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at)
        const now = new Date()
        
        if (now > trialEnd) {
          // Trial ended but subscription might still be active (grace period)
          // Check if subscription is actually active
          if (platform?.startsWith('revenuecat_')) {
            // For RevenueCat, check entitlements
            const entitlements = profile.revenuecat_entitlements as any
            const isActive = entitlements?.active && Object.keys(entitlements.active).length > 0
            
            if (!isActive) {
              return {
                hasAccess: false,
                status: 'expired',
                platform,
                plan: profile.subscription_plan as 'monthly' | 'yearly',
                needsPayment: true,
                message: 'Your free trial has ended. Please subscribe to continue.'
              }
            }
          }
        }
      }

      return {
        hasAccess: true,
        status,
        platform,
        plan: profile.subscription_plan as 'monthly' | 'yearly',
        needsPayment: false
      }
    }

    // Subscription is canceled, expired, or past_due
    return {
      hasAccess: false,
      status,
      platform,
      plan: profile.subscription_plan as 'monthly' | 'yearly',
      needsPayment: true,
      message: status === 'canceled' 
        ? 'Your subscription has been canceled. Please resubscribe to continue.'
        : status === 'past_due'
        ? 'Your payment failed. Please update your payment method.'
        : 'Your subscription has expired. Please resubscribe to continue.'
    }
  } catch (error: any) {
    console.error('[checkSubscription] Unexpected error:', error)
    return {
      hasAccess: false,
      status: 'none',
      platform: null,
      plan: null,
      needsPayment: true,
      message: 'Unable to verify subscription status'
    }
  }
}

/**
 * Check subscription status and redirect if needed
 * Use this in pages that require subscription
 */
export async function requireSubscription(): Promise<{
  hasAccess: boolean
  redirectTo?: string
  message?: string
}> {
  const check = await checkSubscriptionStatus()
  
  if (!check.hasAccess) {
    return {
      hasAccess: false,
      redirectTo: '/select-plan',
      message: check.message || 'Please subscribe to continue'
    }
  }

  return {
    hasAccess: true
  }
}
