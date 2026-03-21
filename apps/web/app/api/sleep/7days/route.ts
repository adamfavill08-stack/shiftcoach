import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { predictSleepStages, type SleepStageInput } from '@/lib/sleep/predictSleepStages'

export const dynamic = 'force-dynamic'

// Utility function from summary route
function minutesBetween(a: string | Date, b: string | Date) {
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
}

/**
 * GET /api/sleep/7days
 * Returns sleep data for the last 7 days, grouped by calendar day
 * Reuses the same aggregation logic as /api/sleep/summary
 */
export async function GET(req: NextRequest) {
  console.log('[api/sleep/7days] ========== ROUTE HIT ==========')
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    console.log('[api/sleep/7days] Got userId:', userId)
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for age calculation
    const { data: profile } = await supabase
      .from('profiles')
      .select('date_of_birth, age')
      .eq('user_id', userId)
      .maybeSingle()

    // Calculate age from date_of_birth or use stored age
    let userAge: number | null = profile?.age ?? null
    if (!userAge && profile?.date_of_birth) {
      const dob = new Date(profile.date_of_birth)
      const today = new Date()
      let calculatedAge = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        calculatedAge--
      }
      userAge = calculatedAge
    }

    // Last 7 days summary (group by date) - use local time
    // Same logic as /api/sleep/summary
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
    // Include ALL sleep sessions (both main sleep and naps) for total sleep per day
    let weekLogs, weekErr
    let weekResult = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      // Don't filter by naps - include all sleep sessions (main + naps)
      .gte('start_ts', sevenAgo.toISOString())
      .order('start_ts', { ascending: true })
    
    weekLogs = weekResult.data
    weekErr = weekResult.error
    
    // If old schema fails (column doesn't exist), try new schema
    if (weekErr && (weekErr.message?.includes("start_ts") || weekErr.message?.includes("naps") || weekErr.code === 'PGRST204')) {
      console.log('[api/sleep/7days] Trying new schema for week data')
      weekResult = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        // Include both 'sleep' and 'nap' types for total sleep per day
        .in('type', ['sleep', 'nap'])
        .gte('start_at', sevenAgo.toISOString())
        .order('start_at', { ascending: true })
      weekLogs = weekResult.data
      weekErr = weekResult.error
    }

    if (weekErr) {
      console.error('[api/sleep/7days] week query error:', weekErr)
      // If table doesn't exist, return empty array
      if (weekErr.message?.includes('relation') || weekErr.message?.includes('does not exist')) {
        console.log('[api/sleep/7days] Table does not exist, returning empty days array')
        return NextResponse.json({ days: [] }, { status: 200 })
      }
      return NextResponse.json({ error: weekErr.message }, { status: 500 })
    }

    // Map by day (local) - same logic as summary route
    const byDay: Record<string, {
      date: string
      total: number
    }> = {}

    // Initialize 7 days with empty data
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
      const key = getLocalDateString(d)
      byDay[key] = { date: key, total: 0 }
    }

    // Aggregate sleep by day
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
    }

    // Fetch shift data for the same 7 days
    const shiftStartDate = getLocalDateString(sevenAgo)
    const shiftEndDate = getLocalDateString(new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + 6, 23, 59, 59))
    
    let shiftsByDate: Record<string, { label: string; type: string | null }> = {}
    
    // Helper to map label to type
    const labelToType = (label: string | null): string => {
      if (!label) return 'off'
      const lower = label.toLowerCase()
      if (lower.includes('night')) return 'night'
      if (lower.includes('morning')) return 'morning'
      if (lower.includes('afternoon')) return 'afternoon'
      if (lower.includes('day') && !lower.includes('off')) return 'day'
      return 'off'
    }
    
    try {
      // First try to get shifts from the shifts table (explicitly logged shifts)
      const shiftResult = await supabase
        .from('shifts')
        .select('date, label')
        .eq('user_id', userId)
        .gte('date', shiftStartDate)
        .lte('date', shiftEndDate)
        .order('date', { ascending: true })
      
      if (!shiftResult.error && shiftResult.data) {
        for (const shift of shiftResult.data) {
          const label = shift.label || 'OFF'
          shiftsByDate[shift.date] = {
            label,
            type: labelToType(label),
          }
        }
      }
      
      // Also check rota pattern for any dates that don't have explicit shifts
      // Get the user's rota pattern
      const patternResult = await supabase
        .from('user_shift_patterns')
        .select('pattern_slots, current_shift_index, start_date')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (!patternResult.error && patternResult.data) {
        const { pattern_slots, current_shift_index, start_date } = patternResult.data
        const patternSlots = Array.isArray(pattern_slots) ? pattern_slots.map((s: any) => String(s)) : []
        const startDate = start_date ? new Date(start_date + 'T12:00:00') : null
        const currentIndex = typeof current_shift_index === 'number' ? current_shift_index : 0
        
        if (patternSlots.length > 0 && startDate) {
          // Calculate which shift slot applies to each of the 7 days
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0)
            const dateStr = getLocalDateString(checkDate)
            
            // Only fill in if we don't already have a shift for this date
            if (!shiftsByDate[dateStr]) {
              // Calculate days difference (same logic as buildRotaMonth)
              const anchorDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
              const checkDateLocal = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate())
              const daysDiff = Math.floor((checkDateLocal.getTime() - anchorDate.getTime()) / (24 * 60 * 60 * 1000))
              
              if (daysDiff >= 0) {
                // Use same calculation as buildRotaMonth: ((baseIndex + diff) % slots.length + slots.length) % slots.length
                const slotIndex = ((currentIndex + daysDiff) % patternSlots.length + patternSlots.length) % patternSlots.length
                const slot = patternSlots[slotIndex]
                
                // Map slot char to type
                const slotUpper = String(slot || '').toUpperCase()
                const type = slotUpper === 'M' ? 'morning'
                  : slotUpper === 'A' ? 'afternoon'
                  : slotUpper === 'D' ? 'day'
                  : slotUpper === 'N' ? 'night'
                  : 'off'
                
                const label = slotUpper === 'M' ? 'Morning'
                  : slotUpper === 'A' ? 'Afternoon'
                  : slotUpper === 'D' ? 'Day'
                  : slotUpper === 'N' ? 'Night'
                  : 'OFF'
                
                shiftsByDate[dateStr] = { label, type }
              }
            }
          }
        }
      }
    } catch (shiftErr) {
      console.warn('[api/sleep/7days] Failed to fetch shifts:', shiftErr)
      // Continue without shift data - it's optional
    }

    // Get shift type for prediction (use today's shift or most recent)
    let currentShiftType: 'morning' | 'day' | 'evening' | 'night' | 'rotating' | null = null
    const todayStr = getLocalDateString(new Date())
    if (shiftsByDate[todayStr]) {
      const shiftType = shiftsByDate[todayStr].type
      if (shiftType === 'night') currentShiftType = 'night'
      else if (shiftType === 'morning') currentShiftType = 'morning'
      else if (shiftType === 'day') currentShiftType = 'day'
      else if (shiftType === 'afternoon') currentShiftType = 'evening'
    }

    // Convert to array format expected by frontend
    // Sort by date descending (most recent first)
    const daysArray = Object.values(byDay)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((d) => {
        const shift = shiftsByDate[d.date]
        
        // Predict sleep stages for this day if we have sleep data
        let stages: { awake: number; rem: number; light: number; deep: number } | null = null
        if (d.total > 0) {
          // Find the main sleep session for this day to get timing
          const daySleep = (weekLogs ?? []).find((row: any) => {
            const endTime = row.end_at || row.end_ts
            if (!endTime) return false
            const rowDate = row.date ? row.date.slice(0, 10) : getLocalDateFromISO(endTime)
            return rowDate === d.date && (row.type === 'sleep' || row.naps === 0)
          })
          
          if (daySleep) {
            const startTime = daySleep.start_at || daySleep.start_ts
            const endTime = daySleep.end_at || daySleep.end_ts
            const quality = daySleep.quality || null
            const shiftTypeForDay = shift?.type === 'night' ? 'night'
              : shift?.type === 'morning' ? 'morning'
              : shift?.type === 'day' ? 'day'
              : shift?.type === 'afternoon' ? 'evening'
              : currentShiftType
            
            if (startTime && endTime) {
              const predicted = predictSleepStages({
                totalMinutes: d.total,
                sleepStart: new Date(startTime),
                sleepEnd: new Date(endTime),
                quality,
                shiftType: shiftTypeForDay,
                age: userAge,
                sleepDebtHours: 0, // TODO: Calculate from recent sleep patterns
              })
              stages = predicted
            }
          } else {
            // No specific session found, use default prediction based on total
            const predicted = predictSleepStages({
              totalMinutes: d.total,
              sleepStart: new Date(d.date + 'T22:00:00'), // Default bedtime
              sleepEnd: new Date(new Date(d.date + 'T22:00:00').getTime() + d.total * 60000),
              quality: null,
              shiftType: currentShiftType,
              age: userAge,
              sleepDebtHours: 0,
            })
            stages = predicted
          }
        }
        
        return {
          date: d.date,
          totalMinutes: d.total,
          totalSleepHours: d.total / 60,
          shift: shift ? {
            label: shift.label,
            type: shift.type,
          } : null,
          stages,
        }
      })

    console.log('[api/sleep/7days] Returning days:', daysArray)
    
    return NextResponse.json({ days: daysArray }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err: any) {
    console.error('[api/sleep/7days] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    
    return NextResponse.json(
      { 
        error: err?.message || 'Unknown server error',
        details: err?.details,
      },
      { status: 500 }
    )
  }
}
