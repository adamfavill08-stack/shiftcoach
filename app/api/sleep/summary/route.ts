import { NextResponse, NextRequest } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { estimateSleepStages } from '@/lib/sleep/estimateSleepStages'

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

  // Calculate sleep stages for last night
  // Priority: 1) Wearable device data (sleep_records), 2) AI estimation from manual entry
  let sleepStages = { deep: 0, rem: 0, light: 0, awake: 0 }
  
  if (last && startTime && endTime && totalMins > 0) {
    // First, try to get wearable device data (sleep_records table)
    // This is the most accurate source when available
    try {
      const { data: wearableRecords } = await supabase
        .from('sleep_records')
        .select('stage, start_at, end_at')
        .eq('user_id', userId)
        .gte('start_at', startTime)
        .lte('end_at', endTime)
        .order('start_at', { ascending: true })
      
      if (wearableRecords && wearableRecords.length > 0) {
        // Calculate percentages from wearable stage data
        const totalDurationMs = totalMins * 60 * 1000
        let deepMs = 0, remMs = 0, lightMs = 0, awakeMs = 0
        
        for (const record of wearableRecords) {
          const recordStart = new Date(record.start_at).getTime()
          const recordEnd = new Date(record.end_at).getTime()
          const recordDuration = recordEnd - recordStart
          
          if (record.stage === 'deep') {
            deepMs += recordDuration
          } else if (record.stage === 'rem') {
            remMs += recordDuration
          } else if (record.stage === 'light') {
            lightMs += recordDuration
          } else if (record.stage === 'awake') {
            awakeMs += recordDuration
          }
        }
        
        // Convert to percentages
        sleepStages = {
          deep: Math.round((deepMs / totalDurationMs) * 100),
          rem: Math.round((remMs / totalDurationMs) * 100),
          light: Math.round((lightMs / totalDurationMs) * 100),
          awake: Math.round((awakeMs / totalDurationMs) * 100),
        }
      } else {
        // No wearable data - use AI estimation for manual entry
        const durationHours = totalMins / 60
        const startDate = new Date(startTime)
        const bedtimeHour = startDate.getHours()
        
        // Determine if this is daytime sleep (for shift workers)
        const midpointHour = (startDate.getHours() + new Date(endTime).getHours()) / 2
        const isDaySleep = midpointHour >= 8 && midpointHour <= 16
        
        // Get quality - this is the manually input quality from the user
        const quality = (() => {
          const q = last.quality
          if (!q) return 'Fair' as const
          if (typeof q === 'number') {
            const qualityMap: Record<number, 'Excellent' | 'Good' | 'Fair' | 'Poor'> = { 
              5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' 
            }
            return qualityMap[q] || 'Fair'
          }
          return q as 'Excellent' | 'Good' | 'Fair' | 'Poor'
        })()
        
        console.log('[api/sleep/summary] Using quality for AI estimation:', {
          quality,
          durationHours: durationHours.toFixed(1),
          bedtimeHour,
          isDaySleep,
        })
        
        // Estimate sleep stages using AI - quality significantly affects the calculation
        sleepStages = estimateSleepStages({
          durationHours,
          quality, // User's manual quality input directly affects Deep/REM/Light/Awake percentages
          bedtimeHour,
          isDaySleep,
        })
        
        console.log('[api/sleep/summary] AI estimated stages based on quality:', sleepStages)
      }
    } catch (wearableError) {
      // If wearable query fails (table might not exist), fall back to AI estimation
      console.log('[api/sleep/summary] Wearable data not available, using AI estimation:', wearableError)
      
      const durationHours = totalMins / 60
      const startDate = new Date(startTime)
      const bedtimeHour = startDate.getHours()
      const midpointHour = (startDate.getHours() + new Date(endTime).getHours()) / 2
      const isDaySleep = midpointHour >= 8 && midpointHour <= 16
      
      const quality = (() => {
        const q = last.quality
        if (!q) return 'Fair' as const
        if (typeof q === 'number') {
          const qualityMap: Record<number, 'Excellent' | 'Good' | 'Fair' | 'Poor'> = { 
            5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' 
          }
          return qualityMap[q] || 'Fair'
        }
        return q as 'Excellent' | 'Good' | 'Fair' | 'Poor'
      })()
      
      console.log('[api/sleep/summary] Fallback: Using quality for AI estimation:', {
        quality,
        durationHours: durationHours.toFixed(1),
      })
      
      sleepStages = estimateSleepStages({
        durationHours,
        quality, // User's manual quality input directly affects Deep/REM/Light/Awake percentages
        bedtimeHour,
        isDaySleep,
      })
    }
  }

  const response = NextResponse.json({
    lastNight: last ? {
      totalMinutes: totalMins,
      startAt: startTime || '',
      endAt: endTime || '',
      deep: sleepStages.deep,
      rem: sleepStages.rem,
      light: sleepStages.light,
      awake: sleepStages.awake,
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

