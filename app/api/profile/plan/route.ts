import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiBadRequest, apiServerError } from '@/lib/api/response'

const PlanSchema = z.object({
  plan: z.enum(['monthly', 'yearly', 'tester']),
  promoCode: z.string().trim().optional(),
})

/**
 * POST /api/profile/plan
 * Saves the user's selected pricing plan
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) return buildUnauthorizedResponse()


    const parsed = await parseJsonBody(req, PlanSchema)
    if (!parsed.ok) return parsed.response
    const { plan, promoCode } = parsed.data

    // If tester plan, validate promo code
    if (plan === 'tester') {
      if (!promoCode) {
        return apiBadRequest('promo_code_required', 'Promo code required for tester plan')
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
        return apiBadRequest('invalid_promo_code', 'Invalid promo code')
      }

      // Check if code has expired
      if (promoCodeData.expires_at && new Date(promoCodeData.expires_at) < new Date()) {
        return apiBadRequest('promo_code_expired', 'This promo code has expired')
      }

      // Check if code has reached max uses
      if (promoCodeData.max_uses !== null && promoCodeData.current_uses >= promoCodeData.max_uses) {
        return apiBadRequest('promo_code_exhausted', 'This promo code has already been used')
      }

      // Check if user has already used this code
      const { data: existingUsage } = await supabaseServer
        .from('promo_code_usage')
        .select('id')
        .eq('promo_code_id', promoCodeData.id)
        .eq('user_id', userId)
        .single()

      if (existingUsage) {
        return apiBadRequest('promo_code_already_used', 'You have already used this promo code')
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
      return apiServerError('update_plan_failed', error.message || 'Failed to save plan')
    }

    return NextResponse.json({ 
      success: true,
      plan: data?.subscription_plan 
    })
  } catch (error: any) {
    console.error('[api/profile/plan] Unexpected error:', error)
    return apiServerError('unexpected_error', error.message || 'Internal server error')
  }
}

