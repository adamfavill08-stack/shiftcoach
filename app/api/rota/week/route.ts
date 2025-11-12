import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  const today = new Date()
  const start = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
  const end = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)

  const startIso = start.toISOString().slice(0, 10)
  const endIso = end.toISOString().slice(0, 10)

  try {
    const { data, error: rotaError } = await supabase
      .from('shifts')
      .select('date,label,start_ts,end_ts')
      .eq('user_id', userId)
      .gte('date', startIso)
      .lte('date', endIso)
      .order('date', { ascending: true })

    if (rotaError) {
      console.error('[/api/rota/week] query error:', rotaError)
      return NextResponse.json({ days: [] }, { status: 200 })
    }

    return NextResponse.json({ days: data ?? [] }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/rota/week] fatal error:', err)
    return NextResponse.json({ days: [] }, { status: 200 })
  }
}


