import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) return NextResponse.json({ days: [] })

    const start = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data, error } = await supabase
      .from('sleep_records')
      .select('start_at,end_at,stage')
      .eq('user_id', userId)
      .gte('start_at', start)
      .order('start_at', { ascending: true })

    if (error) {
      console.error('[sleep/last7] query error', error)
      return NextResponse.json({ days: [] })
    }

    // Aggregate total hours asleep per local day
    const map = new Map<string, number>()
    for (const s of data ?? []) {
      if (s.stage === 'awake' || s.stage === 'inbed') continue
      const hrs = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 3_600_000
      const key = new Date(s.start_at).toLocaleDateString('en-GB') // tweak TZ as needed
      map.set(key, (map.get(key) || 0) + hrs)
    }

    const days = Array.from(map.entries()).map(([date, hours]) => ({ date, hours: +hours.toFixed(1) }))
    return NextResponse.json({ days })
  } catch (e) {
    console.error('[sleep/last7] fatal', e)
    return NextResponse.json({ days: [] })
  }
}

