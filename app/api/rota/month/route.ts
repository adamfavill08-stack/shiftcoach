import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { buildMonthFromPattern } from '@/lib/data/buildRotaMonth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const searchParams = req.nextUrl.searchParams
    const now = new Date()
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    const monthValue = monthParam !== null && !Number.isNaN(Number(monthParam)) ? Number.parseInt(monthParam, 10) : now.getMonth() + 1
    const month = Math.min(Math.max(monthValue, 1), 12)
    const year = yearParam !== null && !Number.isNaN(Number(yearParam)) ? Number.parseInt(yearParam, 10) : now.getFullYear()

    const zeroBasedMonth = month - 1

    // Calculate the actual date range for the calendar grid (includes previous/next month dates)
    const firstOfMonth = new Date(year, zeroBasedMonth, 1)
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(firstOfMonth.getDate() - firstWeekday) // Start from first Monday before/on 1st
    
    // Calendar shows 6 weeks max (42 days)
    const gridEnd = new Date(gridStart)
    gridEnd.setDate(gridStart.getDate() + 41) // 42 days total
    
    const gridStartStr = gridStart.toISOString().slice(0, 10)
    const gridEndStr = gridEnd.toISOString().slice(0, 10)

    // Fetch actual shifts from the shifts table for the entire calendar grid range
    const { data: monthShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('date, label, status')
      .eq('user_id', userId)
      .gte('date', gridStartStr)
      .lte('date', gridEndStr)
      .order('date', { ascending: true })

    if (shiftsError && !shiftsError.message?.includes('relation')) {
      console.error('[api/rota/month] shifts fetch error', shiftsError)
    }

    // Calculate month boundaries for checking if shifts exist in current month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    // Check if there are any shifts in the current month (for hasShifts check)
    const { data: currentMonthShifts } = await supabase
      .from('shifts')
      .select('date')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lt('date', monthEnd)
      .limit(1)

    const hasShifts = currentMonthShifts && currentMonthShifts.length > 0

    if (!hasShifts) {
      // No shifts saved yet - return empty calendar
      const emptyWeeks = buildMonthFromPattern({
        patternSlots: [],
        currentShiftIndex: 0,
        startDate: monthStart,
        month: zeroBasedMonth,
        year,
      })

      return NextResponse.json({
        month,
        year,
        pattern: null,
        weeks: emptyWeeks,
      })
    }

    // Create a map of date -> shift label
    const shiftsByDate = new Map<string, string>()
    if (monthShifts) {
      monthShifts.forEach((shift: any) => {
        shiftsByDate.set(shift.date, shift.label || 'OFF')
      })
    }

    // Fetch pattern for color config and metadata
    const { data, error } = await supabase
      .from('user_shift_patterns')
      .select('shift_length, pattern_id, pattern_slots, current_shift_index, start_date, color_config, notes')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && !error.message?.includes('relation')) {
      console.error('[api/rota/month] query error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
    }

    let colorConfig: Record<string, string | null> = {}
    let pattern: any = null

    if (data && !error) {
      colorConfig = (data.color_config as Record<string, string | null>) ?? {}

      pattern = {
        shift_length: data.shift_length,
        pattern_id: data.pattern_id,
        pattern_slots: Array.isArray(data.pattern_slots)
          ? data.pattern_slots.map((slot: unknown) => (typeof slot === 'string' ? slot : String(slot)))
          : [],
        current_shift_index: typeof data.current_shift_index === 'number' ? data.current_shift_index : 0,
        start_date: typeof data.start_date === 'string' ? data.start_date : new Date(year, month, 1).toISOString().slice(0, 10),
        color_config: colorConfig,
        notes: data.notes ?? null,
      }
    }

    // Build empty calendar structure
    const weeks = buildMonthFromPattern({
      patternSlots: [],
      currentShiftIndex: 0,
      startDate: monthStart,
      month: zeroBasedMonth,
      year,
    })

    // Helper function to convert shift label to type and slot
    const labelToType = (label: string | null): { type: 'morning' | 'afternoon' | 'day' | 'night' | 'off' | null, slot: 'M' | 'A' | 'D' | 'N' | 'O' | null } => {
      if (!label) return { type: null, slot: null }
      const upper = label.toUpperCase()
      if (upper.includes('MORNING')) return { type: 'morning', slot: 'M' }
      if (upper.includes('AFTERNOON')) return { type: 'afternoon', slot: 'A' }
      if (upper.includes('DAY') && !upper.includes('NIGHT')) return { type: 'day', slot: 'D' }
      if (upper.includes('NIGHT')) return { type: 'night', slot: 'N' }
      if (upper.includes('OFF')) return { type: 'off', slot: 'O' }
      return { type: null, slot: null }
    }

    // Merge actual shifts into the calendar
    const weeksWithShifts = weeks.map((week) =>
      week.map((day) => {
        const shiftLabel = shiftsByDate.get(day.date)
        if (shiftLabel) {
          const { type, slot } = labelToType(shiftLabel)
          return {
            ...day,
            label: slot,
            type: type,
          }
        }
        return day
      })
    )

    return NextResponse.json({
      month,
      year,
      pattern,
      weeks: weeksWithShifts,
    })
  } catch (err: any) {
    console.error('[api/rota/month] fatal error', err)
    return NextResponse.json(
      { error: 'Unexpected server error', detail: err?.message || String(err) },
      { status: 500 },
    )
  }
}
