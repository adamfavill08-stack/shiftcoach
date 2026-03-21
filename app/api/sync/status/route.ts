import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) return NextResponse.json({ ok: false })

    const { data } = await supabase
      .from('device_sources')
      .select('last_synced_at')
      .eq('user_id', userId)
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data?.last_synced_at) return NextResponse.json({ ok: false })
    const fresh = Date.now() - new Date(data.last_synced_at).getTime() < 24 * 60 * 60 * 1000
    return NextResponse.json({ ok: fresh })
  } catch (e) {
    console.error('[sync/status] error', e)
    return NextResponse.json({ ok: false })
  }
}

