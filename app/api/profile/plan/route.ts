import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/profile/plan
 * Saves the user's selected pricing plan
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { plan, promoCode } = body

    // Allow 'tester' plan if promo code is provided
    if (!plan || (plan !== 'monthly' && plan !== 'yearly' && plan !== 'tester')) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly", "yearly", or "tester"' },
        { status: 400 }
      )
    }

    // If tester plan, validate promo code
    if (plan === 'tester') {
      if (!promoCode) {
        return NextResponse.json(
          { error: 'Promo code required for tester plan' },
          { status: 400 }
        )
      }

      const normalizedCode = promoCode.trim().toUpperCase()

      // Check database for promo code
      const { data: promoCodeData, error: fetchError } = await supabaseServer
        .from('promo_codes')
        .select('*')
        .eq('code', normalizedCode)
        .eq('is_active', true)
        .single()

      if (fetchError || !promoCodeData) {
        return NextResponse.json(
          { error: 'Invalid promo code' },
          { status: 400 }
        )
      }

      // Check if code has expired
      if (promoCodeData.expires_at && new Date(promoCodeData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This promo code has expired' },
          { status: 400 }
        )
      }

      // Check if code has reached max uses
      if (promoCodeData.max_uses !== null && promoCodeData.current_uses >= promoCodeData.max_uses) {
        return NextResponse.json(
          { error: 'This promo code has already been used' },
          { status: 400 }
        )
      }

      // Check if user has already used this code
      const { data: existingUsage } = await supabaseServer
        .from('promo_code_usage')
        .select('id')
        .eq('promo_code_id', promoCodeData.id)
        .eq('user_id', userId)
        .single()

      if (existingUsage) {
        return NextResponse.json(
          { error: 'You have already used this promo code' },
          { status: 400 }
        )
      }

      // Record code usage
      const { error: usageError } = await supabaseServer
        .from('promo_code_usage')
        .insert({
          promo_code_id: promoCodeData.id,
          user_id: userId,
        })

      if (usageError) {
        console.error('[api/profile/plan] Error recording code usage:', usageError)
        // Don't fail the request if usage tracking fails, but log it
      } else {
        // Increment usage count
        await supabaseServer
          .from('promo_codes')
          .update({ current_uses: promoCodeData.current_uses + 1 })
          .eq('id', promoCodeData.id)
      }

      // Tester plan = lifetime free access
      // No expiration, no payment required
    }

    // Update the user's profile with the selected plan
    const { data, error } = await supabase
      .from('profiles')
      .update({ subscription_plan: plan })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[api/profile/plan] Error updating plan:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to save plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      plan: data?.subscription_plan 
    })
  } catch (error: any) {
    console.error('[api/profile/plan] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

