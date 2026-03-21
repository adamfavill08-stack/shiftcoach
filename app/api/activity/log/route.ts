import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export type ShiftActivityLevel = 'very_light' | 'light' | 'moderate' | 'busy' | 'intense'

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      console.error('[/api/activity/log] No user ID available')
      return NextResponse.json(
        { error: 'Authentication required', details: 'User ID not found' },
        { status: 401 }
      )
    }

    if (!supabase) {
      console.error('[/api/activity/log] No Supabase client available')
      return NextResponse.json(
        { error: 'Database connection error', details: 'Supabase client not available' },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { shift_activity_level, date } = body as {
      shift_activity_level?: ShiftActivityLevel
      date?: string
    }

    console.log('[/api/activity/log] Request received:', {
      userId,
      shift_activity_level,
      date,
      bodyKeys: Object.keys(body),
    })

    if (!shift_activity_level) {
      console.error('[/api/activity/log] Missing shift_activity_level in request')
      return NextResponse.json(
        { error: 'shift_activity_level is required' },
        { status: 400 }
      )
    }

    // Validate activity level
    const validLevels: ShiftActivityLevel[] = ['very_light', 'light', 'moderate', 'busy', 'intense']
    if (!validLevels.includes(shift_activity_level)) {
      return NextResponse.json(
        { error: `shift_activity_level must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      )
    }

    const targetDate = date || new Date().toISOString().slice(0, 10)
    const startOfDay = new Date(targetDate + 'T00:00:00Z')
    const endOfDay = new Date(targetDate + 'T23:59:59Z')

    // Check if activity log already exists for today
    let existingLog: any = null
    
    console.log('[/api/activity/log] Checking for existing log:', {
      userId,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
    })
    
    // Try with ts column first - only select columns that exist
    // Don't select active_minutes or source if they don't exist
    let existingQuery = await supabase
      .from('activity_logs')
      .select('id, steps, ts, shift_activity_level')
      .eq('user_id', userId)
      .gte('ts', startOfDay.toISOString())
      .lt('ts', endOfDay.toISOString())
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('[/api/activity/log] Existing query result:', {
      hasError: !!existingQuery.error,
      error: existingQuery.error?.message,
      errorCode: existingQuery.error?.code,
      hasData: !!existingQuery.data,
      data: existingQuery.data,
    })

    // If ts doesn't exist, try created_at
    if (existingQuery.error && (existingQuery.error.code === '42703' || existingQuery.error.message?.includes('ts'))) {
      existingQuery = await supabase
        .from('activity_logs')
        .select('id, steps, created_at, shift_activity_level')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    }

    // If shift_activity_level column doesn't exist, that's a problem
    if (existingQuery.error && (existingQuery.error.message?.includes('shift_activity_level') || existingQuery.error.code === 'PGRST204')) {
      console.error('[/api/activity/log] shift_activity_level column does not exist or PostgREST cache is stale:', existingQuery.error)
      
      // Provide a very clear error message with step-by-step instructions
      return NextResponse.json(
        { 
          error: 'Database schema not updated',
          message: 'The shift_activity_level column does not exist in your database or PostgREST cache needs refresh',
          steps: [
            '1. Go to Supabase Dashboard → SQL Editor',
            '2. Run the migration from: supabase/migrations/20250122_add_shift_activity_level.sql',
            '3. Wait 10-30 seconds for PostgREST to refresh its schema cache',
            '4. Or restart your Supabase project (Settings → Restart)',
            '5. Try saving the activity level again'
          ],
          migrationSQL: `
-- Copy and paste this in Supabase SQL Editor:
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'shift_activity_level'
  ) THEN
    ALTER TABLE public.activity_logs 
    ADD COLUMN shift_activity_level TEXT 
    CHECK (shift_activity_level IN ('very_light', 'light', 'moderate', 'busy', 'intense'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_level 
ON public.activity_logs(user_id, shift_activity_level) 
WHERE shift_activity_level IS NOT NULL;
          `.trim(),
          errorCode: existingQuery.error.code,
          errorMessage: existingQuery.error.message,
        },
        { status: 500 }
      )
    }

    if (!existingQuery.error && existingQuery.data) {
      existingLog = existingQuery.data
    } else if (existingQuery.error && !existingQuery.error.message?.includes('shift_activity_level')) {
      // Log other errors but continue (might be no existing log, which is fine)
      console.warn('[/api/activity/log] Query warning (non-fatal):', existingQuery.error.message)
    }

    // Calculate estimated calories burned based on activity level
    const activityFactors: Record<ShiftActivityLevel, number> = {
      very_light: 1.0,
      light: 1.1,
      moderate: 1.2,
      busy: 1.35,
      intense: 1.5,
    }

    const activityFactor = activityFactors[shift_activity_level]
    
    // Get user's base calories to estimate additional burn
    const { data: profile } = await supabase
      .from('profiles')
      .select('weight_kg')
      .eq('user_id', userId)
      .maybeSingle()

    const weight = profile?.weight_kg ?? 75
    // Rough estimate: base BMR * (activityFactor - 1) * 0.1 for additional calories
    const estimatedAdditionalCalories = Math.round(weight * 22 * (activityFactor - 1) * 0.1)

    if (existingLog) {
      // Update existing log
      const updateData: any = { shift_activity_level }
      
      // Try to update with ts, fallback to created_at
      let updateQuery = await supabase
        .from('activity_logs')
        .update(updateData)
        .eq('id', existingLog.id)
        .select('shift_activity_level')
        .single()

      if (updateQuery.error) {
        console.error('[/api/activity/log] Update error:', updateQuery.error)
        
        // Check if it's a column missing error
        if (updateQuery.error.message?.includes('shift_activity_level') || updateQuery.error.code === '42703') {
          return NextResponse.json(
            { 
              error: 'Database schema not updated',
              details: 'The shift_activity_level column does not exist. Please run migration: 20250122_add_shift_activity_level.sql',
              code: updateQuery.error.code,
            },
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to update activity log',
            details: updateQuery.error.message,
            code: updateQuery.error.code,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        activity: {
          shift_activity_level: updateQuery.data.shift_activity_level,
          estimated_additional_calories: estimatedAdditionalCalories,
          activity_factor: activityFactor,
        },
      }, { status: 200 })
    } else {
      // Create new log
      // Try to insert with ts, fallback to created_at
      const insertData: any = {
        user_id: userId,
        steps: 0, // Default, can be updated by wearable sync
        shift_activity_level,
      }

      // Try to add ts if column exists
      let insertQuery = await supabase
        .from('activity_logs')
        .insert({
          ...insertData,
          ts: new Date().toISOString(),
        })
        .select('shift_activity_level')
        .single()

      // If ts column doesn't exist, use created_at (which should auto-populate)
      if (insertQuery.error && (insertQuery.error.code === '42703' || insertQuery.error.message?.includes('ts'))) {
        insertQuery = await supabase
          .from('activity_logs')
          .insert(insertData)
          .select('shift_activity_level')
          .single()
      }

      if (insertQuery.error) {
        console.error('[/api/activity/log] Insert error:', {
          code: insertQuery.error.code,
          message: insertQuery.error.message,
          details: insertQuery.error.details,
          hint: insertQuery.error.hint,
          fullError: JSON.stringify(insertQuery.error),
        })
        
        // Check if it's a column missing error (PGRST204 is the key error code)
        if (insertQuery.error.code === 'PGRST204' || insertQuery.error.message?.includes('shift_activity_level') || insertQuery.error.code === '42703') {
          const errorResponse = { 
            error: 'Database schema not updated',
            message: 'The shift_activity_level column does not exist in your database or PostgREST cache needs refresh',
            steps: [
              '1. Go to Supabase Dashboard → SQL Editor',
              '2. Run the migration from: supabase/migrations/20250122_add_shift_activity_level.sql',
              '3. Wait 10-30 seconds for PostgREST to refresh its schema cache',
              '4. Or restart your Supabase project (Settings → Restart)',
              '5. Try saving the activity level again'
            ],
            migrationSQL: `DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'shift_activity_level'
  ) THEN
    ALTER TABLE public.activity_logs 
    ADD COLUMN shift_activity_level TEXT 
    CHECK (shift_activity_level IN ('very_light', 'light', 'moderate', 'busy', 'intense'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_level 
ON public.activity_logs(user_id, shift_activity_level) 
WHERE shift_activity_level IS NOT NULL;`,
            errorCode: insertQuery.error.code,
            errorMessage: insertQuery.error.message,
          }
          
          console.log('[/api/activity/log] Returning error response:', JSON.stringify(errorResponse, null, 2))
          
          return NextResponse.json(errorResponse, { status: 500 })
        }
        
        const errorResponse = { 
          error: 'Failed to log activity',
          details: insertQuery.error.message || 'Unknown error',
          code: insertQuery.error.code || 'UNKNOWN',
          fullError: insertQuery.error,
        }
        
        console.log('[/api/activity/log] Returning generic error response:', JSON.stringify(errorResponse, null, 2))
        
        return NextResponse.json(errorResponse, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        activity: {
          shift_activity_level: insertQuery.data.shift_activity_level,
          estimated_additional_calories: estimatedAdditionalCalories,
          activity_factor: activityFactor,
        },
      }, { status: 200 })
    }
  } catch (err: any) {
    console.error('[/api/activity/log] FATAL ERROR:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      error: err,
      stringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    })
    
    const errorResponse = { 
      error: 'Internal server error', 
      details: err?.message || String(err) || 'Unknown error occurred',
      type: err?.name || 'UnknownError',
      timestamp: new Date().toISOString(),
    }
    
    console.log('[/api/activity/log] Returning fatal error response:', JSON.stringify(errorResponse, null, 2))
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

