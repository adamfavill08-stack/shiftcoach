import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiBadRequest, apiServerError } from '@/lib/api/response'

const PromoValidateSchema = z.object({
  code: z.string().trim().min(1).max(128),
})

/**
 * POST /api/promo/validate
 * Validates a promo code for tester access (single-use codes)
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, PromoValidateSchema)
    if (!parsed.ok) return parsed.response
    const { code } = parsed.data

    const normalizedCode = code.trim().toUpperCase()

    // Check database for promo code
    const { data: promoCode, error: fetchError } = await supabaseServer
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single()

    if (fetchError || !promoCode) {
      return apiBadRequest('invalid_promo_code', 'Invalid promo code')
    }

    // Check if code has expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return apiBadRequest('promo_code_expired', 'This promo code has expired')
    }

    // Check if code has reached max uses
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      return apiBadRequest('promo_code_exhausted', 'This promo code has already been used')
    }

    // Check if user has already used this code
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (userId) {
      const { data: existingUsage } = await supabaseServer
        .from('promo_code_usage')
        .select('id')
        .eq('promo_code_id', promoCode.id)
        .eq('user_id', userId)
        .single()

      if (existingUsage) {
        return apiBadRequest('promo_code_already_used', 'You have already used this promo code')
      }
    }

    return NextResponse.json({ 
      valid: true,
      code: normalizedCode,
      message: 'Promo code accepted'
    })
  } catch (error: any) {
    console.error('[api/promo/validate] Error:', error)
    return apiServerError('unexpected_error', error.message || 'Internal server error')
  }
}

