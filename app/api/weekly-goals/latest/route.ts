import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/weekly-goals/latest
 *
 * Returns the latest weekly goals for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    const { data, error } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[weekly-goals/latest] error:', error)
      return NextResponse.json({ goals: null }, { status: 200 })
    }

    return NextResponse.json({ goals: data })
  } catch (err: any) {
    console.error('[weekly-goals/latest] Fatal error:', err)
    return NextResponse.json({ goals: null }, { status: 200 })
  }
}

