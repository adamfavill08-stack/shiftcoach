import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

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

    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required query params: from, to' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lt('date', to)
      .order('date', { ascending: true })

    if (error) {
      const { logSupabaseError } = await import('@/lib/supabase/error-handler')
      logSupabaseError('api/shifts', error, { level: 'warn' })
      return NextResponse.json({ shifts: [] }, { status: 200 })
    }

    return NextResponse.json({ shifts: data ?? [] }, { status: 200 })
  } catch (err: any) {
    console.error('[api/shifts] fatal error', err)
    return NextResponse.json(
      { shifts: [], error: err?.message ?? 'Unknown error' },
      { status: 200 }
    )
  }
}

