import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { predictSleepStages } from '@/lib/sleep/predictSleepStages'
import {
  addCalendarDaysToYmd,
  formatYmdInTimeZone,
  isPrimarySleepType,
  splitSleepMinutesAcrossLocalDays,
} from '@/lib/sleep/utils'

export const dynamic = 'force-dynamic'

function minutesBetween(a: string | Date, b: string | Date) {
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
}

function resolveRequestTimeZone(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get('tz') ?? req.nextUrl.searchParams.get('timeZone') ?? ''
  const decoded = raw ? decodeURIComponent(raw.trim()) : ''
  const zone = decoded.slice(0, 120)
  if (!zone) return 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
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
    
    if (!userId) return buildUnauthorizedResponse()


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

    const now = new Date()
    const timeZone = resolveRequestTimeZone(req)

    const anchorRaw = (req.nextUrl.searchParams.get('anchorDate') ?? '').trim()
    const endYmd =
      /^\d{4}-\d{2}-\d{2}$/.test(anchorRaw) && !Number.isNaN(Date.parse(`${anchorRaw}T12:00:00`))
        ? anchorRaw
        : formatYmdInTimeZone(now, timeZone)

    const dayKeysAsc: string[] = []
    for (let i = 6; i >= 0; i--) {
      dayKeysAsc.push(addCalendarDaysToYmd(endYmd, -i))
    }
    const dayKeySet = new Set(dayKeysAsc)

    // Wide overlap fetch: any session intersecting this wall-clock window could contribute
    // minutes to the 7-day chart after split-by-midnight (avoid missing long overnight spans).
    const fetchFrom = new Date(now.getTime() - 40 * 86400000).toISOString()
    const fetchThrough = new Date(now.getTime() + 48 * 3600000).toISOString()

    async function fetchWeek(opts: { withDeletedNull: boolean }) {
      let q = supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .not('start_at', 'is', null)
        .not('end_at', 'is', null)
        .lte('start_at', fetchThrough)
        .gte('end_at', fetchFrom)
        .order('start_at', { ascending: true })
      if (opts.withDeletedNull) q = q.is('deleted_at', null)
      return q
    }

    let weekResult = await fetchWeek({ withDeletedNull: true })
    let weekLogs = weekResult.data
    let weekErr = weekResult.error

    const deletedBroken =
      !!weekErr &&
      (weekErr.code === 'PGRST204' ||
        weekErr.code === '42703' ||
        (weekErr.message ?? '').toLowerCase().includes('deleted_at') ||
        (weekErr.message ?? '').includes('does not exist'))

    if (deletedBroken) {
      const r2 = await fetchWeek({ withDeletedNull: false })
      weekLogs = r2.data
      weekErr = r2.error
    }

    if (weekErr) {
      console.error('[api/sleep/7days] week query error:', weekErr)
      if (weekErr.message?.includes('relation') || weekErr.message?.includes('does not exist')) {
        return NextResponse.json({ days: [] }, { status: 200 })
      }
      return NextResponse.json({ error: weekErr.message }, { status: 500 })
    }

    const byDay: Record<string, { date: string; total: number }> = {}
    for (const key of dayKeysAsc) {
      byDay[key] = { date: key, total: 0 }
    }

    for (const row of weekLogs ?? []) {
      const endTime = row.end_at || row.end_ts
      const startTime = row.start_at || row.start_ts
      if (!endTime || !startTime) continue

      // Ignore row.date: it often reflects import/start metadata and breaks alignment with logs.
      // Split at local midnights so overnight sleep credits each calendar day correctly.
      const pieces = splitSleepMinutesAcrossLocalDays(startTime, endTime, timeZone)
      for (const [ymd, mins] of pieces) {
        if (!dayKeySet.has(ymd) || !byDay[ymd]) continue
        byDay[ymd].total += mins
      }
    }

    const shiftStartDate = dayKeysAsc[0]
    const shiftEndDate = dayKeysAsc[6]
    
    const shiftsByDate: Record<string, { label: string; type: string | null }> = {}
    
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
          for (const dateStr of dayKeysAsc) {
            const checkDate = new Date(`${dateStr}T12:00:00`)
            
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

    let currentShiftType: 'morning' | 'day' | 'evening' | 'night' | 'rotating' | null = null
    const todayStr = endYmd
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
            const startTime = row.start_at || row.start_ts
            if (!endTime || !startTime) return false
            if (row.type === 'nap') return false
            const onDay = splitSleepMinutesAcrossLocalDays(startTime, endTime, timeZone).get(d.date) ?? 0
            if (onDay <= 0) return false
            return (
              isPrimarySleepType(row.type) || row.type === 'sleep' || row.type === 'main' || row.naps === 0
            )
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
        
        const sessions = (weekLogs ?? [])
          .flatMap((row: any) => {
            const start = row.start_at || row.start_ts
            const end = row.end_at || row.end_ts
            if (!start || !end) return []
            const minsOnDay = splitSleepMinutesAcrossLocalDays(start, end, timeZone).get(d.date) ?? 0
            if (minsOnDay <= 0) return []
            return [
              {
                id: String(row.id),
                start_at: start,
                end_at: end,
                type: row.type,
                quality: row.quality ?? null,
                notes: row.notes ?? null,
                source: row.source || 'manual',
                durationHours: minsOnDay / 60,
              },
            ]
          })
          .sort(
            (a: { start_at: string }, b: { start_at: string }) =>
              new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
          )

        return {
          date: d.date,
          totalMinutes: d.total,
          totalSleepHours: d.total / 60,
          sessions,
          dataQuality: {
            stages: stages ? 'predicted_from_available_logs' : 'insufficient_data',
            sleepDebt: 'not_applied_in_stage_prediction',
          },
          shift: shift ? {
            label: shift.label,
            type: shift.type,
          } : null,
          stages,
        }
      })

    const chartBars = dayKeysAsc.map((dateKey) => ({
      dateKey,
      totalMinutes: byDay[dateKey]?.total ?? 0,
    }))

    console.log('[api/sleep/7days] Returning days:', daysArray)
    
    return NextResponse.json(
      {
        days: daysArray,
        chartBars,
        anchorDate: endYmd,
        timeZone,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    )
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
