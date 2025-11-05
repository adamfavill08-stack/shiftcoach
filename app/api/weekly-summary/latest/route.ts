import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * GET /api/weekly-summary/latest
 * 
 * Returns the latest weekly summary for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ summary: null }, { status: 200 })
    }

    const { data, error } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[weekly-summary/latest] error:', error)
      return NextResponse.json({ summary: null }, { status: 200 })
    }

    return NextResponse.json({ summary: data })
  } catch (err: any) {
    console.error('[weekly-summary/latest] Fatal error:', err)
    return NextResponse.json({ summary: null }, { status: 200 })
  }
}

