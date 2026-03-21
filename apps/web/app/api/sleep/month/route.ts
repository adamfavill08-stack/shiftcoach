import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { DEFAULT_TARGET_MIN } from '@/lib/sleep/constants'

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    const now = new Date()
    const month = monthParam ? Number(monthParam) : now.getMonth()
    const year  = yearParam ? Number(yearParam) : now.getFullYear()

    // Calculate month start and end using native Date
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)

    const { data: targetRow } = await supabase
      .from('sleep_targets')
      .select('target_minutes')
      .eq('user_id', userId)
      .maybeSingle()

    const targetMin = targetRow?.target_minutes ?? DEFAULT_TARGET_MIN

    console.log('[api/sleep/month] querying', { userId, month, year, start: start.toISOString(), end: end.toISOString() })

    const { data: logs, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('end_at', start.toISOString())
      .lt('end_at', end.toISOString())
      .order('end_at', { ascending: true })

    if (error) {
      console.error('[api/sleep/month] query error:', error)
      // If table doesn't exist, return empty array instead of error
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[api/sleep/month] sleep_logs table does not exist, returning empty data')
        return NextResponse.json({ targetMin, logs: [] })
      }
      throw error
    }

    console.log('[api/sleep/month] found logs:', logs?.length ?? 0)
    return NextResponse.json({ targetMin, logs: logs ?? [] })
  } catch (e: any) {
    console.error('[api/sleep/month] fatal', e)
    return NextResponse.json({ error: 'fatal', details: e?.message }, { status: 500 })
  }
}

