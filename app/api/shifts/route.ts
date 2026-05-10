import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { getServerSubscriptionAccess } from '@/lib/subscription/server'
import { getHistoryLimitDays } from '@/lib/subscription/features'

// Cache for 60 seconds - shifts don't change frequently
export const revalidate = 60

const ShiftPostSchema = z.object({
  date: z.string().min(1),
  label: z.string().optional(),
  status: z.string().optional(),
  start_ts: z.string().nullable().optional(),
  end_ts: z.string().nullable().optional(),
  segments: z.unknown().nullable().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Use service role client (bypasses RLS) when in dev fallback mode
    // This is needed because RLS policies check auth.uid(), which is null without a real session
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const parsed = await parseJsonBody(req, ShiftPostSchema)
    if (!parsed.ok) return parsed.response
    const {
      date,
      label,
      status,
      start_ts,
      end_ts,
      segments,
      notes,
    } = parsed.data

    const payload = {
      user_id: userId,
      date: String(date),
      label: label ?? 'OFF',
      status: status ?? 'PLANNED',
      start_ts: start_ts ?? null,
      end_ts: end_ts ?? null,
      segments: segments ?? null,
      notes: notes ? String(notes).slice(0, 2000) : null,
    }

    const { data, error } = await supabase
      .from('shifts')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) {
      console.error('[api/shifts] upsert error', error)
      return apiServerError('shift_upsert_failed', error.message ?? 'Failed to save shift')
    }

    return NextResponse.json({ success: true, shift: data }, { status: 200 })
  } catch (err: any) {
    console.error('[api/shifts] fatal error', err)
    return apiServerError('unexpected_error', err?.message || 'Unexpected server error')
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const access = await getServerSubscriptionAccess(supabase, userId)
    const historyLimitDays = getHistoryLimitDays(access)
    const minMaxAllowedDates = (() => {
      if (historyLimitDays == null) return { min: null as string | null, max: null as string | null }
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      const min = new Date(d)
      const max = new Date(d)
      min.setDate(min.getDate() - (historyLimitDays - 1))
      max.setDate(max.getDate() + (historyLimitDays - 1))
      return { min: min.toISOString().slice(0, 10), max: max.toISOString().slice(0, 10) }
    })()

    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const daysParam = Number.parseInt(searchParams.get('days') || '', 10)
    const futureDaysParam = Number.parseInt(searchParams.get('futureDays') || '0', 10)

    const isValidDateOnly = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(new Date(`${value}T00:00:00`).getTime())

    const normalizeShiftLabel = (value: string | null | undefined) => {
      const v = (value || '').trim().toUpperCase()
      if (['DAY', 'NIGHT', 'EARLY', 'LATE', 'OFF'].includes(v)) return v
      if (v.includes('NIGHT')) return 'NIGHT'
      if (v.includes('DAY')) return 'DAY'
      if (v.includes('EARLY')) return 'EARLY'
      if (v.includes('LATE')) return 'LATE'
      return 'OFF'
    }

    let fromIsoDate: string
    let toIsoDate: string

    if (from || to) {
      if (!from || !to) {
        return NextResponse.json(
          { error: 'Both from and to must be provided together in YYYY-MM-DD format' },
          { status: 400 }
        )
      }
      if (!isValidDateOnly(from) || !isValidDateOnly(to)) {
        return NextResponse.json(
          { error: 'Invalid from/to date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }
      if (from > to) {
        return NextResponse.json(
          { error: 'from must be on or before to' },
          { status: 400 }
        )
      }
      fromIsoDate = from
      toIsoDate = to
    } else {
      const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30
      const futureDaysRaw = Number.isFinite(futureDaysParam) && futureDaysParam >= 0 ? futureDaysParam : 0
      const futureDays = Math.min(futureDaysRaw, 120)
      const now = new Date()
      const fromDate = new Date(now)
      fromDate.setHours(0, 0, 0, 0)
      fromDate.setDate(fromDate.getDate() - (days - 1))
      const toDate = new Date(now)
      toDate.setHours(0, 0, 0, 0)
      toDate.setDate(toDate.getDate() + futureDays)
      fromIsoDate = fromDate.toISOString().slice(0, 10)
      toIsoDate = toDate.toISOString().slice(0, 10)
    }

    if (minMaxAllowedDates.min && fromIsoDate < minMaxAllowedDates.min) {
      fromIsoDate = minMaxAllowedDates.min
      if (toIsoDate < fromIsoDate) {
        return NextResponse.json({ items: [], shifts: [] }, { status: 200 })
      }
    }

    if (minMaxAllowedDates.max && toIsoDate > minMaxAllowedDates.max) {
      toIsoDate = minMaxAllowedDates.max
      if (toIsoDate < fromIsoDate) {
        return NextResponse.json({ items: [], shifts: [] }, { status: 200 })
      }
    }

    const { data, error } = await supabase
      .from('shifts')
      .select('date,label,start_ts,end_ts')
      .eq('user_id', userId)
      .gte('date', fromIsoDate)
      .lte('date', toIsoDate)
      .order('date', { ascending: true })

    if (error) {
      const { logSupabaseError } = await import('@/lib/supabase/error-handler')
      logSupabaseError('api/shifts', error, { level: 'warn' })
      return NextResponse.json({ items: [], shifts: [] }, { status: 200 })
    }

    const items = (data ?? []).map((row: any) => ({
      date: row.date,
      shift_label: normalizeShiftLabel(row.label),
      label: normalizeShiftLabel(row.label),
      start_ts: row.start_ts ?? null,
      end_ts: row.end_ts ?? null,
    }))

    // Keep "shifts" alias for backward compatibility while "items" is canonical.
    return NextResponse.json({ items, shifts: items }, { status: 200 })
  } catch (err: any) {
    console.error('[api/shifts] fatal error', err)
    return NextResponse.json(
      { items: [], shifts: [], error: err?.message ?? 'Unknown error' },
      { status: 200 }
    )
  }
}

