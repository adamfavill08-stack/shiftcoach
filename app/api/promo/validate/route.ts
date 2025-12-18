import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/promo/validate
 * Validates a promo code for tester access (single-use codes)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      )
    }

    const normalizedCode = code.trim().toUpperCase()

    // Check database for promo code
    const { data: promoCode, error: fetchError } = await supabaseServer
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single()

    if (fetchError || !promoCode) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 }
      )
    }

    // Check if code has reached max uses
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      return NextResponse.json(
        { error: 'This promo code has already been used' },
        { status: 400 }
      )
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
        return NextResponse.json(
          { error: 'You have already used this promo code' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ 
      valid: true,
      code: normalizedCode,
      message: 'Promo code accepted'
    })
  } catch (error: any) {
    console.error('[api/promo/validate] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

