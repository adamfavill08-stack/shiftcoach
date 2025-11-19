import { NextResponse, NextRequest } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

// Utility
function minutesBetween(a: string | Date, b: string | Date) {
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
}

export async function GET(req: NextRequest) {
  const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
  
  // Use service role client (bypasses RLS) when in dev fallback mode
  const supabase = isDevFallback ? supabaseServer : authSupabase
  
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Last 36h window = "last night"
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  // Try old schema first (end_ts, naps) since that's what the user has
  let lastLogs, lastErr
  let result = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('naps', 0) // 0 = main sleep in old schema
    .gte('end_ts', since)
    .order('end_ts', { ascending: false })
    .limit(1)
  
  lastLogs = result.data
  lastErr = result.error
  
  // If old schema fails (column doesn't exist), try new schema
  if (lastErr && (lastErr.message?.includes("end_ts") || lastErr.message?.includes("naps") || lastErr.code === 'PGRST204')) {
    console.log('[api/sleep/summary] Trying new schema with end_at')
    result = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'sleep') // Only get main sleep, not naps
      .gte('end_at', since)
      .order('end_at', { ascending: false })
      .limit(1)
    lastLogs = result.data
    lastErr = result.error
  }

  if (lastErr) {
    console.error('[api/sleep/summary] last night query error:', lastErr)
    // If table doesn't exist, return empty data
    if (lastErr.message?.includes('relation') || lastErr.message?.includes('does not exist')) {
      return NextResponse.json({
        lastNight: null,
        last7: [],
        targetMinutes: 8 * 60,
      })
    }
    return NextResponse.json({ error: lastErr.message }, { status: 500 })
  }

  const last = lastLogs?.[0] ?? null
  // Handle both schemas: new uses start_at/end_at, old uses start_ts/end_ts
  const startTime = last?.start_at || last?.start_ts
  const endTime = last?.end_at || last?.end_ts
  const totalMins = last && startTime && endTime ? minutesBetween(startTime, endTime) : 0
  
  console.log('[api/sleep/summary] Last night data:', {
    hasLast: !!last,
    startTime,
    endTime,
    totalMins,
    quality: last?.quality,
    schema: last?.start_at ? 'new' : last?.start_ts ? 'old' : 'none'
  })

  // Last 7 days summary (group by date) - use local time
  const now = new Date()
  const sevenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)
  
  // Helper to get local date string (YYYY-MM-DD) from a Date
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper to get local date from ISO string
  const getLocalDateFromISO = (isoString: string): string => {
    const date = new Date(isoString)
    return getLocalDateString(date)
  }

  // Try old schema first, fallback to new schema
  let weekLogs, weekErr
  let weekResult = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('naps', 0) // 0 = main sleep in old schema
    .gte('start_ts', sevenAgo.toISOString())
    .order('start_ts', { ascending: true })
  
  weekLogs = weekResult.data
  weekErr = weekResult.error
  
  // If old schema fails (column doesn't exist), try new schema
  if (weekErr && (weekErr.message?.includes("start_ts") || weekErr.message?.includes("naps") || weekErr.code === 'PGRST204')) {
    console.log('[api/sleep/summary] Trying new schema for week data')
    weekResult = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'sleep') // Only get main sleep for 7-day summary
      .gte('start_at', sevenAgo.toISOString())
      .order('start_at', { ascending: true })
    weekLogs = weekResult.data
    weekErr = weekResult.error
  }

  if (weekErr) {
    console.error('[api/sleep/summary] week query error:', weekErr)
    // If table doesn't exist, return empty data
    if (weekErr.message?.includes('relation') || weekErr.message?.includes('does not exist')) {
      return NextResponse.json({
        lastNight: last ? {
          totalMinutes: totalMins,
          startAt: startTime || '',
          endAt: endTime || '',
          deep: 0,
          rem: 0,
          light: 0,
          awake: 0,
          quality: (() => {
            const q = last.quality
            if (!q) return 'Fair'
            if (typeof q === 'number') {
              const qualityMap: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' }
              return qualityMap[q] || 'Fair'
            }
            return q
          })(),
          updatedAt: last.created_at || startTime || '',
        } : null,
        last7: [],
        targetMinutes: 8 * 60,
      })
    }
    return NextResponse.json({ error: weekErr.message }, { status: 500 })
  }

  // Map by day (local)
  const byDay: Record<string, {
    dateISO: string, total: number, quality: string
  }> = {}

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0) // Use noon to avoid timezone issues
    const key = getLocalDateString(d)
    // Store ISO string for sorting, but use local date for key
    // Use noon local time to ensure the date doesn't shift when converted to ISO
    byDay[key] = { dateISO: d.toISOString(), total: 0, quality: '—' }
  }

      for (const row of weekLogs ?? []) {
        // Handle both schemas
        const endTime = row.end_at || row.end_ts
        const startTime = row.start_at || row.start_ts
        if (!endTime || !startTime) continue
        
        // Use date column if available (old schema), otherwise extract local date from endTime
        let key: string
        if (row.date) {
          key = row.date.slice(0, 10)
        } else {
          // Extract local date from endTime (sleep ends on the date it's logged for)
          key = getLocalDateFromISO(endTime)
        }
        
        if (!byDay[key]) {
          // Date might be outside our 7-day window, skip it
          continue
        }
        byDay[key].total += minutesBetween(startTime, endTime)
        
        // Handle quality: new schema uses text, old uses int
        const qualityValue = row.quality
        if (qualityValue) {
          if (typeof qualityValue === 'number') {
            // Old schema: convert int to text
            const qualityMap: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' }
            byDay[key].quality = qualityMap[qualityValue] || 'Fair'
          } else {
            byDay[key].quality = qualityValue
          }
        }
      }
      
      console.log('[api/sleep/summary] Week data aggregated:', {
        weekLogsCount: weekLogs?.length || 0,
        byDayKeys: Object.keys(byDay),
        byDayTotals: Object.entries(byDay).map(([k, v]) => ({ date: k, total: v.total }))
      })

  // Sort by date descending (most recent first) for display
  const last7Array = Object.values(byDay).sort((a, b) => 
    new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  )

  console.log('[api/sleep/summary] Returning:', {
    hasLastNight: !!last,
    last7Days: last7Array.length,
    last7Total: last7Array.reduce((sum, d) => sum + d.total, 0),
    last7Details: last7Array.map(d => ({ date: d.dateISO.slice(0, 10), total: d.total }))
  })

  const response = NextResponse.json({
    lastNight: last ? {
      totalMinutes: totalMins,
      startAt: startTime || '',
      endAt: endTime || '',
      deep: 0, // Not in new schema - can be calculated from duration if needed
      rem: 0,
      light: 0,
      awake: 0,
      quality: (() => {
        const q = last.quality
        if (!q) return 'Fair'
        if (typeof q === 'number') {
          const qualityMap: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' }
          return qualityMap[q] || 'Fair'
        }
        return q
      })(),
      updatedAt: last.created_at || startTime || '',
    } : null,
    last7: last7Array,
    targetMinutes: 8 * 60, // 8h default target (can make user setting later)
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  })
  
  return response
}

