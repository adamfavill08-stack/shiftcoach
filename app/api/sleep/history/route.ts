import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
  
  // Use service role client (bypasses RLS) when in dev fallback mode
  const supabase = isDevFallback ? supabaseServer : authSupabase

  try {
    // Accept query params for date range, or default to last 30 days
    const searchParams = req.nextUrl.searchParams
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    
    let fromIsoDate: string
    let toIsoDate: string | undefined
    
    if (fromParam && toParam) {
      fromIsoDate = fromParam
      toIsoDate = toParam
    } else {
      // Default to last 30 days
      const now = new Date()
      const from = new Date()
      from.setDate(now.getDate() - 30)
      fromIsoDate = from.toISOString().slice(0, 10)
      toIsoDate = undefined
    }

    let query = supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps')
      .eq('user_id', userId)
      .gte('date', fromIsoDate)
    
    if (toIsoDate) {
      query = query.lte('date', toIsoDate)
    }
    
    const { data, error } = await query
      .order('start_ts', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[/api/sleep/history] query error:', error)
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    console.log('[/api/sleep/history] rows:', data?.length ?? 0)

    return NextResponse.json({ items: data ?? [] }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/history] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json({ items: [] }, { status: 200 })
  }
}

