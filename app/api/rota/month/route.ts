import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { buildMonthFromPattern } from '@/lib/data/buildRotaMonth'

export const dynamic = 'force-dynamic'

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

    console.log('[api/rota/month] fetched pattern', {
      userId,
      hasData: !!data,
      patternSlots: data?.pattern_slots?.length ?? 0,
      startDate: data?.start_date,
      isDevFallback,
    })

    let patternSlots: string[] = []
    let currentShiftIndex = 0
    let startDate = new Date(year, month, 1).toISOString().slice(0, 10)
    let colorConfig: Record<string, string | null> = {}
    let pattern: any = null

    if (data && !error) {
      patternSlots = Array.isArray(data.pattern_slots)
        ? data.pattern_slots.map((slot: unknown) => (typeof slot === 'string' ? slot : String(slot)))
        : []
      currentShiftIndex = typeof data.current_shift_index === 'number' ? data.current_shift_index : 0
      startDate = typeof data.start_date === 'string' ? data.start_date : startDate
      colorConfig = (data.color_config as Record<string, string | null>) ?? {}

      pattern = {
        shift_length: data.shift_length,
        pattern_id: data.pattern_id,
        pattern_slots: patternSlots,
        current_shift_index: currentShiftIndex,
        start_date: startDate,
        color_config: colorConfig,
        notes: data.notes ?? null,
      }
    }

    const weeks = buildMonthFromPattern({
      patternSlots,
      currentShiftIndex,
      startDate,
      month: zeroBasedMonth,
      year,
    })

    return NextResponse.json({
      month,
      year,
      pattern,
      weeks,
    })
  } catch (err: any) {
    console.error('[api/rota/month] fatal error', err)
    return NextResponse.json(
      { error: 'Unexpected server error', detail: err?.message || String(err) },
      { status: 500 },
    )
  }
}
