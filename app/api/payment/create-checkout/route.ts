import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * POST /api/payment/create-checkout
 * Creates a Stripe Checkout session for subscription payment
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { plan, trialDays = 7 } = body

    if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // Get user email for Stripe using service role admin API
    let userEmail: string | null = null
    
    try {
      const { supabaseServer } = await import('@/lib/supabase-server')
      // Use admin API to get user by ID (similar to delete route)
      const { data: adminUser, error: adminError } = await supabaseServer.auth.admin.getUserById(userId)
      if (!adminError && adminUser?.user?.email) {
        userEmail = adminUser.user.email
      } else if (adminError) {
        console.warn('[api/payment/create-checkout] Admin API error:', adminError)
      }
    } catch (err: any) {
      console.warn('[api/payment/create-checkout] Admin API failed:', err?.message)
    }

    // Fallback: try regular auth.getUser() with the session client
    if (!userEmail) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.warn('[api/payment/create-checkout] auth.getUser() error:', authError)
        } else if (user?.email) {
          userEmail = user.email
        }
      } catch (err) {
        console.warn('[api/payment/create-checkout] Could not get email from auth.getUser():', err)
      }
    }

    if (!userEmail) {
      console.error('[api/payment/create-checkout] Failed to get user email for userId:', userId)
      return NextResponse.json(
        { error: 'User email not found. Please ensure you are signed in and try again.' },
        { status: 400 }
      )
    }

    // Load profile to determine preferred region / currency (optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('region, currency')
      .eq('user_id', userId)
      .maybeSingle()

    // Map regions to default currencies
    const regionCurrencyMap: Record<string, 'GBP' | 'EUR' | 'USD' | 'AUD'> = {
      uk: 'GBP',
      eu: 'EUR',
      us: 'USD',
      aus: 'AUD',
    }

    let currency = (profile?.currency as 'GBP' | 'EUR' | 'USD' | 'AUD' | null) || null
    if (!currency && profile?.region && profile.region in regionCurrencyMap) {
      currency = regionCurrencyMap[profile.region]
    }
    // Default to GBP if nothing set
    if (!currency) currency = 'GBP'

    // Use price IDs if available, otherwise use price_data.
    // Supports currency-specific price IDs like STRIPE_PRICE_ID_MONTHLY_GBP / _USD / _EUR / _AUD.
    const baseMonthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY
    const baseYearlyPriceId = process.env.STRIPE_PRICE_ID_YEARLY

    const currencyKeySuffix = currency.toUpperCase()
    const envVars = process.env as Record<string, string | undefined>
    const regionalMonthlyPriceId = envVars[`STRIPE_PRICE_ID_MONTHLY_${currencyKeySuffix}`]
    const regionalYearlyPriceId = envVars[`STRIPE_PRICE_ID_YEARLY_${currencyKeySuffix}`]

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    let priceId: string | undefined
    if (plan === 'monthly') {
      priceId = regionalMonthlyPriceId || baseMonthlyPriceId
    } else {
      priceId = regionalYearlyPriceId || baseYearlyPriceId
    }

    // Validate price ID exists, otherwise fall back to price_data
    let usePriceId = false
    if (priceId) {
      try {
        // Try to retrieve the price to validate it exists
        await stripe.prices.retrieve(priceId)
        usePriceId = true
      } catch (err: any) {
        console.warn(`[api/payment/create-checkout] Price ID ${priceId} not found, using price_data fallback:`, err.message)
        usePriceId = false
      }
    }

    if (usePriceId && priceId) {
      lineItems.push({
        price: priceId,
        quantity: 1,
      })
    } else {
      // Fallback: create price on the fly in the chosen currency
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `ShiftCoach ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
            description:
              plan === 'monthly'
                ? 'Monthly subscription to ShiftCoach'
                : 'Yearly subscription to ShiftCoach',
          },
          // Default amounts – interpreted in the chosen currency (e.g. 3.99 USD / EUR / GBP / AUD)
          unit_amount: plan === 'monthly' ? 399 : 4300,
          recurring: {
            interval: plan === 'monthly' ? 'month' : 'year',
          },
        },
        quantity: 1,
      })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          user_id: userId,
          plan: plan,
        },
      },
      success_url: `${req.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/select-plan?canceled=true`,
      metadata: {
        user_id: userId,
        plan: plan,
      },
    })

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id
    })
  } catch (error: any) {
    console.error('[api/payment/create-checkout] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

