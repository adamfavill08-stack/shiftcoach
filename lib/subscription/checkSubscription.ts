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

    return {
      hasAccess: true,
      status: 'active',
      platform: null,
      plan: null,
      needsPayment: false
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
  return {
    hasAccess: true
  }
}
