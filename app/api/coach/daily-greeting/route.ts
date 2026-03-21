import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/coach/daily-greeting
 * Returns the user's profile name and today's shift/event for the daily greeting
 */
export async function GET() {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10)
    
    // Fetch profile for user name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle()
    
    // Fetch today's shift
    const { data: todayShift } = await supabase
      .from('shifts')
      .select('label, date, start_ts, end_ts')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
    
    // Fetch today's event (prioritize holidays)
    // Try to match by event_date first (more reliable for all-day events)
    const { data: eventsByDate } = await supabase
      .from('rota_events')
      .select('title, type, event_date, start_at')
      .eq('user_id', userId)
      .eq('event_date', today)
      .order('type', { ascending: false }) // 'holiday' comes after 'other' alphabetically, so descending puts it first
    
    // Also try matching by start_at timestamp range (for timed events)
    const startOfDay = new Date(today + 'T00:00:00Z').toISOString()
    const endOfDay = new Date(today + 'T23:59:59Z').toISOString()
    
    const { data: eventsByTime } = await supabase
      .from('rota_events')
      .select('title, type, event_date, start_at')
      .eq('user_id', userId)
      .gte('start_at', startOfDay)
      .lte('start_at', endOfDay)
      .order('type', { ascending: false })
    
    // Combine and deduplicate events
    const allEvents = [
      ...(eventsByDate || []),
      ...(eventsByTime || []),
    ]
    
    // Remove duplicates by ID (if events have IDs) or by title+date
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => 
        (e.title === event.title && (e.event_date === event.event_date || e.start_at === event.start_at))
      )
    )
    
    // Prioritize holiday events
    const todayEvent = uniqueEvents.length > 0 
      ? uniqueEvents.find(e => e.type === 'holiday') || uniqueEvents[0]
      : null
    
    return NextResponse.json({
      userName: profile?.name || null,
      todayShift: todayShift ? {
        label: todayShift.label,
        type: null, // Can be enhanced later to determine shift type
      } : null,
      todayEvent: todayEvent ? {
        title: todayEvent.title,
        type: todayEvent.type,
      } : null,
    })
  } catch (err: any) {
    console.error('[api/coach/daily-greeting] Error:', err)
    return NextResponse.json({
      userName: null,
      todayShift: null,
      todayEvent: null,
      error: err?.message || 'Unknown error',
    }, { status: 200 }) // Return 200 with nulls to not break UI
  }
}

