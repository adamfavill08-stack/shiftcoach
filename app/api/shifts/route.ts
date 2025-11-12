import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    // This is needed because RLS policies check auth.uid(), which is null without a real session
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
    }

    const {
      date,
      label,
      status,
      start_ts,
      end_ts,
      segments,
      notes,
    } = body

    if (!date) {
      return NextResponse.json(
        { error: 'Missing required field: date' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        {
          error: 'Failed to save shift',
          detail: error.message ?? error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, shift: data }, { status: 200 })
  } catch (err: any) {
    console.error('[api/shifts] fatal error', err)
    return NextResponse.json(
      { error: 'Unexpected server error', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
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
      console.error('[api/shifts] fetch error', error)
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

