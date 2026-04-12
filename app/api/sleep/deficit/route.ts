import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { aggregateSleepMinutesForDeficitWindow } from '@/lib/sleep/aggregateSleepMinutesForDeficitWindow'
import { calculateSleepDeficit } from '@/lib/sleep/calculateSleepDeficit'

// Cache for 30 seconds - sleep deficit updates when sleep is logged
export const revalidate = 30

/**
 * GET /api/sleep/deficit
 * Returns sleep deficit calculation for the last 7 days
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) return buildUnauthorizedResponse()


    const requiredDailyHours = 7.5; // Default requirement

    const agg = await aggregateSleepMinutesForDeficitWindow(supabase, userId)
    if (!agg.ok) {
      console.error('[api/sleep/deficit] Query error:', agg.error)
      if (agg.isMissingRelation) {
        return NextResponse.json({
          requiredDaily: requiredDailyHours,
          weeklyDeficit: 0,
          daily: [],
          category: 'low',
        }, { status: 200 })
      }
      return NextResponse.json({ error: agg.error.message ?? 'Query failed' }, { status: 500 })
    }

    const sleepData = agg.sleepData

    // Calculate deficit
    const deficit = calculateSleepDeficit(sleepData, requiredDailyHours)

    console.log('[api/sleep/deficit] Calculated deficit:', {
      weeklyDeficit: deficit.weeklyDeficit,
      category: deficit.category,
      dailyCount: deficit.daily.length,
    })

    return NextResponse.json(deficit)
  } catch (err: any) {
    console.error('[api/sleep/deficit] FATAL ERROR:', {
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

