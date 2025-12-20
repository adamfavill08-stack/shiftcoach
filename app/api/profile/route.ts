import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile
 * Gets the current user's profile
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('[api/profile GET] Error fetching profile:', error)
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details 
      }, { status: 200 }) // Return 200 so client can handle it
    }

    return NextResponse.json({ 
      profile: data,
      success: true 
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/profile GET] Unexpected error:', err)
    return NextResponse.json(
      { 
        error: err?.message || 'Failed to fetch profile',
        details: err?.toString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile
 * Creates or updates a user profile
 */
export async function POST(req: NextRequest) {
  try {
    let supabase: any
    let userId: string | null = null
    let isDevFallback = false
    
    try {
      const result = await getServerSupabaseAndUserId()
      supabase = result.supabase
      userId = result.userId
      isDevFallback = result.isDevFallback
    } catch (authError: any) {
      console.error('[api/profile] Failed to get Supabase client:', authError)
      return NextResponse.json(
        { 
          error: 'Authentication error',
          details: authError?.message || 'Failed to initialize database connection'
        },
        { status: 500 }
      )
    }
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    // This is needed because RLS policies check auth.uid(), which is null without a real session
    const dbClient = isDevFallback ? supabaseServer : supabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch (jsonError: any) {
      console.error('[api/profile] Failed to parse request body:', jsonError)
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: jsonError?.message || 'Failed to parse JSON'
        },
        { status: 400 }
      )
    }
    console.log('[api/profile] Received body:', JSON.stringify(body, null, 2))
    console.log('[api/profile] Age in body:', body.age, 'Type:', typeof body.age)
    
    const {
      name,
      sex,
      date_of_birth,
      age,
      height_cm,
      weight_kg,
      goal,
      units,
      sleep_goal_h,
      water_goal_ml,
      tz,
      theme,
      default_activity_level,
    } = body

    const profileData: any = {
      user_id: userId,
    }

    // Handle all fields - convert undefined/empty strings to null for database
    if (name !== undefined && name !== '') profileData.name = name
    else if (name === '') profileData.name = null
    
    // Handle sex/gender - explicitly set even if null
    if (sex !== undefined) {
      profileData.sex = sex || null
      console.log('[api/profile] Setting sex to:', profileData.sex)
    }
    
    // Handle age - prefer direct age input over calculated age
    console.log('[api/profile] Processing age:', { age, type: typeof age, isNumber: typeof age === 'number', isString: typeof age === 'string' })
    if (age !== undefined && age !== null) {
      // Handle both number and string inputs
      const ageValue = typeof age === 'string' ? parseInt(age, 10) : age
      if (!isNaN(ageValue) && ageValue >= 13 && ageValue <= 120) {
        profileData.age = ageValue
        console.log('[api/profile] Setting age to:', ageValue)
      } else {
        console.warn('[api/profile] Invalid age value:', ageValue)
      }
    } else {
      console.log('[api/profile] Age is undefined or null, not setting')
    }
    
    if (date_of_birth !== undefined && date_of_birth !== '') {
      profileData.date_of_birth = date_of_birth
      // If age wasn't provided directly, try to calculate from date of birth
      if (!profileData.age) {
        try {
          const birthDate = new Date(date_of_birth)
          const today = new Date()
          let calculatedAge = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--
          }
          // Only set age if it's a valid number (database trigger will handle it if column exists)
          if (!isNaN(calculatedAge) && calculatedAge >= 13 && calculatedAge <= 120) {
            profileData.age = calculatedAge
          }
        } catch (e) {
          console.warn('[api/profile] Could not calculate age from date_of_birth:', e)
          // Continue without age - database trigger will handle it
        }
      }
    } else if (date_of_birth === '') {
      profileData.date_of_birth = null
      // Don't set age to null if column doesn't exist - let database handle it
    }
    
    // Handle height - accept 0 as valid, only null if explicitly empty string
    if (height_cm !== undefined) {
      if (height_cm === '' || height_cm === null) {
        profileData.height_cm = null
      } else {
        profileData.height_cm = Number(height_cm)
        console.log('[api/profile] Setting height_cm to:', profileData.height_cm)
      }
    }
    
    // Handle weight - accept 0 as valid, only null if explicitly empty string
    if (weight_kg !== undefined) {
      if (weight_kg === '' || weight_kg === null) {
        profileData.weight_kg = null
      } else {
        profileData.weight_kg = Number(weight_kg)
        console.log('[api/profile] Setting weight_kg to:', profileData.weight_kg)
      }
    }
    
    // Handle goal - explicitly set even if null
    if (goal !== undefined) {
      profileData.goal = goal || null
      console.log('[api/profile] Setting goal to:', profileData.goal)
    }
    if (units !== undefined) profileData.units = units || null
    if (sleep_goal_h !== undefined) profileData.sleep_goal_h = sleep_goal_h || null
    if (water_goal_ml !== undefined) profileData.water_goal_ml = water_goal_ml || null
    if (tz !== undefined) profileData.tz = tz || null
    if (theme !== undefined) profileData.theme = theme || null
    if (default_activity_level !== undefined) profileData.default_activity_level = default_activity_level || null

    console.log('[api/profile] Profile data to upsert:', JSON.stringify(profileData, null, 2))
    console.log('[api/profile] Age in profileData:', profileData.age, 'Type:', typeof profileData.age)

    // Use upsert to create or update
    // Handle missing columns gracefully - try with all fields first, then remove missing ones
    let profileDataToSave = { ...profileData }
    
    console.log('[api/profile] ========== ATTEMPTING TO SAVE ==========')
    console.log('[api/profile] Data being sent to database:', JSON.stringify(profileDataToSave, null, 2))
    console.log('[api/profile] Age value being sent:', profileDataToSave.age)
    
    let { data, error } = await dbClient
      .from('profiles')
      .upsert(profileDataToSave, {
        onConflict: 'user_id',
      })
      .select()
      .single()
    
    console.log('[api/profile] ========== DATABASE RESPONSE ==========')
    console.log('[api/profile] Error:', error)
    console.log('[api/profile] Data returned:', JSON.stringify(data, null, 2))
    console.log('[api/profile] Age in returned data:', data?.age)

    // If error is about missing columns, remove them and retry
    if (error && error.code === 'PGRST204') {
      const missingColumn = error.message?.match(/'(\w+)' column/)?.[1]
      console.error(`[api/profile] ========== COLUMN NOT FOUND ERROR ==========`)
      console.error(`[api/profile] Column '${missingColumn}' does not exist in the database!`)
      console.error(`[api/profile] This means the database migration hasn't been run!`)
      console.error(`[api/profile] Migration file: supabase/migrations/20250124_add_age_to_profiles.sql`)
      console.error(`[api/profile] =============================================`)
      
      // Remove the missing column from the data
      if (missingColumn === 'date_of_birth') {
        delete profileDataToSave.date_of_birth
        // Don't remove age - it might exist even if date_of_birth doesn't
      } else if (missingColumn === 'age') {
        console.error(`[api/profile] AGE COLUMN DOES NOT EXIST - Age value ${profileDataToSave.age} will be lost!`)
        console.error(`[api/profile] You MUST run the migration to save age values!`)
        delete profileDataToSave.age
      }
      
      const retryResult = await dbClient
        .from('profiles')
        .upsert(profileDataToSave, {
          onConflict: 'user_id',
        })
        .select()
        .single()
      
      data = retryResult.data
      error = retryResult.error
      
      // Log what was actually saved
      console.log(`[api/profile] After retry, saved data:`, JSON.stringify(data, null, 2))
      console.log(`[api/profile] Age in saved data after retry:`, data?.age)
      
      // If still error about another missing column, try one more time with only basic fields
      if (error && error.code === 'PGRST204') {
        const secondMissingColumn = error.message?.match(/'(\w+)' column/)?.[1]
        console.warn(`[api/profile] Column '${secondMissingColumn}' also not found, retrying with only basic fields`)
        
        // Keep only the most basic fields that should always exist
        // NOTE: age and date_of_birth are NOT in this list because they might not exist
        const basicFields = ['user_id', 'name', 'sex', 'height_cm', 'weight_kg', 'goal', 'units', 'sleep_goal_h', 'water_goal_ml', 'tz', 'theme']
        const minimalData: any = { user_id: profileDataToSave.user_id }
        
        for (const field of basicFields) {
          if (field !== 'user_id' && profileDataToSave[field] !== undefined) {
            minimalData[field] = profileDataToSave[field]
          }
        }
        
        console.error(`[api/profile] Using minimal data (age and date_of_birth excluded):`, JSON.stringify(minimalData, null, 2))
        
        const finalRetry = await dbClient
          .from('profiles')
          .upsert(minimalData, {
            onConflict: 'user_id',
          })
          .select()
          .single()
        
        data = finalRetry.data
        error = finalRetry.error
      }
    }

    if (error) {
      console.error('[api/profile] Upsert error:', error)
      console.error('[api/profile] Error details:', JSON.stringify(error, null, 2))
      console.error('[api/profile] Error code:', error.code)
      console.error('[api/profile] Error hint:', error.hint)
      console.error('[api/profile] Error details:', error.details)
      return NextResponse.json(
        { 
          error: error.message || 'Failed to save profile',
          code: error.code,
          hint: error.hint,
          details: error.details
        },
        { status: 500 }
      )
    }

    console.log('[api/profile] ========== SAVE VERIFICATION ==========')
    console.log('[api/profile] Successfully saved profile:', JSON.stringify(data, null, 2))
    console.log('[api/profile] Saved values:')
    console.log('[api/profile]   - sex:', data?.sex)
    console.log('[api/profile]   - goal:', data?.goal)
    console.log('[api/profile]   - weight_kg:', data?.weight_kg)
    console.log('[api/profile]   - height_cm:', data?.height_cm)
    console.log('[api/profile]   - age:', data?.age, 'Type:', typeof data?.age)
    console.log('[api/profile] =========================================')
    
    // Verify all critical fields were saved
    const savedFields = {
      sex: data?.sex,
      goal: data?.goal,
      weight_kg: data?.weight_kg,
      height_cm: data?.height_cm,
      age: data?.age,
    }
    const expectedFields = {
      sex: profileData.sex,
      goal: profileData.goal,
      weight_kg: profileData.weight_kg,
      height_cm: profileData.height_cm,
      age: profileData.age,
    }
    
    console.log('[api/profile] Expected vs Saved:')
    console.log('[api/profile]   sex:', { expected: expectedFields.sex, saved: savedFields.sex, match: expectedFields.sex === savedFields.sex })
    console.log('[api/profile]   goal:', { expected: expectedFields.goal, saved: savedFields.goal, match: expectedFields.goal === savedFields.goal })
    console.log('[api/profile]   weight_kg:', { expected: expectedFields.weight_kg, saved: savedFields.weight_kg, match: expectedFields.weight_kg === savedFields.weight_kg })
    console.log('[api/profile]   height_cm:', { expected: expectedFields.height_cm, saved: savedFields.height_cm, match: expectedFields.height_cm === savedFields.height_cm })
    console.log('[api/profile]   age:', { expected: expectedFields.age, saved: savedFields.age, match: expectedFields.age === savedFields.age })
    
    // Verify age was saved
    if (profileData.age !== undefined && data?.age !== profileData.age) {
      console.error('[api/profile] ========== ⚠️ AGE SAVE FAILURE ⚠️ ==========')
      console.error('[api/profile] Expected age:', profileData.age)
      console.error('[api/profile] Actual age in database:', data?.age)
      console.error('[api/profile]')
      console.error('[api/profile] ROOT CAUSE: The "age" column does not exist in your database!')
      console.error('[api/profile]')
      console.error('[api/profile] SOLUTION: Run the database migration:')
      console.error('[api/profile] 1. Open Supabase Dashboard → SQL Editor')
      console.error('[api/profile] 2. Copy contents of: supabase/migrations/20250124_add_age_to_profiles.sql')
      console.error('[api/profile] 3. Paste and run the SQL')
      console.error('[api/profile]')
      console.error('[api/profile] After running the migration, the age will save correctly.')
      console.error('[api/profile] =============================================')
    } else if (profileData.age !== undefined && data?.age === profileData.age) {
      console.log('[api/profile] ✓ Age saved successfully!', data?.age)
    }
    
    // Return the saved profile data immediately
    return NextResponse.json({ 
      profile: data,
      success: true,
      message: 'Profile saved successfully',
      ageSaved: data?.age === profileData.age,
      expectedAge: profileData.age,
      actualAge: data?.age
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/profile] Unexpected error:', err)
    console.error('[api/profile] Error stack:', err?.stack)
    
    // Ensure we always return a valid JSON response
    try {
      return NextResponse.json(
        { 
          error: err?.message || 'Failed to save profile',
          details: err?.toString() || String(err),
          type: 'unexpected_error'
        },
        { status: 500 }
      )
    } catch (responseError: any) {
      // If even creating the response fails, return a minimal error
      console.error('[api/profile] Failed to create error response:', responseError)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Internal server error',
          type: 'response_serialization_error'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

