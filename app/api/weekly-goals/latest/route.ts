import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * GET /api/weekly-goals/latest
 * 
 * Returns the latest weekly goals for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ goals: null }, { status: 200 })
    }

    const { data, error } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
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

