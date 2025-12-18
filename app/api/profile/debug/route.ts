import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/debug
 * Debug endpoint to check what's actually in the database
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get raw data from database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        details: error.details,
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      userId,
      profile: data,
      criticalFields: {
        sex: data?.sex,
        goal: data?.goal,
        weight_kg: data?.weight_kg,
        height_cm: data?.height_cm,
        age: data?.age,
      },
      allKeys: data ? Object.keys(data) : [],
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || 'Failed to debug',
      details: err?.toString()
    }, { status: 500 })
  }
}

