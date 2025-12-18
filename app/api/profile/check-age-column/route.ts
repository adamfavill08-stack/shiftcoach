import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/check-age-column
 * Check if the age column exists in the profiles table
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to query the age column directly
    const { data, error } = await supabase
      .from('profiles')
      .select('age, date_of_birth, user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      // Check if it's a column not found error
      if (error.code === 'PGRST204' && error.message?.includes("'age' column")) {
        return NextResponse.json({
          columnExists: false,
          error: 'The age column does not exist in the database',
          message: 'Please run the migration: supabase/migrations/20250124_add_age_to_profiles.sql',
          migrationFile: 'supabase/migrations/20250124_add_age_to_profiles.sql'
        }, { status: 200 })
      }
      
      return NextResponse.json({
        columnExists: 'unknown',
        error: error.message,
        code: error.code
      }, { status: 200 })
    }

    return NextResponse.json({
      columnExists: true,
      profileData: data,
      age: data?.age,
      dateOfBirth: data?.date_of_birth,
      message: 'Age column exists and is accessible'
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || 'Failed to check column',
      details: err?.toString()
    }, { status: 500 })
  }
}

