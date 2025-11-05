import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[/api/sleep/history] auth error:', authError)
    }

    if (!user) {
      console.log('[/api/sleep/history] no user, returning empty')
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    // Last 30 days using the date column (YYYY-MM-DD)
    const now = new Date()
    const from = new Date()
    from.setDate(now.getDate() - 30)
    const fromIsoDate = from.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id, date, start_ts, end_ts, sleep_hours, quality, naps')
      .eq('user_id', user.id)
      .gte('date', fromIsoDate)
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

