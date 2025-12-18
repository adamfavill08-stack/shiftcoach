import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateTonightTarget } from '@/lib/circadian/tonightTarget'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sleep/tonight-target
 * Returns recommended sleep target for tonight based on:
 * - Weekly sleep deficit
 * - Upcoming shift type
 * - Recent sleep patterns
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[api/sleep/tonight-target] Calculating target for user:', userId)

    const target = await calculateTonightTarget(supabase, userId)

    console.log('[api/sleep/tonight-target] Calculated target:', {
      targetHours: target.targetHours,
      explanationLength: target.explanation.length,
    })

    return NextResponse.json(target, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err: any) {
    console.error('[api/sleep/tonight-target] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    
    return NextResponse.json(
      { 
        error: err?.message || 'Unknown server error',
        details: err?.details,
      },
      { status: 500 }
    )
  }
}

