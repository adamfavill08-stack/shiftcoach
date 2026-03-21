import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { isoLocalDate } from '@/lib/shifts'

export const dynamic = 'force-dynamic'

/**
 * POST /api/daily-metrics/compute
 * 
 * Pre-computes daily metrics for all users at midnight.
 * This should be called by a cron job (Vercel Cron, Supabase Cron, etc.)
 * 
 * Computes:
 * - Adjusted calories
 * - Macros
 * - Meal timing recommendations
 * - Shift rhythm scores (if not already computed)
 * 
 * Usage with Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/daily-metrics/compute",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 * 
 * Or call manually with secret:
 * curl -X POST https://your-domain.com/api/daily-metrics/compute \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
 */
export async function POST(req: NextRequest) {
  try {
    // Check for authorization
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.CRON_SECRET_KEY
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client to access all users
    const supabase = supabaseServer
    
    // Get today's date
    const today = isoLocalDate(new Date())
    
    // Get all active user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
    
    if (profilesError) {
      console.error('[daily-metrics/compute] Failed to fetch profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError.message },
        { status: 500 }
      )
    }
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No users found',
        processed: 0 
      })
    }
    
    console.log(`[daily-metrics/compute] Processing ${profiles.length} users for ${today}`)
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    // Process each user
    for (const profile of profiles) {
      const userId = profile.user_id as string
      
      try {
        // Calculate adjusted calories (includes macros and meal timing)
        const calorieResult = await calculateAdjustedCalories(supabase, userId)
        
        // Check if daily_metrics table exists and upsert
        const { error: upsertError } = await supabase
          .from('daily_metrics')
          .upsert(
            {
              user_id: userId,
              date: today,
              adjusted_kcal: calorieResult.adjustedCalories,
              base_kcal: calorieResult.baseCalories,
              rhythm_score: calorieResult.rhythmScore,
              sleep_hours_last24h: calorieResult.sleepHoursLast24h,
              shift_type: calorieResult.shiftType,
              rhythm_factor: calorieResult.rhythmFactor,
              sleep_factor: calorieResult.sleepFactor,
              shift_factor: calorieResult.shiftFactor,
              activity_factor: calorieResult.activityFactor,
              shift_activity_factor: calorieResult.shiftActivityFactor,
              activity_level: calorieResult.activityLevel,
              protein_g: calorieResult.macros.protein_g,
              carbs_g: calorieResult.macros.carbs_g,
              fat_g: calorieResult.macros.fat_g,
              sat_fat_g: calorieResult.macros.sat_fat_g,
              computed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
          )
        
        if (upsertError) {
          // Check if table doesn't exist (graceful degradation)
          if (upsertError.message?.includes('relation') || 
              upsertError.message?.includes('does not exist')) {
            console.warn(`[daily-metrics/compute] daily_metrics table doesn't exist for user ${userId}, skipping storage`)
            // Still count as success since calculation worked
            successCount++
            continue
          }
          
          console.error(`[daily-metrics/compute] Failed to store metrics for user ${userId}:`, upsertError)
          errorCount++
          errors.push(`User ${userId}: ${upsertError.message}`)
          continue
        }
        
        successCount++
        console.log(`[daily-metrics/compute] ✓ Computed metrics for user ${userId}`)
      } catch (err: any) {
        console.error(`[daily-metrics/compute] Error processing user ${userId}:`, err)
        errorCount++
        errors.push(`User ${userId}: ${err?.message || String(err)}`)
      }
    }
    
    return NextResponse.json({
      ok: true,
      date: today,
      processed: profiles.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error details
    })
  } catch (err: any) {
    console.error('[daily-metrics/compute] Fatal error:', err)
    return NextResponse.json(
      { 
        error: err?.message || 'Internal error',
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      },
      { status: 500 }
    )
  }
}

